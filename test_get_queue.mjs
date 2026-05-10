const url = 'http://localhost:3000/api/bot/withdraw/queue?api_key=mm2dice-bot-key-2024&username=Trav_ABC';
fetch(url)
  .then(async res => {
      const text = await res.text();
      console.log("Status:", res.status);
      console.log("Body:", text);
  })
  .catch(console.error);
