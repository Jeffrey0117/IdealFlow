/**
 * Idea Flow Server
 * ================
 *
 * 這是 Idea Flow 的主要伺服器，提供以下功能：
 *
 * 1. 靜態檔案服務 - 提供 index.html 和其他前端資源
 * 2. 自動備份系統 - 前端每次資料變更時會自動備份到 ./backups/
 * 3. 備份還原 API - 啟動時前端會自動載入最新備份
 *
 * 啟動方式：
 *   node server.js
 *
 * 然後開啟瀏覽器訪問：
 *   http://localhost:3000
 *
 * 備份檔案位置：
 *   ./backups/backup-YYYY-MM-DDTHH-MM-SS.json
 *
 * API 端點：
 *   POST /api/backup          - 儲存新備份
 *   GET  /api/backups         - 取得所有備份列表
 *   GET  /api/backup/latest   - 取得最新備份（啟動時自動載入用）
 *   GET  /api/backup/:filename - 取得特定備份
 */

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

// ============================================================
// API: 儲存備份
// 前端每次資料變更後會呼叫此 API 自動備份
// ============================================================
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

// ============================================================
// API: 取得備份列表
// ============================================================
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

// ============================================================
// API: 取得最新備份
// 前端啟動時會呼叫此 API，自動載入最新備份資料
// ============================================================
app.get('/api/backup/latest', (req, res) => {
  try {
    const files = fs.readdirSync(BACKUPS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => ({
        name: f,
        time: fs.statSync(path.join(BACKUPS_DIR, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    if (files.length === 0) {
      return res.json({ success: true, data: null, message: 'No backups found' });
    }

    const latestFile = files[0];
    const filepath = path.join(BACKUPS_DIR, latestFile.name);
    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));

    console.log(`[Backup] Loaded latest: ${latestFile.name}`);
    res.json({
      success: true,
      data,
      filename: latestFile.name,
      backupTime: new Date(latestFile.time).toISOString()
    });
  } catch (error) {
    console.error('[Backup] Error loading latest:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// API: 取得特定備份
// ============================================================
app.get('/api/backup/:filename', (req, res) => {
  try {
    // 防止 /api/backup/latest 被這個 route 攔截
    if (req.params.filename === 'latest') {
      return; // 已由上面的 route 處理
    }

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

// ============================================================
// 清理舊備份，只保留指定數量
// ============================================================
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

// ============================================================
// 啟動伺服器
// ============================================================
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   Idea Flow Server                                        ║
║                                                           ║
║   URL:     http://localhost:${PORT}                         ║
║   Backups: ./backups/                                     ║
║                                                           ║
║   功能：                                                  ║
║   - 靜態檔案服務                                          ║
║   - 自動備份（每次資料變更）                              ║
║   - 啟動時自動載入最新備份                                ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});
