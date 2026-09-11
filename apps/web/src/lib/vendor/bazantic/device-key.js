import crypto from 'node:crypto';

/** Vendored subset of bazantic-cli device-key — sign helpers only (no filesystem). */

export function canonicalJson(value) {
  return JSON.stringify(sortDeep(value));
}

function sortDeep(value) {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = sortDeep(value[key]);
    return out;
  }
  return value;
}

export function signPayload(privateKey, payload, encoding) {
  return crypto
    .sign('sha256', Buffer.from(canonicalJson(payload), 'utf8'), {
      key: privateKey,
      dsaEncoding: encoding === 'raw' ? 'ieee-p1363' : 'der',
    })
    .toString('base64');
}
