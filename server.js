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
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (e) {}
  return null;
}

// Write data
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// GET /api/data - get all data
app.get('/api/data', (req, res) => {
  const data = readData();
  res.json(data || {});
});

// POST /api/data - save all data
app.post('/api/data', (req, res) => {
  writeData(req.body);
  res.json({ ok: true });
});

// Serve static files (CSS, JS, images) but NOT index.html
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// All other routes → serve love.html
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(__dirname, 'public', 'love.html'));
});

app.listen(PORT, () => {
  console.log(`💕 恋爱小屋启动！ http://localhost:${PORT}`);
});
