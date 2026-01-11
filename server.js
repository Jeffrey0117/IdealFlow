const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;
const BACKUPS_DIR = path.join(__dirname, 'backups');

// 確保 backups 資料夾存在
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

// 中間件
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

// 自動備份 API
app.post('/api/backup', (req, res) => {
  try {
    const data = req.body;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.json`;
    const filepath = path.join(BACKUPS_DIR, filename);

    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');

    // 清理舊備份，只保留最新的 20 個
    cleanOldBackups(20);

    console.log(`[Backup] Saved: ${filename}`);
    res.json({ success: true, filename });
  } catch (error) {
    console.error('[Backup] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 取得備份列表 API
app.get('/api/backups', (req, res) => {
  try {
    const files = fs.readdirSync(BACKUPS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const stat = fs.statSync(path.join(BACKUPS_DIR, f));
        return {
          filename: f,
          size: stat.size,
          created: stat.mtime
        };
      })
      .sort((a, b) => new Date(b.created) - new Date(a.created));

    res.json({ success: true, backups: files });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 讀取特定備份 API
app.get('/api/backup/:filename', (req, res) => {
  try {
    const filepath = path.join(BACKUPS_DIR, req.params.filename);
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ success: false, error: 'Backup not found' });
    }
    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 清理舊備份
function cleanOldBackups(keepCount) {
  const files = fs.readdirSync(BACKUPS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => ({
      name: f,
      time: fs.statSync(path.join(BACKUPS_DIR, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);

  if (files.length > keepCount) {
    files.slice(keepCount).forEach(f => {
      fs.unlinkSync(path.join(BACKUPS_DIR, f.name));
      console.log(`[Backup] Deleted old: ${f.name}`);
    });
  }
}

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║   Idea Flow Server Running                    ║
║   http://localhost:${PORT}                      ║
║   Backups: ./backups/                         ║
╚═══════════════════════════════════════════════╝
  `);
});
