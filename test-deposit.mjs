const res = await fetch("http://localhost:3000/api/bot/deposit", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    api_key: "mm2dice-bot-key-2024",
    username: "TestUser",
    roblox_user_id: "123456789",
    items: [{ name: "Harvester", quantity: 2 }, { name: "Luger", quantity: 1 }]
  })
});
const json = await res.json();
console.log("Status:", res.status);
console.log("Body:", JSON.stringify(json));
