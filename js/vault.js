// 家庭密码：与 Latein lernen 相同的做法。
// 课程内容只以加密文件 content.enc.json 发布（PBKDF2-SHA256 → AES-256-GCM）。
// 每台设备输入一次密码，派生出的密钥保存在本机，以后自动解锁。

const BUNDLE_URL = 'content.enc.json';
const KEY_STORE = 'familienlernen.key';
let files = null; // 解密后的 { 'deutsch/course.json': {...}, ... }

const b64d = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const b64e = (b) => btoa(String.fromCharCode(...b));

async function fetchBundle() {
  const r = await fetch(BUNDLE_URL, { cache: 'no-cache' });
  if (r.status === 404) return { missing: true };
  if (!r.ok) throw new Error('offline');
  const enc = await r.json();
  if (enc.format !== 'familie-enc-1') throw new Error('format');
  return enc;
}

async function deriveRawKey(password, saltB64, iter) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password.normalize('NFC')), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: b64d(saltB64), iterations: iter }, base, 256);
  return new Uint8Array(bits);
}

async function decrypt(enc, raw) {
  const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64d(enc.iv) }, key, b64d(enc.ct));
  return JSON.parse(new TextDecoder().decode(plain)).files;
}

function storedKey() {
  try { return JSON.parse(localStorage.getItem(KEY_STORE)); } catch { return null; }
}

let bundle = null;

/** 'ready' | 'locked' | 'missing' | 'offline' */
export async function init() {
  try { bundle = await fetchBundle(); } catch (e) { return e.message === 'offline' || e instanceof TypeError ? 'offline' : 'missing'; }
  if (bundle.missing) return 'missing';
  const k = storedKey();
  if (k && k.salt === bundle.salt && k.iter === bundle.iter) {
    try { files = await decrypt(bundle, b64d(k.raw)); return 'ready'; } catch { /* 密码已更换 */ }
  }
  return 'locked';
}

/** 'ok' | 'wrong' */
export async function unlock(password) {
  const raw = await deriveRawKey(password, bundle.salt, bundle.iter);
  try { files = await decrypt(bundle, raw); } catch { return 'wrong'; }
  try { localStorage.setItem(KEY_STORE, JSON.stringify({ raw: b64e(raw), salt: bundle.salt, iter: bundle.iter })); } catch { /* 隐私模式 */ }
  return 'ok';
}

/** 在本设备上忘记密码（下次打开需要重新输入） */
export function lock() {
  localStorage.removeItem(KEY_STORE);
  files = null;
}

export function file(path) {
  if (!files) throw new Error('locked');
  if (!(path in files)) throw new Error('not found: ' + path);
  return structuredClone(files[path]);
}
export const hasFile = (path) => !!files && path in files;
