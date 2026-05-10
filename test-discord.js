const res = await fetch('http://localhost:3000/api/discord/game-history', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    game_type: 'mines',
    username: 'TestUser',
    wager: 5000,
    payout: 12500,
    profit: 7500,
    multiplier: 2.5,
    result: 'win',
    meta: { mineCount: 3, tilesRevealed: 5 }
  })
});
console.log('Status:', res.status, 'Body:', await res.text());
