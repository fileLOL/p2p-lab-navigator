/**
 * Xifrat AES-256-GCM de les claus API dels usuaris. SOLO servidor.
 * La clau de xifrat viu en el secret EXCHANGE_KEYS_ENCRYPTION_KEY.
 */
import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";

function encryptionKey(): Buffer {
  const raw = process.env["EXCHANGE_KEYS_ENCRYPTION_KEY"];
  if (!raw) throw new Error("EXCHANGE_KEYS_ENCRYPTION_KEY is not set");
  // Deriva 32 bytes estables del secret generat (64 caràcters alfanumèrics).
  return createHash("sha256").update(raw, "utf8").digest();
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64");
}

export function decryptSecret(stored: string): string {
  const buf = Buffer.from(stored, "base64");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8");
}
