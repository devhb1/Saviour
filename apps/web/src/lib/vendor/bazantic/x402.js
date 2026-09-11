import { NETWORKS, USDC_DECIMALS, resolveNetworkKey } from './networks.js';

/**
 * Pure x402 codec (v1 + v2) — parse a 402 challenge, validate the payment
 * requirement (refusing anything that isn't an "exact" USDC charge on a known
 * network), convert USD ceilings to base units, and encode the payment header.
 * No I/O, no signing.
 *
 * v1 vs v2 (per the x402 spec, x402-foundation/x402):
 *  - v1: accepts[].network is a name ("base-sepolia"), amount is `maxAmountRequired`,
 *        payment goes in the `X-PAYMENT` header as `{x402Version,scheme,network,payload}`.
 *  - v2: accepts[].network is CAIP-2 ("eip155:8453"), amount is `amount`, there may
 *        be several accepts (one per chain), and the payment goes in the
 *        `Payment-Signature` header as `{x402Version,resource?,accepted,payload}` —
 *        where `accepted` is the chosen requirement echoed verbatim.
 * The inner EIP-3009 `authorization` (from/to/value/validAfter/validBefore/nonce)
 * and its signature are identical across versions.
 */

export class UnsupportedChallengeError extends Error {
  constructor(message, reason) {
    super(message);
    this.name = 'UnsupportedChallengeError';
    this.reason = reason;
  }
}

// Normalize a challenge `accepts[]` entry (v1 or v2) into one internal shape.
// `maxAmountRequired` holds the base-unit amount for both versions (v2 renamed
// it `amount`). `network` is the resolved NETWORKS key (for the signer); the raw
// challenge value is kept for validation error messages, and `accepted` holds
// the verbatim v2 entry to echo in the payment.
function normalize(version, entry, { amount, resource }) {
  return {
    version,
    scheme: entry.scheme,
    network: resolveNetworkKey(entry.network) ?? entry.network,
    networkField: entry.network,
    asset: entry.asset,
    maxAmountRequired: amount,
    payTo: entry.payTo,
    maxTimeoutSeconds: entry.maxTimeoutSeconds,
    extra: entry.extra,
    resource,
    accepted: version === 2 ? entry : undefined,
  };
}

/**
 * Parse a 402 challenge into a normalized requirement. Handles x402 v1 and v2.
 * For v2 (which may list several `accepts`, one per chain) the entry matching
 * `expectedNetwork` is selected. `forceVersion` (1|2) pins the accepted version.
 */
export function parseChallenge(bodyText, { expectedNetwork, forceVersion } = {}) {
  let body;
  try {
    body = JSON.parse(bodyText);
  } catch {
    throw new UnsupportedChallengeError('402 body is not JSON', 'not_json');
  }
  const version = body.x402Version;
  if (version !== 1 && version !== 2) {
    throw new UnsupportedChallengeError(`unsupported x402 version: ${version}`, 'version');
  }
  if (forceVersion && version !== forceVersion) {
    throw new UnsupportedChallengeError(
      `challenge is x402 v${version}, but --x402-version ${forceVersion} was required`,
      'version_override',
    );
  }
  if (!Array.isArray(body.accepts) || body.accepts.length === 0) {
    throw new UnsupportedChallengeError('402 challenge has no accepts[]', 'no_accepts');
  }
  if (version === 1) {
    const it = body.accepts[0];
    return normalize(1, it, { amount: it.maxAmountRequired });
  }
  // v2: pick the accepts entry for the network we can pay on.
  const exact = body.accepts.filter((a) => a && a.scheme === 'exact');
  const pool = exact.length ? exact : body.accepts;
  let chosen;
  if (expectedNetwork) {
    chosen = pool.find((a) => resolveNetworkKey(a.network) === expectedNetwork);
    if (!chosen) {
      const offered = pool.map((a) => a.network).join(', ');
      throw new UnsupportedChallengeError(
        `no accepts[] entry for ${expectedNetwork} (offered: ${offered})`,
        'network',
      );
    }
  } else {
    chosen = pool.find((a) => resolveNetworkKey(a.network)) ?? pool[0];
  }
  return normalize(2, chosen, { amount: chosen.amount, resource: body.resource });
}

