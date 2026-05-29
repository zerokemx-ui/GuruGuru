const { getSessionFromToken } = require('./lib/users');
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
    const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${USERS_FILE_PATH}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${GH_TOKEN}`, 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28' },
      body: JSON.stringify({ message: 'Update users.json', content: Buffer.from(JSON.stringify(store)).toString('base64'), ...(sha && { sha }) }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Unable to update users.json');
    }
  }
}

function authSession(token, store) {
  return getSessionFromToken(token, store);
}

exports.handler = async function (event) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  const authHeader = event.headers['authorization'] || event.headers['Authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: '未授權' }) };

  const token = authHeader.slice(7);
  const { store, sha } = await getStore();
  if (!store) return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: '系統錯誤' }) };

  const session = authSession(token, store);
  if (!session) return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: 'session 已過期，請重新登入' }) };
  if (session.role !== 'admin') return { statusCode: 403, headers, body: JSON.stringify({ success: false, error: '需要管理者權限' }) };

  if (event.httpMethod === 'GET') {
    const userList = store.users.map(u => ({ id: u.id, username: u.username, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt }));
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: userList }) };
  }

  if (event.httpMethod === 'POST') {
    let body;
    try { body = JSON.parse(event.body || '{}'); }
    catch { return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Invalid JSON' }) }; }

    const username = String(body.username || '').trim();
    const password = String(body.password || '');
    const role = body.role === 'admin' ? 'admin' : 'member';
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: '帳號需為 3-20 個英數字或底線' }) };
    }
    if (password.length < MIN_PASSWORD_LEN) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: '密碼至少需要 ' + MIN_PASSWORD_LEN + ' 個字元' }) };
    }
    if (store.users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
      return { statusCode: 409, headers, body: JSON.stringify({ success: false, error: '帳號已存在' }) };
    }

    const user = {
      id: 'u_' + Date.now(),
      username,
      password: await bcrypt.hash(password, 10),
      name: String(body.name || username).trim(),
      email: String(body.email || '').trim(),
      role,
      createdAt: new Date().toISOString(),
    };
    store.users.push(user);
    await saveStore(store, sha);
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: { id: user.id, username: user.username, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt } }) };
  }

  if (event.httpMethod === 'PATCH') {
    let body;
    try { body = JSON.parse(event.body || '{}'); }
    catch { return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Invalid JSON' }) }; }

    const targetId = String(body.id || '');
    const user = store.users.find(u => u.id === targetId);
    if (!user) return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: '找不到該使用者' }) };

    if (body.name !== undefined) user.name = String(body.name).trim();
    if (body.email !== undefined) user.email = String(body.email).trim();
    if (body.role !== undefined) {
      if (targetId === session.userId && body.role !== user.role) {
        return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: '不能變更自己的角色' }) };
      }
      user.role = body.role === 'admin' ? 'admin' : 'member';
    }
    if (body.password) {
      const password = String(body.password);
      if (password.length < MIN_PASSWORD_LEN) {
        return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: '密碼至少需要 ' + MIN_PASSWORD_LEN + ' 個字元' }) };
      }
      user.password = await bcrypt.hash(password, 10);
    }

    await saveStore(store, sha);
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: { id: user.id, username: user.username, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt } }) };
  }

  if (event.httpMethod === 'DELETE') {
    const url = new URL(event.rawUrl || 'http://localhost', 'http://localhost');
    const targetId = url.searchParams.get('id');
    if (!targetId) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: '缺少使用者 ID' }) };
    if (targetId === session.userId) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: '無法刪除自己的帳號' }) };
    const idx = store.users.findIndex(u => u.id === targetId);
    if (idx === -1) return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: '找不到該使用者' }) };
    store.users.splice(idx, 1);
    Object.keys(store.sessions || {}).forEach(t => { if (store.sessions[t].userId === targetId) delete store.sessions[t]; });
    await saveStore(store, sha);
    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  }

  return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Method not allowed' }) };
};
