import "server-only";
import { X509Certificate, createPrivateKey, createPublicKey, sign, type KeyObject } from "node:crypto";

/**
 * Minimal DER encoder for one X.509 v3 certificate.
 *
 * SAML metadata publishes the IdP's signing key as an X.509 certificate, and
 * Node cannot create certificates. The subject key is the IdP's P-256 key; the
 * issuer is a demo CA with an Ed25519 key, whose signatures are deterministic,
 * so every serverless instance derives byte-identical certificates (and the same
 * thumbprint) from OIDC_KEY_SEED without shared storage.
 */
function len(n: number): Buffer {
  if (n < 0x80) return Buffer.from([n]);
  const bytes: number[] = [];
  for (let v = n; v > 0; v >>= 8) bytes.unshift(v & 0xff);
  return Buffer.from([0x80 | bytes.length, ...bytes]);
}
const tlv = (tag: number, body: Buffer) => Buffer.concat([Buffer.from([tag]), len(body.length), body]);
const seq = (...items: Buffer[]) => tlv(0x30, Buffer.concat(items));
const set = (...items: Buffer[]) => tlv(0x31, Buffer.concat(items));
const int = (b: Buffer) => tlv(0x02, b[0] & 0x80 ? Buffer.concat([Buffer.from([0]), b]) : b);
const utf8 = (s: string) => tlv(0x0c, Buffer.from(s, "utf8"));
const utc = (d: string) => tlv(0x17, Buffer.from(d, "ascii")); // YYMMDDHHMMSSZ

function oid(dotted: string): Buffer {
  const [a, b, ...rest] = dotted.split(".").map(Number);
  const out = [a * 40 + b];
  for (const n of rest) {
    const chunk: number[] = [];
    let v = n;
    do {
      chunk.unshift(v & 0x7f);
      v >>= 7;
    } while (v > 0);
    for (let i = 0; i < chunk.length - 1; i++) chunk[i] |= 0x80;
    out.push(...chunk);
  }
  return tlv(0x06, Buffer.from(out));
}

const name = (cn: string) => seq(set(seq(oid("2.5.4.3"), utf8(cn))));
const ED25519 = seq(oid("1.3.101.112"));

/** Ed25519 private key from a 32-byte seed (PKCS#8 wrapper, RFC 8410). */
export function ed25519FromSeed(seed: Buffer): KeyObject {
  const prefix = Buffer.from("302e020100300506032b657004220420", "hex");
  return createPrivateKey({ key: Buffer.concat([prefix, seed]), format: "der", type: "pkcs8" });
}

export function buildCertificate(opts: {
  subjectKey: KeyObject;
  subjectCn: string;
  issuerKey: KeyObject; // Ed25519
  issuerCn: string;
  serial: Buffer;
  notBefore: string;
  notAfter: string;
}) {
  const spki = createPublicKey(opts.subjectKey).export({ type: "spki", format: "der" });
  const tbs = seq(
    tlv(0xa0, int(Buffer.from([2]))), // v3
    int(opts.serial),
    ED25519,
    name(opts.issuerCn),
    seq(utc(opts.notBefore), utc(opts.notAfter)),
    name(opts.subjectCn),
    spki,
  );
  const signature = sign(null, tbs, opts.issuerKey);
  const der = seq(tbs, ED25519, tlv(0x03, Buffer.concat([Buffer.from([0]), signature])));
  const b64 = der.toString("base64");
  const pem = `-----BEGIN CERTIFICATE-----\n${b64.match(/.{1,64}/g)!.join("\n")}\n-----END CERTIFICATE-----\n`;
  const parsed = new X509Certificate(der); // throws if the encoding is wrong
  return { der, b64, pem, parsed };
}
