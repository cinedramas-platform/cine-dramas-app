import { SignJWT, importPKCS8 } from 'jose';

export type MuxTokenAudience = 'v' | 't' | 'g' | 's';

export async function signMuxJwt(
  playbackId: string,
  audience: MuxTokenAudience,
  signingKeyId: string,
  signingPrivateKeyBase64: string,
  expiresAt: Date,
): Promise<string> {
  const pem = pkcs1ToPkcs8Pem(signingPrivateKeyBase64);
  const privateKey = await importPKCS8(pem, 'RS256');

  return new SignJWT({
    sub: playbackId,
    aud: audience,
    kid: signingKeyId,
  })
    .setProtectedHeader({ alg: 'RS256', kid: signingKeyId })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(privateKey);
}

// Mux provides PKCS#1 (RSA PRIVATE KEY) but jose requires PKCS#8 (PRIVATE KEY).
// This wraps PKCS#1 DER in the PKCS#8 PrivateKeyInfo ASN.1 envelope.
function pkcs1ToPkcs8Pem(pkcs1Base64: string): string {
  const cleaned = pkcs1Base64.replace(/\s+/g, '');
  const pkcs1Der = Uint8Array.from(atob(cleaned), (c) => c.charCodeAt(0));

  const version = new Uint8Array([0x02, 0x01, 0x00]);
  const rsaAlgId = new Uint8Array([
    0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01,
    0x01, 0x05, 0x00,
  ]);
  const octetString = derWrap(0x04, pkcs1Der);
  const pkcs8Der = derWrap(0x30, concat(version, rsaAlgId, octetString));

  let b64 = '';
  for (let i = 0; i < pkcs8Der.length; i++) {
    b64 += String.fromCharCode(pkcs8Der[i]);
  }
  b64 = btoa(b64);

  const lines = b64.match(/.{1,64}/g) ?? [b64];
  return `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----`;
}

function derWrap(tag: number, content: Uint8Array): Uint8Array {
  const len = content.length;
  let header: Uint8Array;
  if (len < 0x80) {
    header = new Uint8Array([tag, len]);
  } else if (len < 0x100) {
    header = new Uint8Array([tag, 0x81, len]);
  } else {
    header = new Uint8Array([tag, 0x82, (len >> 8) & 0xff, len & 0xff]);
  }
  return concat(header, content);
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    result.set(a, offset);
    offset += a.length;
  }
  return result;
}
