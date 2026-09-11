import crypto from 'node:crypto';
import { NETWORKS } from './networks.js';
import { canonicalJson, signPayload } from './device-key.js';

/**
 * The one seam B1 plugs into. A PaymentSource produces the payer address and an
 * EIP-3009 TransferWithAuthorization for an x402 "exact" charge. LocalKeySigner
 * signs with a key on this machine; DelegatedSigner (T08) will produce the same
 * struct from the user's hosted Privy wallet. The x402 client, spend ceiling,
 * and receipt handling never change between them.
 *
 * `now` and `randomBytes` are injectable so the authorization is deterministic
 * under test. viem is imported lazily.
 */

export const EIP3009_TYPES = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
  ],
};

export class LocalKeySigner {
  constructor({ privateKey, now = () => Date.now(), randomBytes = crypto.randomBytes }) {
    this._privateKey = privateKey;
    this._now = now;
    this._randomBytes = randomBytes;
    this._account = null;
  }

  async _resolve() {
    if (!this._account) {
      const { privateKeyToAccount } = await import('viem/accounts');
      this._account = privateKeyToAccount(this._privateKey);
    }
    return this._account;
  }

  async address() {
    return (await this._resolve()).address;
  }

  /**
   * Sign an EIP-3009 authorization for the validated requirement. The EIP-712
   * domain comes entirely from the challenge (extra.name/version, the network's
   * chain id, and the asset as verifyingContract) so the payer signs over the
   * exact domain the facilitator checks. validAfter backs off 10 minutes for
   * clock skew; validBefore is bounded by the challenge's maxTimeoutSeconds.
   */
  async authorize(req) {
    const account = await this._resolve();
    const nowSec = Math.floor(this._now() / 1000);
    const validAfter = String(nowSec - 600);
    const validBefore = String(nowSec + req.maxTimeoutSeconds);
    const nonce = '0x' + Buffer.from(this._randomBytes(32)).toString('hex');
    const from = account.address;

    const signature = await account.signTypedData({
      domain: {
        name: req.extra.name,
        version: req.extra.version,
        chainId: NETWORKS[req.network].chainId,
        verifyingContract: req.asset,
      },
      types: EIP3009_TYPES,
      primaryType: 'TransferWithAuthorization',
      message: {
        from,
        to: req.payTo,
        value: BigInt(req.value),
        validAfter: BigInt(validAfter),
        validBefore: BigInt(validBefore),
        nonce,
      },
    });

    return { from, to: req.payTo, value: req.value, validAfter, validBefore, nonce, signature };
  }
}

// Pinned by the relay: one endpoint of one wallet, nothing else (webapp FR-6.2).
// Path mirrors Privy's SDK getWalletApiRpcPath (`/api/v1/...`); the enclave
// verifies the device signature against exactly this path.
const PRIVY_RPC_BASE = 'https://api.privy.io/api/v1/wallets';
const REQUEST_EXPIRY_MS = 60_000;

/**
 * B1: produce the same authorization struct from the user's hosted Privy
 * wallet. Builds the EIP-3009 typed data, wraps it in Privy's wallet-RPC
 * request shape, signs the exact payload with the DEVICE key
 * (privy-authorization-signature), and POSTs it to the Bazantic relay. The
 * relay forwards with app credentials; Privy's TEE verifies the device
 * signature and evaluates the per-signer policy before the wallet signs.
 * The relay can refuse but never forge or alter (design §8.3).
 */
export class DelegatedSigner {
  constructor({ grant, deviceKey, now = () => Date.now(), randomBytes = crypto.randomBytes, fetch: fetchImpl }) {
    this._grant = grant;
    this._deviceKey = deviceKey;
    this._now = now;
    this._randomBytes = randomBytes;
    this._fetch = fetchImpl ?? globalThis.fetch;
  }

  async address() {
    return this._grant.walletAddress;
  }

