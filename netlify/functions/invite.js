const crypto = require('crypto');
const GH_TOKEN = process.env.GH_TOKEN;
const REPO = 'zerokemx-ui/GuruGuru';
const USERS_FILE_PATH = 'netlify/functions/users.json';
const INVITE_TTL = 48 * 60 * 60 * 1000; // 48 hours
const SITE_URL = process.env.SITE_URL || 'https://guruguru2.netlify.app';

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
  if (session.role !== 'admin') return { statusCode: 403, headers, body: JSON.stringify({ success: false, error: '需要管理者權限' }) };

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Invalid JSON' }) }; }

  const role = body.role || 'member';
  const code = crypto.randomBytes(16).toString('hex');
  const now = Date.now();
  const invite = { code, role, createdBy: session.userId, createdAt: now, expiresAt: now + INVITE_TTL, used: false };
  store.inviteCodes = store.inviteCodes || [];
  store.inviteCodes.push(invite);
  await saveStore(store, sha);

  const inviteLink = SITE_URL + '/admin.html?invite=' + code;

  return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: { code, link: inviteLink, expiresAt: new Date(invite.expiresAt).toLocaleString('zh-TW'), role } }) };
};
