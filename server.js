const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(express.json({ limit: '50mb' }));

// Read data
function readData() {
  try {
    if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {}
  return null;
}

// Write data
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// API routes first
app.get('/api/data', (req, res) => res.json(readData() || {}));
app.post('/api/data', (req, res) => { writeData(req.body); res.json({ ok: true }); });

// Serve public folder with index.html as default
app.use(express.static(path.join(__dirname, 'public')));

// Fallback for SPA refresh
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).end();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`💕 恋爱小屋启动！ http://localhost:${PORT}`));
