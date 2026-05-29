const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const LOCKOUT_WINDOW = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;
const TOKEN_TTL = 24 * 60 * 60 * 1000; // 24 hours
const GH_TOKEN = process.env.GH_TOKEN;
const REPO = 'zerokemx-ui/GuruGuru';
const USERS_FILE_PATH = 'netlify/functions/users.json';

async function getStore() {
  if (GH_TOKEN) {
    const url = `https://api.github.com/repos/${REPO}/contents/${USERS_FILE_PATH}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${GH_TOKEN}`, 'X-GitHub-Api-Version': '2022-11-28' },
    });
    if (res.ok) {
      const data = await res.json();
      return { store: JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8')), sha: data.sha };
    }
  }
  return {
    store: {
      users: [{ id: 'admin', username: 'admin', password: '$2b$10$1XiAlYke3zS7tsT1klwiBOrHkmpvtlVrOz9DaKQ/b/yJVD6hCjihi', name: '管理者', email: 'zerokemx@gmail.com', role: 'admin', createdAt: '2026-05-29T00:00:00Z' }],
      sessions: {}, inviteCodes: [], failedLogins: {}
    }, sha: null
  };
}

async function saveStore(store, sha) {
  if (GH_TOKEN) {
    const content = Buffer.from(JSON.stringify(store)).toString('base64');
    await fetch(`https://api.github.com/repos/${REPO}/contents/${USERS_FILE_PATH}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${GH_TOKEN}`, 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28' },
      body: JSON.stringify({ message: 'Update users.json', content, ...(sha && { sha }) }),
    });
  }
}

function genToken() { return crypto.randomBytes(16).toString('hex'); }

exports.handler = async function (event) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Method not allowed' }) };

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Invalid JSON' }) }; }

  const { username, password } = body;
  if (!username || !password) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: '缺少帳號或密碼' }) };

  const ip = event.headers['x-forwarded-for'] || 'unknown';
  const now = Date.now();
  const { store, sha } = await getStore();

  // Check lockout
  const failed = store.failedLogins || {};
  const userFailed = failed[username.toLowerCase()] || [];
  const recent = userFailed.filter(ts => now - ts < LOCKOUT_WINDOW);
  if (recent.length >= MAX_ATTEMPTS) {
    const waitMin = Math.ceil((LOCKOUT_WINDOW - (now - userFailed[0])) / 60000);
    return { statusCode: 429, headers, body: JSON.stringify({ success: false, error: `登入失敗太多次，請 ${waitMin} 分鐘後再試` }) };
  }

  const user = store.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (!user) return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: '帳號或密碼錯誤' }) };

  let valid = false;
  try { valid = await bcrypt.compare(password, user.password); } catch {}
  if (!valid) {
    failed[username.toLowerCase()] = [...recent, now];
    store.failedLogins = failed;
    await saveStore(store, sha);
    return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: '帳號或密碼錯誤' }) };
  }

  if (store.failedLogins) delete store.failedLogins[username.toLowerCase()];

  const token = genToken();
  store.sessions[token] = { userId: user.id, username: user.username, role: user.role, createdAt: now, expiresAt: now + TOKEN_TTL, ip };
  await saveStore(store, sha);

  return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: { token, user: { id: user.id, username: user.username, name: user.name, email: user.email, role: user.role } } }) };
};
