const body = JSON.stringify({ bot_name: 'Trav_ABC', api_key: 'mm2dice-bot-key-2024' });
const res = await fetch('http://localhost:3000/api/bot/heartbeat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body,
});
const data = await res.json();
console.log('Status:', res.status);
console.log('Response:', JSON.stringify(data));
