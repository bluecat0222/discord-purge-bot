const { Client, GatewayIntentBits, PermissionFlagsBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const PREFIX = '!';

client.once('ready', () => {
  console.log(`✅ Bot ready: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  console.log(`[MSG] ${message.author.tag}: ${message.content}`);
  
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = args.shift().toLowerCase();
  console.log(`[CMD] ${command} args:`, args);

  if (command === 'purge' || command === 'clear' || command === 'nuke') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return message.reply('❌ 你沒有 Manage Messages 權限');
    }
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return message.reply('❌ Bot 沒有 Manage Messages 權限');
    }

    await message.delete().catch(() => {});

    const arg = args[0];
    if (arg === 'all') {
      await purgeAll(message.channel);
    } else {
      const amount = parseInt(arg) || 100;
      await purgeAll(message.channel, amount);
    }
  }
});

async function purgeAll(channel, maxDelete = Infinity) {
  const status = await channel.send('🗑️ 正在刪除所有訊息...');
  let totalDeleted = 0;

  try {
    // 第一步：收集所有訊息 ID（用 before 分頁往回掃）
    console.log('[PURGE] Phase 1: Collecting all message IDs...');
    const allMessageIds = [];
    let lastId = null;

    while (true) {
      const options = { limit: 100 };
      if (lastId) options.before = lastId;

      const messages = await channel.messages.fetch(options);
      console.log(`[PURGE] Fetched ${messages.size} messages (before: ${lastId || 'latest'})`);

      if (messages.size === 0) break;

      for (const [id, msg] of messages) {
        if (id !== status.id) {
          allMessageIds.push({ id, timestamp: msg.createdTimestamp });
        }
      }

      lastId = messages.last().id;

      if (messages.size < 100) break;
      if (allMessageIds.length >= maxDelete) break;
    }

    console.log(`[PURGE] Found ${allMessageIds.length} messages to delete`);
    
    if (allMessageIds.length === 0) {
      await status.edit('✅ 頻道已經是空的');
      setTimeout(() => status.delete().catch(() => {}), 3000);
      return;
    }

    // 第二步：刪除
    console.log('[PURGE] Phase 2: Deleting...');
    const now = Date.now();
    const fourteenDays = 14 * 24 * 60 * 60 * 1000;

    // 分成 14 天內和超過 14 天的
    const recentIds = allMessageIds
      .filter(m => now - m.timestamp < fourteenDays)
      .map(m => m.id);
    const oldIds = allMessageIds
      .filter(m => now - m.timestamp >= fourteenDays)
      .map(m => m.id);

    console.log(`[PURGE] Recent: ${recentIds.length}, Old: ${oldIds.length}`);

    // 批量刪除 14 天內的（每次最多 100 則）
    for (let i = 0; i < recentIds.length; i += 100) {
      const batch = recentIds.slice(i, i + 100);
      if (batch.length === 1) {
        await channel.messages.delete(batch[0]).catch(e => 
          console.log(`[PURGE] Failed: ${e.message}`));
      } else {
        await channel.bulkDelete(batch, true).catch(e => 
          console.log(`[PURGE] Bulk failed: ${e.message}`));
      }
      totalDeleted += batch.length;
      await status.edit(`🗑️ 已刪除 ${totalDeleted} / ${allMessageIds.length}...`).catch(() => {});
      console.log(`[PURGE] Progress: ${totalDeleted}/${allMessageIds.length}`);
    }

    // 逐一刪除超過 14 天的
    for (const id of oldIds) {
      await channel.messages.delete(id).catch(e =>
        console.log(`[PURGE] Failed old: ${e.message}`));
      totalDeleted++;
      if (totalDeleted % 10 === 0) {
        await status.edit(`🗑️ 已刪除 ${totalDeleted} / ${allMessageIds.length}...`).catch(() => {});
        console.log(`[PURGE] Progress: ${totalDeleted}/${allMessageIds.length}`);
      }
      await sleep(1100); // rate limit: ~1/sec
    }

    console.log(`[PURGE] Done! Total: ${totalDeleted}`);
    await status.edit(`✅ 完成！共刪除 ${totalDeleted} 則訊息`);
    setTimeout(() => status.delete().catch(() => {}), 5000);
  } catch (err) {
    console.error('[PURGE ERROR]', err);
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
