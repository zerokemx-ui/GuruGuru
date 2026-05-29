const { getFileContent } = require('./lib/users');

exports.handler = async function (event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const authHeader = event.headers['authorization'] || event.headers['Authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: '未授權' }) };
  }

  const token = authHeader.slice(7);
  const store = await getFileContent();
  const now = Date.now();
  const session = store.sessions?.[token];
  if (!session || session.expiresAt < now) {
    return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: 'session 已過期，請重新登入' }) };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Method not allowed' }) };
  }

  const ghToken = process.env.GH_TOKEN;
  if (!ghToken) {
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: '伺服器設定錯誤' }) };
  }

  // Extract image ID from path: /api/upload/:id -> id
  const pathParts = (event.path || '').split('/');
  const id = pathParts[pathParts.length - 1];

  if (!id) {
    return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: '缺少圖片 ID' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Invalid JSON' }) };
  }

  const base64 = body.data;
  if (!base64) {
    return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: '缺少圖片資料' }) };
  }

  const REPO = 'zerokemx-ui/GuruGuru';
  const UPLOAD_PATH = 'uploads/' + id + '.jpg';

  // Check if file exists to get SHA
  const getUrl = `https://api.github.com/repos/${REPO}/contents/${UPLOAD_PATH}`;
  let sha = null;
  try {
    const getRes = await fetch(getUrl, {
      headers: { Authorization: 'Bearer ' + ghToken, 'X-GitHub-Api-Version': '2022-11-28' },
    });
    if (getRes.ok) {
      const existing = await getRes.json();
      sha = existing.sha;
    }
  } catch {}

  const putRes = await fetch(getUrl, {
    method: 'PUT',
    headers: {
      Authorization: 'Bearer ' + ghToken,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({
      message: 'Upload image: ' + id,
      content: base64,
      ...(sha && { sha }),
    }),
  });

  if (!putRes.ok) {
    const err = await putRes.json();
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: err.message || '上傳失敗' }) };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, path: UPLOAD_PATH }),
  };
};
