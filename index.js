const { Client, GatewayIntentBits, PermissionFlagsBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const PREFIX = '!';
const DEBUG = process.env.DEBUG === 'true';
const activePurges = new Set(); // 防止同頻道重複執行

client.once('ready', () => {
  console.log(`✅ Bot ready: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (DEBUG) console.log(`[MSG] ${message.author.tag}: ${message.content}`);

  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = args.shift().toLowerCase();

  if (command === 'purge' || command === 'clear' || command === 'nuke') {
    // 權限檢查
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return message.reply('❌ 你沒有 Manage Messages 權限');
    }
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return message.reply('❌ Bot 沒有 Manage Messages 權限');
    }

    // 防止重複執行
    if (activePurges.has(message.channel.id)) {
      return message.reply('⚠️ 這個頻道已經有 purge 在執行中');
    }

    await message.delete().catch(() => {});

    const arg = args[0];
    const maxDelete = arg === 'all' ? Infinity : (parseInt(arg) || 100);

    activePurges.add(message.channel.id);
    try {
      await purgeAll(message.channel, maxDelete);
    } finally {
      activePurges.delete(message.channel.id);
    }
  }

  if (command === 'help') {
    return message.reply([
      '**🗑️ Purge Bot 指令：**',
      '`!purge` — 刪除最近 100 則訊息',
      '`!purge 50` — 刪除最近 50 則訊息',
      '`!purge all` — 刪除頻道所有訊息',
      '`!help` — 顯示此說明',
      '',
      '別名：`!clear`、`!nuke`',
    ].join('\n'));
  }
});

async function purgeAll(channel, maxDelete = Infinity) {
  const status = await channel.send('🗑️ 正在掃描訊息...');
  let totalDeleted = 0;

  try {
    // Phase 1: 收集所有訊息 ID（用 before 分頁往回掃）
    console.log(`[PURGE] #${channel.name} — Phase 1: Collecting messages...`);
    const allMessages = [];
    let lastId = null;

    while (allMessages.length < maxDelete) {
      const options = { limit: 100 };
      if (lastId) options.before = lastId;

      const messages = await channel.messages.fetch(options);

      if (messages.size === 0) break;

      for (const [id, msg] of messages) {
        if (id !== status.id && allMessages.length < maxDelete) {
          allMessages.push({ id, timestamp: msg.createdTimestamp });
        }
      }

      lastId = messages.last().id;

      if (messages.size < 100) break;

      // 每 500 則更新一次狀態
      if (allMessages.length % 500 === 0) {
        await status.edit(`🔍 已掃描 ${allMessages.length} 則訊息...`).catch(() => {});
      }
    }

    console.log(`[PURGE] Found ${allMessages.length} messages to delete`);

    if (allMessages.length === 0) {
      await status.edit('✅ 頻道已經是空的');
      setTimeout(() => status.delete().catch(() => {}), 3000);
      return;
    }

    await status.edit(`🗑️ 開始刪除 ${allMessages.length} 則訊息...`).catch(() => {});

    // Phase 2: 刪除
    console.log(`[PURGE] Phase 2: Deleting ${allMessages.length} messages...`);
    const now = Date.now();
    const fourteenDays = 14 * 24 * 60 * 60 * 1000;

    const recentIds = allMessages
      .filter(m => now - m.timestamp < fourteenDays)
      .map(m => m.id);
    const oldIds = allMessages
      .filter(m => now - m.timestamp >= fourteenDays)
      .map(m => m.id);

    console.log(`[PURGE] Recent: ${recentIds.length}, Old (>14d): ${oldIds.length}`);

    // 批量刪除 14 天內的（每次最多 100 則）
    for (let i = 0; i < recentIds.length; i += 100) {
      const batch = recentIds.slice(i, i + 100);

      try {
        if (batch.length === 1) {
          await channel.messages.delete(batch[0]);
          totalDeleted += 1;
        } else {
          const deleted = await channel.bulkDelete(batch, true);
          totalDeleted += deleted.size;
        }
      } catch (e) {
        console.log(`[PURGE] Batch failed: ${e.message}`);
      }

      // 更新進度
      if (i % 500 === 0 || i + 100 >= recentIds.length) {
        await status.edit(`🗑️ 已刪除 ${totalDeleted} / ${allMessages.length}...`).catch(() => {});
      }

      // 避免 rate limit
      await sleep(1200);
    }

    // 逐一刪除超過 14 天的
    for (let i = 0; i < oldIds.length; i++) {
      try {
        await channel.messages.delete(oldIds[i]);
        totalDeleted++;
      } catch (e) {
        console.log(`[PURGE] Failed old msg: ${e.message}`);
      }

      if ((i + 1) % 10 === 0) {
        await status.edit(`🗑️ 已刪除 ${totalDeleted} / ${allMessages.length}（舊訊息較慢）...`).catch(() => {});
        console.log(`[PURGE] Progress: ${totalDeleted}/${allMessages.length}`);
      }

      await sleep(1200); // rate limit: ~1/sec
    }

    console.log(`[PURGE] Done! Total: ${totalDeleted}`);
    await status.edit(`✅ 完成！共刪除 ${totalDeleted} 則訊息`);
    setTimeout(() => status.delete().catch(() => {}), 5000);
  } catch (err) {
    console.error('[PURGE ERROR]', err.message);
    await status.edit(`❌ 錯誤: ${err.message}`).catch(() => {});
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const TOKEN = process.env.DISCORD_TOKEN;
if (!TOKEN) {
  console.error('❌ 請設定 DISCORD_TOKEN 環境變數');
  process.exit(1);
}
client.login(TOKEN);
