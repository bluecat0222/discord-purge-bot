# Discord Purge Bot

一鍵刪除 Discord 頻道內所有訊息的 bot。

## 設置

1. 到 [Discord Developer Portal](https://discord.com/developers/applications) 創建 bot
2. 開啟以下 Intents:
   - MESSAGE CONTENT INTENT
   - SERVER MEMBERS INTENT (可選)
3. 邀請 bot 到你的伺服器，需要以下權限:
   - Manage Messages
   - Read Message History
   - Send Messages

## 安裝 & 啟動

```bash
cd discord-purge-bot
npm install

# 方法 1: 環境變數
DISCORD_TOKEN=your_token_here npm start

# 方法 2: 直接改 index.js 裡的 TOKEN
npm start
```

## 指令

| 指令 | 說明 |
|------|------|
| `!purge` | 刪除最近 100 則訊息 |
| `!purge 50` | 刪除最近 50 則訊息 |
| `!purge all` | 刪除頻道內所有訊息 |
| `!clear` | 同 `!purge` |
| `!nuke` | 同 `!purge` |

## 注意事項

- 超過 14 天的訊息無法批量刪除，會逐一刪除（較慢）
- 使用者需要有 Manage Messages 權限
- 大量刪除會有 rate limit，請耐心等待
