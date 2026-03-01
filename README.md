# Discord Purge Bot

一鍵刪除 Discord 頻道內所有訊息的 Bot。

## 功能

- 🗑️ 刪除指定數量或全部訊息
- ⚡ 14 天內訊息批量刪除（快速）
- 🕐 超過 14 天的訊息逐一刪除（受 Discord API 限制）
- 🔒 權限檢查（需 Manage Messages）
- 🛡️ 防止同頻道重複執行
- 📊 即時進度顯示

## 系統需求

- Node.js 18+
- npm

## 首次安裝

### 1. 建立 Discord Bot

1. 前往 [Discord Developer Portal](https://discord.com/developers/applications)
2. 點擊 **New Application** → 輸入名稱 → **Create**
3. 左側選 **Bot**
4. 開啟以下 Privileged Gateway Intents：
   - ✅ **MESSAGE CONTENT INTENT**
5. 點擊 **Reset Token** → **Copy** 保存 Token

### 2. 邀請 Bot 到伺服器

將下方 URL 中的 `YOUR_CLIENT_ID` 替換成你的 Bot Client ID：

```
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=75776&scope=bot
```

> Client ID 在 Developer Portal → General Information → Application ID

所需權限：
- Send Messages
- Manage Messages
- Read Message History

> 💡 如果遇到權限問題，可以改用 Administrator 權限：
> ```
> https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot
> ```

### 3. 安裝依賴

```bash
git clone https://github.com/bluecat0222/discord-purge-bot.git
cd discord-purge-bot
npm install
```

### 4. 啟動 Bot

```bash
# 方法 1：直接啟動
DISCORD_TOKEN=你的Token npm start

# 方法 2：使用 pm2（推薦，自動重啟）
npm install -g pm2
DISCORD_TOKEN=你的Token pm2 start index.js --name purge-bot
pm2 save
```

看到以下訊息代表啟動成功：
```
✅ Bot ready: YourBot#1234
```

### 5.（可選）開啟 Debug 模式

```bash
DEBUG=true DISCORD_TOKEN=你的Token npm start
```

Debug 模式會顯示所有收到的訊息。

## 指令

| 指令 | 說明 |
|------|------|
| `!purge` | 刪除最近 100 則訊息 |
| `!purge 50` | 刪除最近 50 則訊息 |
| `!purge all` | 刪除頻道內所有訊息 |
| `!clear` | 同 `!purge` |
| `!nuke` | 同 `!purge` |
| `!help` | 顯示指令說明 |

## 運作流程

```
!purge all
    ↓
Phase 1: 掃描（用 before 分頁往回掃所有訊息）
    ↓
Phase 2: 刪除
    ├── 14 天內 → bulkDelete（每批 100 則，快速）
    └── 超過 14 天 → 逐一刪除（每秒 1 則，較慢）
    ↓
✅ 完成！共刪除 N 則訊息
```

## 注意事項

- **14 天限制**：Discord API 不支援批量刪除超過 14 天的訊息，只能逐一刪除（約每秒 1 則）
- **大量訊息**：如果頻道有數萬則訊息，刪除超過 14 天的部分會需要較長時間
- **權限**：使用者和 Bot 都需要 Manage Messages 權限
- **防重複**：同一頻道同時只能執行一個 purge

## PM2 管理

```bash
# 查看狀態
pm2 status

# 查看 Log
pm2 logs purge-bot

# 重啟
pm2 restart purge-bot

# 停止
pm2 stop purge-bot
```

## 故障排除

### Bot 沒反應

1. 確認 **MESSAGE CONTENT INTENT** 已開啟（Developer Portal → Bot）
2. 確認 Bot 有在目標頻道的存取權限
3. 開啟 Debug 模式查看是否收到訊息

### 刪除不完全

1. 確認 Bot 有 **Read Message History** 權限
2. 重新邀請 Bot 並給予 Administrator 權限
3. 超過 14 天的訊息需要更長時間處理

### Rate Limit

Bot 已內建延遲機制（每批 1.2 秒），正常情況不會觸發 rate limit。如果遇到，稍等片刻再試。

## License

MIT
