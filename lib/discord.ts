const DISCORD_API = "https://discord.com/api/v10";
const TOKEN = process.env.DISCORD_BOT_TOKEN!;
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID!;

const GAME_EMOJI: Record<string, string> = {
  coinflip: "🪙",
  mines: "💣",
  limbo: "📈",
  cases: "📦",
  upgrader: "⬆️",
   // battles removed
  roulette: "🎰",
};

const RESULT_COLOR: Record<string, number> = {
  win:  0x22c55e,
  loss: 0xef4444,
  tie:  0xeab308,
};

export async function sendDiscordGameNotification(body: {
  game_type: string;
  username: string;
  avatar_url?: string;
  wager: number;
  payout: number;
  profit: number;
  multiplier?: number;
  result: string;
  meta?: Record<string, any>;
  winner?: string;
  loser?: string;
  winner_avatar?: string;
  loser_avatar?: string;
  winner_side?: string;
  loser_side?: string;
  total_value?: number;
  game_id?: string;
}) {
  if (!TOKEN || !CHANNEL_ID) {
    console.error("[Discord] Not configured - missing TOKEN or CHANNEL_ID");
    return false;
  }

  const emoji = GAME_EMOJI[body.game_type] ?? "🎮";
  const gameTitle = body.game_type.charAt(0).toUpperCase() + body.game_type.slice(1);
  const color = RESULT_COLOR[body.result] ?? 0xffd700;
  const timestamp = new Date().toISOString();
    const won = body.result === "win";
    const profitStr = body.profit >= 0
      ? `+${Number(body.profit).toLocaleString()}`
      : `${Number(body.profit).toLocaleString()}`;

    const COIN_EMOJI = "<:coinstrav:1477795263665147904>";
    const HEADS_EMOJI = "<:headstrav:1477794227382517891>";
    const TAILS_EMOJI = "<:tailstrav:1477794307367895154>";
  
    const fields: { name: string; value: string; inline: boolean }[] = [];
  
    if (body.game_type === "coinflip" && body.winner && body.loser) {
      const winSide = body.winner_side === "orange" ? `${TAILS_EMOJI} Tails` : body.winner_side === "blue" ? `${HEADS_EMOJI} Heads` : "";
      const loseSide = body.loser_side === "orange" ? `${TAILS_EMOJI} Tails` : body.loser_side === "blue" ? `${HEADS_EMOJI} Heads` : "";
        fields.push(
          { name: "🏆 Winner", value: `**${body.winner}**${winSide ? ` (${winSide})` : ""}`, inline: true },
          { name: "💀 Loser",  value: `**${body.loser}**${loseSide ? ` (${loseSide})` : ""}`, inline: true },
          { name: "\u200b", value: "\u200b", inline: false },
          { name: `${COIN_EMOJI} Bet`, value: `**${Number(body.wager).toLocaleString()}** ${COIN_EMOJI}`, inline: true },
          { name: `${COIN_EMOJI} Total Pot`, value: `**${Number(body.total_value ?? body.wager * 2).toLocaleString()}** ${COIN_EMOJI}`, inline: true },
        );
      if (body.game_id) {
        fields.push({ name: "🆔 Game ID", value: `\`#${body.game_id.slice(0, 8).toUpperCase()}\``, inline: true });
      }
    } else {
        fields.push(
          { name: "👤 Player", value: `**${body.username}**`, inline: true },
          { name: "🎲 Result", value: `${won ? "✅ Win" : body.result === "tie" ? "🤝 Tie" : "❌ Loss"}`, inline: true },
          { name: "\u200b", value: "\u200b", inline: false },
          { name: `${COIN_EMOJI} Wager`, value: `**${Number(body.wager).toLocaleString()}** ${COIN_EMOJI}`, inline: true },
          { name: `${COIN_EMOJI} Payout`, value: `**${Number(body.payout).toLocaleString()}** ${COIN_EMOJI}`, inline: true },
          { name: "📊 Profit", value: `**${profitStr}** ${COIN_EMOJI}`, inline: true },
        );

    if (body.multiplier) {
      fields.push({ name: "✖️ Multiplier", value: `**${body.multiplier}x**`, inline: true });
    }

    if (body.meta) {
        if (body.game_type === 'roulette' && body.meta.outcome) {
            fields.push({ name: '🎡 Outcome', value: `**${body.meta.outcome}**`, inline: true });
        }
    }
  }

  const embed = {
    title: `${emoji} ${gameTitle} — ${body.game_type === "coinflip" ? "Game Result" : won ? "Win!" : body.result === "tie" ? "Tie" : "Loss"}`,
    color,
    timestamp,
    thumbnail: body.avatar_url ? { url: body.avatar_url } : body.winner_avatar ? { url: body.winner_avatar } : undefined,
    fields,
    footer: { text: "trav.bet • https://trav.bet" },
    url: "https://trav.bet",
  };

  try {
    const res = await fetch(`${DISCORD_API}/channels/${CHANNEL_ID}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ embeds: [embed] }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[Discord] Failed to send message:", errText);
      return false;
    }

    const msg = await res.json();
    const reactionEmoji = body.result === "win" ? "✅" : body.result === "tie" ? "🤝" : "❌";
    const encodedEmoji = encodeURIComponent(reactionEmoji);
    await fetch(`${DISCORD_API}/channels/${CHANNEL_ID}/messages/${msg.id}/reactions/${encodedEmoji}/@me`, {
      method: "PUT",
      headers: { Authorization: `Bot ${TOKEN}` },
    });

    return true;
  } catch (err) {
    console.error("[Discord] Request error:", err);
    return false;
  }
}
