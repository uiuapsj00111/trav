import { Client, GatewayIntentBits, ActivityType, Events, EmbedBuilder } from "discord.js";
import { readFileSync } from "fs";
import http from "http";

// Load .env.local manually for local development
try {
  const env = readFileSync(".env.local", "utf8");
  for (const line of env.split("\n")) {
    const [key, ...rest] = line.split("=");
    if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
  }
} catch {}

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

console.log(`[Discord Bot] Using Channel ID: ${CHANNEL_ID}`);
if (!TOKEN) {
  console.error("Missing DISCORD_BOT_TOKEN. Make sure it's set in your environment variables.");
  process.exit(1);
}

console.log("[Discord Bot] Starting...");
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.on(Events.ClientReady, async (readyClient) => {
  console.log(`[Discord Bot] Logged in as ${readyClient.user.tag}`);
  
  // Set persistent status
  readyClient.user.setPresence({
    status: "online",
    activities: [{ name: "trav.bet", type: ActivityType.Playing }],
  });

  // Send status message to the specified channel
  if (CHANNEL_ID) {
    try {
      const channel = await readyClient.channels.fetch(CHANNEL_ID);
      if (channel && channel.isTextBased()) {
        const embed = new EmbedBuilder()
          .setTitle("mm2 bot status")
          .setAuthor({ 
            name: readyClient.user.username, 
            iconURL: readyClient.user.displayAvatarURL() 
          })
          .setThumbnail(readyClient.user.displayAvatarURL())
          .setDescription(`**[trav.bet](https://trav.bet)**\n**[Discord Channel](https://discord.com/channels/1466928449460375614/1467847085792432188)**`)
          .setColor(0x22c55e)
          .setTimestamp();

        await channel.send({ embeds: [embed] });
        console.log(`[Discord Bot] Status message sent to channel ${CHANNEL_ID}`);
      }
    } catch (err) {
      console.error(`[Discord Bot] Failed to send status message:`, err);
    }
  }
});

// Re-set presence every hour to ensure it stays active
setInterval(() => {
  if (client.user) {
    client.user.setPresence({
      status: "online",
      activities: [{ name: "trav.bet", type: ActivityType.Playing }],
    });
  }
}, 3600000);

// Simple HTTP server to keep the service alive on hosting platforms like Render
const PORT = process.env.PORT || 3001;
http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Bot is online and running!");
}).listen(PORT, () => {
  console.log(`[Status] Health check server running on port ${PORT}`);
});

client.login(TOKEN).catch((err) => {
  console.error("[Discord Bot] Failed to login:", err);
});
