const url = 'http://localhost:3000/api/bot/withdraw/queue';
const payload = {
  username: "Trav_ABC",
  roblox_user_id: "123456",
  items: [
    { id: 1, name: "Icewing", value: 100 }
  ]
};
fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})
  .then(async res => {
      const text = await res.text();
      console.log("Status:", res.status);
      console.log("Body:", text);
  })
  .catch(console.error);
