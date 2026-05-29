const { getFileContent, saveFileContent } = require('./lib/users');

exports.handler = async function (event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,PUT,POST,OPTIONS',
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

  const ghToken = process.env.GH_TOKEN;
  if (!ghToken) {
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: '伺服器設定錯誤' }) };
  }

  const REPO = 'zerokemx-ui/GuruGuru';
  const DATA_PATH = 'data.json';

  if (event.httpMethod === 'GET') {
    const url = `https://api.github.com/repos/${REPO}/contents/${DATA_PATH}`;
    const res = await fetch(url, {
      headers: { Authorization: 'Bearer ' + ghToken, 'X-GitHub-Api-Version': '2022-11-28' },
    });
    if (!res.ok) {
      return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: '找不到資料檔案' }) };
    }
    const json = await res.json();
    const raw = Buffer.from(json.content, 'base64').toString('utf-8');
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: JSON.parse(raw), sha: json.sha }) };
  }

  if (event.httpMethod === 'PUT' || event.httpMethod === 'POST') {
    const body = JSON.parse(event.body || '{}');
    const content = JSON.stringify(body, null, 2);
    const url = `https://api.github.com/repos/${REPO}/contents/${DATA_PATH}`;

    // Get current SHA
    const getRes = await fetch(url, {
      headers: { Authorization: 'Bearer ' + ghToken, 'X-GitHub-Api-Version': '2022-11-28' },
    });
    const currentData = await getRes.json();
    const sha = currentData.sha;

    const putRes = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer ' + ghToken,
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        message: 'Update site content via CMS',
        content: Buffer.from(content).toString('base64'),
        sha,
      }),
    });

    if (!putRes.ok) {
      const err = await putRes.json();
      return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: err.message || '儲存失敗' }) };
    }

    const result = await putRes.json();
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, sha: result.content.sha }) };
  }

  return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Method not allowed' }) };
};
