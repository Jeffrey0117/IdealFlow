# Idea Flow

一個用來記錄和管理想法的工具。

## 快速開始

```bash
# 安裝依賴
npm install

# 啟動伺服器
node server.js
```

然後開啟瀏覽器訪問：http://localhost:3001

## 架構說明

```
Ideaflow/
├── index.html      # 前端單頁應用（所有 UI 和邏輯）
├── server.js       # Express 伺服器（靜態檔案 + 備份 API）
├── package.json    # 依賴設定
└── backups/        # 自動備份資料夾（自動產生）
```

## 資料儲存機制

### 雙重儲存策略

1. **localStorage** - 瀏覽器本地儲存
   - 即時儲存，每次操作都會更新
   - 作為離線備用

2. **Server Backup** - 伺服器檔案備份
   - 每次資料變更後 5 秒自動備份到 `./backups/`
   - 最多保留 20 個備份檔案
   - 啟動時自動載入最新備份

### 資料載入優先順序

```
啟動應用程式
    │
    ▼
嘗試從伺服器載入 /api/backup/latest
    │
    ├── 成功 → 使用伺服器備份資料
    │          同步到 localStorage
    │
    └── 失敗 → 使用 localStorage 資料
```

## API 端點

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/backup/latest` | 取得最新備份 |
| GET | `/api/backups` | 取得所有備份列表 |
| GET | `/api/backup/:filename` | 取得特定備份 |
| POST | `/api/backup` | 儲存新備份 |

## 備份檔案格式

```json
{
  "version": "1.0",
  "exportedAt": "2024-01-01T00:00:00.000Z",
  "projects": [...],
  "posts": [...],
  "categories": [...]
}
```

## 手動匯入/匯出

除了自動備份，也可以在首頁使用「匯出 JSON」和「匯入 JSON」按鈕手動管理資料。
