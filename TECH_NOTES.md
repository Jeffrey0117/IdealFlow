# 技術筆記 & 踩坑紀錄

## 2026-01-12: 備份系統設計缺陷

### 問題描述

用 `npx serve` 開靜態伺服器時，自動備份功能完全失效，但**沒有任何錯誤提示**，導致使用者以為資料有在備份，實際上從來沒存過。

### 根本原因

```
npx serve          → 純靜態檔案伺服器，沒有 API 端點
node server.js     → Express 伺服器，有 /api/backup 端點
```

前端的 `autoBackup()` 函數設計：

```javascript
try {
  await fetch('/api/backup', { ... });
} catch (error) {
  // 靜默忽略錯誤！！！
  console.log('[AutoBackup] Server backup not available');
}
```

**問題：錯誤被靜默吞掉，使用者完全不知道備份失敗。**

### 資料儲存架構

```
┌─────────────────────────────────────────────────────────┐
│                      前端 (index.html)                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   操作資料 ──┬──→ localStorage (即時儲存，總是成功)      │
│              │                                          │
│              └──→ /api/backup (5秒後備份)               │
│                        │                                │
│                        ├── node server.js → 成功        │
│                        └── npx serve → 靜默失敗 !!!     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 為什麼 localStorage 也沒用？

localStorage 是**綁定 origin (host:port)** 的：

- `http://localhost:60235` 的 localStorage
- `http://localhost:3001` 的 localStorage

這兩個是**完全獨立**的！換 port 等於換一個全新的儲存空間。

### 正確的啟動方式

```bash
# 正確 ✓
node server.js

# 錯誤 ✗ (備份功能會失效)
npx serve
python -m http.server
任何其他靜態伺服器
```

### 教訓 & 改進建議

1. **不要靜默吞掉錯誤** - 備份失敗應該要有明顯提示
2. **啟動時檢查 API 可用性** - 如果 `/api/backup` 不通，顯示警告
3. **文件要寫清楚** - README 要明確說明必須用 `node server.js`

### 未來可改進

```javascript
// 建議：備份失敗時顯示 toast 警告
async function autoBackup() {
  try {
    const response = await fetch('/api/backup', { ... });
    if (!response.ok) throw new Error('Backup failed');
  } catch (error) {
    showToast('⚠️ 自動備份失敗，請確認使用 node server.js 啟動', 'warning');
  }
}
```

### 資料救援方式

如果已經發生資料遺失：

1. 檢查是否有手動匯出的 `.json` 檔案
2. 檢查舊 port 的 localStorage（在該 port 的 console 執行）：
   ```javascript
   JSON.stringify({
     projects: JSON.parse(localStorage.getItem('ideaflow_projects') || '[]'),
     posts: JSON.parse(localStorage.getItem('ideaflow_posts') || '[]'),
     categories: JSON.parse(localStorage.getItem('ideaflow_categories') || '[]')
   })
   ```
3. 複製輸出，存成 `.json` 檔案，然後匯入