/**
 * Refuse to sign anything but an "exact" USDC transfer on the expected network.
 * The asset check is the key guard: a hostile 402 must not get a signature over
 * an arbitrary token contract.
 */
export function validateRequirement(req, expectedNetwork) {
  if (req.scheme !== 'exact') {
    throw new UnsupportedChallengeError(`unsupported scheme: ${req.scheme}`, 'scheme');
  }
  if (!NETWORKS[req.network]) {
    throw new UnsupportedChallengeError(`unsupported network: ${req.network}`, 'network');
  }
  if (expectedNetwork && req.network !== expectedNetwork) {
    throw new UnsupportedChallengeError(
      `network mismatch: challenge is ${req.network}, expected ${expectedNetwork}`,
      'network',
    );
  }
  const expectedAsset = NETWORKS[req.network].usdc;
  if (!req.asset || req.asset.toLowerCase() !== expectedAsset.toLowerCase()) {
    throw new UnsupportedChallengeError(`asset is not the network USDC: ${req.asset}`, 'asset');
  }
  if (!req.payTo) {
    throw new UnsupportedChallengeError('challenge missing payTo', 'payTo');
  }
  if (!req.maxAmountRequired || !/^\d+$/.test(req.maxAmountRequired)) {
    throw new UnsupportedChallengeError(
      `invalid maxAmountRequired: ${req.maxAmountRequired}`,
      'amount',
    );
  }
  if (!req.extra || !req.extra.name || !req.extra.version) {
    throw new UnsupportedChallengeError('challenge missing EIP-712 domain (extra.name/version)', 'extra');
  }
  return req;
}

/** Decimal USD string → USDC base-unit string. String math; no float rounding. */
export function usdToBaseUnits(usd) {
  if (typeof usd !== 'string' || !/^\d+(\.\d+)?$/.test(usd)) {
    throw new Error(`invalid USD amount: ${usd}`);
  }
  const [whole, frac = ''] = usd.split('.');
  if (frac.length > USDC_DECIMALS) {
    throw new Error(`USD amount ${usd} is finer than ${USDC_DECIMALS} decimals`);
  }
  const scaled =
    BigInt(whole) * 10n ** BigInt(USDC_DECIMALS) + BigInt(frac.padEnd(USDC_DECIMALS, '0') || '0');
  return scaled.toString();
}

/** True when the challenge's base-unit amount exceeds the USD ceiling. */
export function exceedsCeiling(maxAmountRequired, maxAmountUsd) {
  return BigInt(maxAmountRequired) > BigInt(usdToBaseUnits(maxAmountUsd));
}

/**
 * base64 of the payment envelope, versioned. authorization fields are decimal
 * strings (value/validAfter/validBefore) + 0x hex nonce, identical across
 * versions. v2 echoes the chosen requirement verbatim under `accepted` and
 * carries the optional top-level `resource`.
 */
export function buildXPayment(requirement, authorization, signature) {
  const envelope =
    requirement.version === 2
      ? {
          x402Version: 2,
          ...(requirement.resource ? { resource: requirement.resource } : {}),
          accepted: requirement.accepted,
          payload: { signature, authorization },
        }
      : {
          x402Version: 1,
          scheme: requirement.scheme,
          network: requirement.network,
          payload: { signature, authorization },
        };
  return Buffer.from(JSON.stringify(envelope), 'utf8').toString('base64');
}

/** Request header carrying the payment, by version (spec: transports-v2/http.md). */
export function paymentHeaderName(version) {
  return version === 2 ? 'Payment-Signature' : 'X-PAYMENT';
}

/** Response header carrying the settlement receipt, by version. */
export function receiptHeaderName(version) {
  return version === 2 ? 'payment-response' : 'x-payment-response';
}
