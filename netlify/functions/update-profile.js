const { getFileContent, getSessionFromToken, saveFileContent } = require('./lib/users');

function authSession(token, store) {
  return getSessionFromToken(token, store);
}

exports.handler = async function (event) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  const authHeader = event.headers['authorization'] || event.headers['Authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: '未授權' }) };

  const token = authHeader.slice(7);
  const store = await getFileContent();
  if (!store) return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: '系統錯誤' }) };

  const session = authSession(token, store);
  if (!session) return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: 'session 已過期，請重新登入' }) };

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Invalid JSON' }) }; }

  const { name, email } = body;
  const user = store.users.find(u => u.id === session.userId);
  if (!user) return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: '找不到使用者' }) };

  if (name !== undefined) user.name = String(name).trim();
  if (email !== undefined) user.email = String(email).trim();
  await saveFileContent(store);

  return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: { name: user.name, email: user.email } }) };
};
