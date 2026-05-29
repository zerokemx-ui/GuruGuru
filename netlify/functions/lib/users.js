const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const USERS_FILE = path.join(__dirname, '..', 'users.json');
const GH_TOKEN = process.env.GH_TOKEN;
const REPO_OWNER = 'zerokemx-ui';
const REPO_NAME = 'GuruGuru';
const USERS_FILE_PATH = 'netlify/functions/users.json';
const DEFAULT_STORE = {
  users: [
    {
      id: 'admin',
      username: 'admin',
      password: '$2b$10$Tt51Fcb7WoSE2L0FZ7lSb.pOePI1C6lmXlLB9G/USulYV0qKV9HNm',
      name: '管理者',
      email: 'zerokemx@gmail.com',
      role: 'admin',
      createdAt: '2026-05-29T00:00:00Z',
    },
  ],
  sessions: {},
  inviteCodes: [],
  failedLogins: {},
};

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
  return JSON.parse(JSON.stringify(DEFAULT_STORE));
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

    const putRes = await fetch(url, {
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
    if (!putRes.ok) {
      const err = await putRes.json().catch(() => ({}));
      throw new Error(err.message || 'Unable to update users.json');
    }
    return;
  }
  fs.writeFileSync(USERS_FILE, content, 'utf-8');
}

function generateToken() {
  return crypto.randomBytes(16).toString('hex');
}

function base64UrlEncode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function base64UrlDecode(value) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf-8'));
}

function authSecret() {
  return process.env.AUTH_SECRET || GH_TOKEN || 'guruguru-local-dev-secret';
}

function signTokenPayload(payload) {
  return crypto.createHmac('sha256', authSecret()).update(payload).digest('base64url');
}

function createSessionToken(user, ip, ttlMs = 24 * 60 * 60 * 1000) {
  const now = Date.now();
  const payload = base64UrlEncode({
    userId: user.id,
    username: user.username,
    role: user.role,
    createdAt: now,
    expiresAt: now + ttlMs,
    ip,
    nonce: generateToken(),
  });
  return payload + '.' + signTokenPayload(payload);
}

function getSessionFromToken(token, store) {
  if (!token) return null;

  if (token.includes('.')) {
    const [payload, signature] = token.split('.');
    if (!payload || !signature || signTokenPayload(payload) !== signature) return null;
    const session = base64UrlDecode(payload);
    if (!session.expiresAt || session.expiresAt < Date.now()) return null;
    const user = (store.users || []).find(u => u.id === session.userId);
    if (!user) return null;
    return { ...session, role: user.role };
  }

  const session = store.sessions && store.sessions[token];
  if (!session || session.expiresAt < Date.now()) return null;
  return session;
}

module.exports = {
  createSessionToken,
  getFileContent,
  getSessionFromToken,
  saveFileContent,
  generateToken,
  USERS_FILE,
};
