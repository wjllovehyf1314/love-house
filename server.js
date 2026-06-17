const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const REPO_OWNER = 'wjllovehyf1314';
const REPO_NAME = 'love-house';
const DATA_PATH = 'data.json';
const LOCAL_BACKUP = path.join(__dirname, 'data_backup.json');

let cachedData = null;

app.use(express.json({ limit: '50mb' }));
app.use((req, res, next) => { res.setTimeout(30000, () => { res.status(408).json({ error: 'Timeout' }); }); next(); });

// === GitHub persistent storage ===
const GITHUB_API = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${DATA_PATH}`;

async function loadFromGitHub() {
  try {
    const res = await fetch(GITHUB_API, {
      headers: {
        Authorization: GITHUB_TOKEN ? `Bearer ${GITHUB_TOKEN}` : '',
        'User-Agent': 'love-house',
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const content = Buffer.from(json.content, 'base64').toString('utf8');
    const data = JSON.parse(content);
    // Backup locally
    fs.writeFileSync(LOCAL_BACKUP, JSON.stringify(data), 'utf8');
    return data;
  } catch (e) { console.error('GitHub load error:', e.message); return null; }
}

async function saveToGitHub(data) {
  if (!GITHUB_TOKEN) {
    // Without token, save to local backup only
    fs.writeFileSync(LOCAL_BACKUP, JSON.stringify(data), 'utf8');
    return true;
  }
  try {
    // Get current SHA
    const getRes = await fetch(GITHUB_API, {
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, 'User-Agent': 'love-house' },
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
        'User-Agent': 'love-house',
      },
      body: JSON.stringify(body),
    });
    if (putRes.ok) {
      fs.writeFileSync(LOCAL_BACKUP, JSON.stringify(data), 'utf8');
    }
    return putRes.ok;
  } catch (e) { console.error('GitHub save error:', e.message); return false; }
}

// Load local backup on startup
function loadLocalBackup() {
  try {
    if (fs.existsSync(LOCAL_BACKUP)) {
      return JSON.parse(fs.readFileSync(LOCAL_BACKUP, 'utf8'));
    }
  } catch (e) {}
  return null;
}

// === API routes ===
app.get('/api/data', async (req, res) => {
  // 1. Try GitHub
  const ghData = await loadFromGitHub();
  if (ghData && Object.keys(ghData).length > 0) {
    cachedData = ghData;
    return res.json(ghData);
  }
  // 2. Try cache
  if (cachedData && Object.keys(cachedData).length > 0) {
    return res.json(cachedData);
  }
  // 3. Try local backup
  const backup = loadLocalBackup();
  if (backup && Object.keys(backup).length > 0) {
    cachedData = backup;
    return res.json(backup);
  }
  // 4. Nothing
  res.json(null);
});

app.post('/api/data', async (req, res) => {
  const data = req.body;
  // Safety: only save if data has actual content (not empty)
  if (!data || Object.keys(data).length === 0) {
    return res.json({ ok: false, error: 'Refusing to save empty data' });
  }
  cachedData = data;
  const saved = await saveToGitHub(data);
  res.json({ ok: saved });
});

// Serve public folder
app.use(express.static(path.join(__dirname, 'public')));

// Fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).end();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Startup: load from GitHub
(async () => {
  console.log('⏳ Loading data from GitHub...');
  const ghData = await loadFromGitHub();
  if (ghData && Object.keys(ghData).length > 0) {
    cachedData = ghData;
    console.log('✅ GitHub data loaded (' + JSON.stringify(ghData).length + ' bytes)');
  } else {
    const backup = loadLocalBackup();
    if (backup) {
      cachedData = backup;
      console.log('⚠️ Using local backup (' + JSON.stringify(backup).length + ' bytes)');
    } else {
      console.log('⚠️ No data found, starting fresh');
    }
  }
  app.listen(PORT, () => console.log(`💕 恋爱小屋启动！ http://localhost:${PORT}`));
})();
