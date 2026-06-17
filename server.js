const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const REPO_OWNER = 'wjllovehyf1314';
const REPO_NAME = 'love-house';
const DATA_PATH = 'data.json';

let cachedData = null;

app.use(express.json({ limit: '50mb' }));

// === GitHub persistent storage ===
const GITHUB_API = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${DATA_PATH}`;

async function loadFromGitHub() {
  try {
    const res = await fetch(GITHUB_API, {
      headers: GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {},
    });
    if (!res.ok) return null;
    const json = await res.json();
    const content = Buffer.from(json.content, 'base64').toString('utf8');
    return JSON.parse(content);
  } catch (e) { return null; }
}

async function saveToGitHub(data) {
  if (!GITHUB_TOKEN) return false;
  try {
    // Get current file to get SHA
    const getRes = await fetch(GITHUB_API, {
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}` },
    });
    let sha = '';
    if (getRes.ok) {
      const info = await getRes.json();
      sha = info.sha || '';
    }

    const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
    const body = { message: '💕 数据更新', content };
    if (sha) body.sha = sha;

    const putRes = await fetch(GITHUB_API, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    return putRes.ok;
  } catch (e) { return false; }
}

// === API routes ===
app.get('/api/data', async (req, res) => {
  // Try GitHub first, then cache
  const ghData = await loadFromGitHub();
  if (ghData) { cachedData = ghData; return res.json(ghData); }
  if (cachedData) return res.json(cachedData);
  res.json({});
});

app.post('/api/data', async (req, res) => {
  cachedData = req.body;
  const saved = await saveToGitHub(req.body);
  res.json({ ok: saved });
});

// Serve public folder
app.use(express.static(path.join(__dirname, 'public')));

// Fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).end();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`💕 恋爱小屋启动！ http://localhost:${PORT}`));
