const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const USERS_FILE = path.join(__dirname, '..', 'users.json');
const GH_TOKEN = process.env.GH_TOKEN;
const REPO_OWNER = 'zerokemx-ui';
const REPO_NAME = 'GuruGuru';
const USERS_FILE_PATH = 'users.json';

async function getFileContent() {
  if (GH_TOKEN) {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${USERS_FILE_PATH}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${GH_TOKEN}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (res.ok) {
      const data = await res.json();
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      return JSON.parse(content);
    }
  }
  if (fs.existsSync(USERS_FILE)) {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
  }
  return { users: [], sessions: {} };
}

async function saveFileContent(data) {
  const content = JSON.stringify(data, null, 2);
  if (GH_TOKEN) {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${USERS_FILE_PATH}`;
    const getRes = await fetch(url, {
      headers: {
        Authorization: `Bearer ${GH_TOKEN}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    const getData = await getRes.json();
    const sha = getData.sha;

    await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${GH_TOKEN}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Update users.json',
        content: Buffer.from(content).toString('base64'),
        sha,
      }),
    });
    return;
  }
  fs.writeFileSync(USERS_FILE, content, 'utf-8');
}

function generateToken() {
  return crypto.randomBytes(16).toString('hex');
}

module.exports = {
  getFileContent,
  saveFileContent,
  generateToken,
  USERS_FILE,
};
