/**
 * Encrypt / decrypt user passwords so the admin can view them.
 * Stored as AES-256-GCM (not plaintext). Key is derived from JWT_SECRET
 * so it stays stable across restarts on the same deployment.
 */
const crypto = require('crypto');

function key() {
  const secret = process.env.JWT_SECRET || 'local-dev-clearance-secret';
  return crypto.createHash('sha256').update(secret).digest(); // 32 bytes
}

function encryptPassword(plain) {
  if (plain == null) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const ct = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64url')}:${tag.toString('base64url')}:${ct.toString('base64url')}`;
}

function decryptPassword(enc) {
  if (!enc) return null;
  try {
    const [v, ivB64, tagB64, ctB64] = String(enc).split(':');
    if (v !== 'v1') return null;
    const iv = Buffer.from(ivB64, 'base64url');
    const tag = Buffer.from(tagB64, 'base64url');
    const ct = Buffer.from(ctB64, 'base64url');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
  } catch (_) {
    return null;
  }
}

module.exports = { encryptPassword, decryptPassword };