  async authorize(req) {
    const nowMs = this._now();
    const nowSec = Math.floor(nowMs / 1000);
    const validAfter = String(nowSec - 600);
    const validBefore = String(nowSec + req.maxTimeoutSeconds);
    // Draw order is part of the contract with tests: nonce first, then the key.
    const nonce = '0x' + Buffer.from(this._randomBytes(32)).toString('hex');
    const idempotencyKey = uuidV4From(Buffer.from(this._randomBytes(16)));
    const from = this._grant.walletAddress;

    // Full EIP-712 typed data. Field naming (typed_data / primary_type) follows
    // Privy's REST convention; the relay forwards these bytes untouched, so the
    // enclave sees exactly what the device key signed.
    const typedData = {
      // No EIP712Domain in `types`: Privy's viem adapter sends `types` straight
      // from viem's signTypedData (which omits EIP712Domain), and Privy's policy
      // docs example likewise declares only the message struct. An extra
      // EIP712Domain key can break the engine's primary-type/message parsing.
      types: {
        ...EIP3009_TYPES,
      },
      primary_type: 'TransferWithAuthorization',
      domain: {
        name: req.extra.name,
        version: req.extra.version,
        chainId: NETWORKS[req.network].chainId,
        verifyingContract: req.asset,
      },
      // uint256 fields are hex-encoded, matching Privy's viem adapter, which runs
      // `replaceBigInts(typedData, toHex)` before hitting the wallet RPC (see
      // @privy-io/node/viem.js). Privy's policy engine parses these message
      // values as hex; a decimal string like "100" fails to parse and the
      // condition fails closed (policy_violation) even for value>=0. Hex vs
      // decimal is only the JSON transport encoding — the EIP-712 hash is over
      // the numeric value, so the signature the facilitator checks is unchanged.
      // (nonce is already bytes32 hex; from/to are addresses.)
      message: {
        from,
        to: req.payTo,
        value: toHexUint(req.value),
        validAfter: toHexUint(validAfter),
        validBefore: toHexUint(validBefore),
        nonce,
      },
    };

    const request = {
      version: 1,
      method: 'POST',
      url: `${PRIVY_RPC_BASE}/${this._grant.walletId}/rpc`,
      body: { method: 'eth_signTypedData_v4', params: { typed_data: typedData } },
      headers: {
        'privy-idempotency-key': idempotencyKey,
        'privy-request-expiry': String(nowMs + REQUEST_EXPIRY_MS),
      },
    };
    // Privy verifies the device signature over the payload defined by its
    // direct-implementation docs: the FULL request url (no trailing slash) and
    // EVERY present privy-* header (privy-app-id — the relay injects it when
    // forwarding — plus privy-idempotency-key and privy-request-expiry).
    // Canonicalized RFC-8785 (canonicalJson is byte-equivalent), P-256/SHA-256,
    // DER, base64. Verified end-to-end against the live enclave.
    const appId = this._grant.privyAppId ?? process.env.BAZANTIC_PRIVY_APP_ID;
    const signedPayload = {
      version: 1,
      method: 'POST',
      url: request.url,
      body: request.body,
      headers: {
        'privy-app-id': appId,
        'privy-idempotency-key': idempotencyKey,
        'privy-request-expiry': request.headers['privy-request-expiry'],
      },
    };
    const signature = signPayload(this._deviceKey, signedPayload, 'der');

    let res;
    try {
      res = await this._fetch(this._grant.relayUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: canonicalJson({ grant_id: this._grant.grantId, request, signature }),
      });
    } catch (err) {
      throw relayError('relay_unreachable', err?.message ?? String(err), 'check your network and try again');
    }

    const text = await res.text();
    if (!res.ok) {
      let envelope = {};
      try {
        envelope = JSON.parse(text);
      } catch {
        // non-JSON error body: fall through to the status-only error
      }
      throw relayError(
        envelope.error ?? 'relay_error',
        envelope.reason ?? `relay returned ${res.status}`,
        envelope.hint ?? HINTS[envelope.error],
      );
    }

    let walletSig;
    try {
      walletSig = JSON.parse(text)?.data?.signature;
    } catch {
      walletSig = undefined;
    }
    if (typeof walletSig !== 'string' || walletSig === '') {
      throw relayError('relay_protocol', 'relay response carried no signature');
    }

    return { from, to: req.payTo, value: req.value, validAfter, validBefore, nonce, signature: walletSig };
  }
}

const HINTS = {
  not_authorized: 'run: bazantic gateway authorize',
  grant_revoked: 'this device was revoked — run: bazantic gateway authorize',
  cap_exceeded: 'the grant cap is spent — approve a new grant with a higher cap',
};

function relayError(code, detail, hint) {
  const err = new Error(detail ? `${code}: ${detail}` : code);
  err.code = code;
  err.detail = detail;
  if (hint) err.hint = hint;
  return err;
}

/** RFC-4122 v4 from injected bytes, so tests are deterministic. */
function uuidV4From(bytes) {
  const b = Buffer.from(bytes);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = b.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// Encode a uint256 (decimal string / number / bigint) as a minimal hex string,
// matching viem's toHex — the encoding Privy's viem adapter and its policy
// engine expect for typed-data message fields.
function toHexUint(v) {
  return '0x' + BigInt(v).toString(16);
}
