const { getFileContent, getSessionFromToken } = require('./lib/users');

exports.handler = async function (event) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Methods': 'GET,OPTIONS', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  const authHeader = event.headers['authorization'] || event.headers['Authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: '未授權' }) };

  const token = authHeader.slice(7);
  const store = await getFileContent();
  if (!store) return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: '系統錯誤' }) };

  const session = getSessionFromToken(token, store);
  if (!session) return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: 'session 已過期，請重新登入' }) };

  const user = store.users.find(u => u.id === session.userId);
  if (!user) return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: '找不到使用者' }) };

  return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: { id: user.id, username: user.username, name: user.name, email: user.email, role: user.role } }) };
};
