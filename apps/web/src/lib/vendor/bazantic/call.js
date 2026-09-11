import {
  parseChallenge,
  validateRequirement,
  exceedsCeiling,
  buildXPayment,
  paymentHeaderName,
  receiptHeaderName,
  UnsupportedChallengeError,
} from './x402.js';
import { USDC_DECIMALS, explorerTxUrl } from './networks.js';

/**
 * The XAPP client loop, independent of CLI plumbing and fully injectable:
 * request → 402 → validate → ceiling → confirm → sign → retry → receipt.
 * A provider (non-402) response passes straight through, unpaid.
 */

export class GatewayCallError extends Error {
  constructor(code, detail) {
    super(detail ? `${code}: ${detail}` : code);
    this.name = 'GatewayCallError';
    this.code = code;
    this.detail = detail;
  }
}

/** USDC base-unit string → trimmed decimal USD string ("100" → "0.0001"). */
export function baseUnitsToUsd(base) {
  const s = String(base).padStart(USDC_DECIMALS + 1, '0');
  const whole = s.slice(0, -USDC_DECIMALS);
  const frac = s.slice(-USDC_DECIMALS).replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : whole;
}

async function doFetch(fetchImpl, url, init) {
  try {
    return await fetchImpl(url, init);
  } catch (err) {
    throw new GatewayCallError('network_error', err?.message ?? String(err));
  }
}

function result(res, bodyText, paid) {
  return { ok: res.ok, status: res.status, headers: res.headers, bodyText, paid };
}

export async function gatewayCall(
  { url, method = 'GET', headers = {}, body, network, maxAmountUsd, source, confirm, x402Version },
  deps = {},
) {
  const fetchImpl = deps.fetch ?? globalThis.fetch;
  const sleep = deps.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  // Total attempts for the post-payment request (1 initial + retries). Bounded:
  // an already-settled nonce is non-idempotent at the gateway (returns 502), so
  // retries can't recover a settled-but-lost response — they only recover a
  // request that failed BEFORE settling. Keep it small.
  const settleAttempts = deps.settleAttempts ?? 3;
  const init = { method, headers: { ...headers }, body };

  const first = await doFetch(fetchImpl, url, init);
  if (first.status !== 402) {
    return result(first, await first.text(), null);
  }

  let requirement;
  try {
    requirement = validateRequirement(
      parseChallenge(await first.text(), { expectedNetwork: network, forceVersion: x402Version }),
      network,
    );
  } catch (err) {
    if (err instanceof UnsupportedChallengeError) {
      throw new GatewayCallError('unsupported_challenge', err.message);
    }
    throw err;
  }

  const amountUsd = baseUnitsToUsd(requirement.maxAmountRequired);
  if (exceedsCeiling(requirement.maxAmountRequired, maxAmountUsd)) {
    throw new GatewayCallError(
      'amount_exceeds_ceiling',
      `challenge asks ${amountUsd} USDC, ceiling ${maxAmountUsd}`,
    );
  }

  if (confirm && !(await confirm(amountUsd, requirement.payTo))) {
    throw new GatewayCallError('payment_declined', 'payment not confirmed');
  }

  const { signature, ...authorization } = await source.authorize({
    scheme: requirement.scheme,
    network: requirement.network,
    asset: requirement.asset,
    payTo: requirement.payTo,
    value: requirement.maxAmountRequired,
    maxTimeoutSeconds: requirement.maxTimeoutSeconds,
    extra: requirement.extra,
  });
  const xPayment = buildXPayment(requirement, authorization, signature);

  // Present the signed payment to the gateway, retrying ONLY the request — never
  // re-signing. Reusing the same X-PAYMENT cannot overspend: the EIP-3009 nonce
  // is single-use, so the transfer settles at most once on-chain regardless of
  // how many times it's submitted (verified: resubmitting a settled payment is
  // rejected, not re-charged). So a transient transport failure (network error,
  // 429, or 5xx) that happened BEFORE settlement is safely recoverable by
  // resending the identical payment. A 402 is a definitive rejection (not
  // transient) and is terminal. Retries are bounded because an already-settled
  // nonce is not idempotent at the gateway — retrying a settled-but-lost response
  // just fails again; that case is closed by settlement reconciliation, not here.
  const retry = { ...init, headers: { ...init.headers, [paymentHeaderName(requirement.version)]: xPayment } };
  const retryableStatus = (s) => s === 429 || s >= 500;
  let second;
  for (let attempt = 1; ; attempt++) {
    try {
      second = await doFetch(fetchImpl, url, retry);
    } catch (err) {
      // network_error from doFetch — retry the same payment, then give up.
      if (attempt < settleAttempts) {
        await sleep(250 * 2 ** (attempt - 1));
        continue;
      }
      throw err;
    }
    if (second.status === 402) {
      throw new GatewayCallError('payment_rejected', (await second.text()).slice(0, 300));
    }
    if (retryableStatus(second.status) && attempt < settleAttempts) {
      await sleep(250 * 2 ** (attempt - 1));
      continue;
    }
    break;
  }

  const receipt = second.headers.get(receiptHeaderName(requirement.version)) ?? null;
  const settled = decodeReceipt(receipt);
  return result(second, await second.text(), {
    amountBaseUnits: requirement.maxAmountRequired,
    amountUsd,
    payer: authorization.from,
    receipt,
    // Decoded settlement details so callers don't have to base64-decode the
    // receipt to get the on-chain tx. network is CAIP-2 (v2) or a name (v1).
    transaction: settled?.transaction ?? null,
    network: settled?.network ?? requirement.networkField ?? requirement.network ?? null,
    explorerUrl: explorerTxUrl(settled?.network ?? requirement.network, settled?.transaction),
  });
}

/** base64 settlement receipt → { success, transaction, network, payer } | null. */
function decodeReceipt(receipt) {
  if (!receipt) return null;
  try {
    return JSON.parse(Buffer.from(receipt, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}
