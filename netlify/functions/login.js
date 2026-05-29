const bcrypt = require('bcryptjs');
const { getFileContent, saveFileContent, generateToken } = require('./lib/users');

const LOCKOUT_WINDOW = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const TOKEN_TTL = 24 * 60 * 60 * 1000;

exports.handler = async function (event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Method not allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Invalid JSON' }) };
  }

  const { username, password } = body;
  if (!username || !password) {
    return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: '缺少帳號或密碼' }) };
  }

  const ip = event.headers['x-forwarded-for'] || 'unknown';
  const now = Date.now();
  const store = await getFileContent();
  store.sessions = store.sessions || {};
  store.failedLogins = store.failedLogins || {};

  const usernameKey = username.toLowerCase();
  const userFailed = store.failedLogins[usernameKey] || [];
  const recent = userFailed.filter(ts => now - ts < LOCKOUT_WINDOW);
  if (recent.length >= MAX_ATTEMPTS) {
    const waitMin = Math.ceil((LOCKOUT_WINDOW - (now - recent[0])) / 60000);
    return { statusCode: 429, headers, body: JSON.stringify({ success: false, error: `登入失敗太多次，請 ${waitMin} 分鐘後再試` }) };
  }

  const user = (store.users || []).find(u => u.username.toLowerCase() === usernameKey);
  if (!user) {
    return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: '帳號或密碼錯誤' }) };
  }

  let valid = false;
  try {
    valid = await bcrypt.compare(password, user.password);
  } catch {}

  if (!valid) {
    store.failedLogins[usernameKey] = [...recent, now];
    await saveFileContent(store);
    return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: '帳號或密碼錯誤' }) };
  }

  delete store.failedLogins[usernameKey];

  const token = generateToken();
  store.sessions[token] = {
    userId: user.id,
    username: user.username,
    role: user.role,
    createdAt: now,
    expiresAt: now + TOKEN_TTL,
    ip,
  };
  await saveFileContent(store);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    }),
  };
};
