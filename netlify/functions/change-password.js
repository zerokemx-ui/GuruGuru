const bcrypt = require('bcryptjs');
const GH_TOKEN = process.env.GH_TOKEN;
const REPO = 'zerokemx-ui/GuruGuru';
const USERS_FILE_PATH = 'netlify/functions/users.json';
const MIN_PASSWORD_LEN = 6;

async function getStore() {
  if (GH_TOKEN) {
    const url = `https://api.github.com/repos/${REPO}/contents/${USERS_FILE_PATH}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${GH_TOKEN}`, 'X-GitHub-Api-Version': '2022-11-28' } });
    if (res.ok) { const data = await res.json(); return { store: JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8')), sha: data.sha }; }
  }
  return { store: null, sha: null };
}

async function saveStore(store, sha) {
  if (GH_TOKEN) {
    await fetch(`https://api.github.com/repos/${REPO}/contents/${USERS_FILE_PATH}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${GH_TOKEN}`, 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28' },
      body: JSON.stringify({ message: 'Update users.json', content: Buffer.from(JSON.stringify(store)).toString('base64'), ...(sha && { sha }) }),
    });
  }
}

function authSession(token, store) {
  const now = Date.now();
  const session = store.sessions && store.sessions[token];
  if (!session || session.expiresAt < now) return null;
  return session;
}

exports.handler = async function (event) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  const authHeader = event.headers['authorization'] || event.headers['Authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: '未授權' }) };

  const token = authHeader.slice(7);
  const { store, sha } = await getStore();
  if (!store) return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: '系統錯誤' }) };

  const session = authSession(token, store);
  if (!session) return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: 'session 已過期，請重新登入' }) };

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Invalid JSON' }) }; }

  const { currentPassword, newPassword } = body;
  if (!currentPassword || !newPassword) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: '缺少必要欄位' }) };
  if (newPassword.length < MIN_PASSWORD_LEN) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: '密碼至少需要 ' + MIN_PASSWORD_LEN + ' 個字元' }) };

  const user = store.users.find(u => u.id === session.userId);
  if (!user) return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: '找不到使用者' }) };

  let valid = false;
  try { valid = await bcrypt.compare(currentPassword, user.password); } catch {}
  if (!valid) return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: '目前密碼錯誤' }) };

  user.password = await bcrypt.hash(newPassword, 10);
  await saveStore(store, sha);

  return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
};

