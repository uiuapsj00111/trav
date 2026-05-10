// ============================================================
// Paste this entire script into the browser console while on
// https://values.bloxluck.com/
// It will scrape all items and download bloxluck-items.json
// ============================================================

(async () => {
  const items = {};

  // Try to find a built-in API first
  const apiAttempts = [
    "/api/items",
    "/api/v1/items",
    "/api/values",
    "/api/mm2/items",
  ];

  let apiData = null;
  for (const path of apiAttempts) {
    try {
      const res = await fetch(path);
      if (res.ok) {
        const json = await res.json();
        apiData = { path, data: json };
        console.log("Found API at:", path);
        break;
      }
    } catch (e) {}
  }

  if (apiData) {
    console.log("API data:", JSON.stringify(apiData.data, null, 2).slice(0, 1000));
  } else {
    console.log("No direct API found, scraping DOM...");

    // Scrape item cards from the page
    const cards = document.querySelectorAll(
      "[class*='item'], [class*='card'], [class*='weapon'], [class*='knife'], [class*='gun']"
    );
    console.log("Found", cards.length, "potential item elements");

    cards.forEach((card) => {
      const nameEl = card.querySelector("[class*='name'], h2, h3, h4, span, p") || card;
      const valueEl = card.querySelector("[class*='value'], [class*='price'], [class*='worth']");
      const name = nameEl?.textContent?.trim();
      const value = valueEl?.textContent?.trim();
      if (name && name.length > 1 && name.length < 60) {
        const numVal = parseFloat(value?.replace(/[^0-9.]/g, "")) || 0;
        items[name] = numVal;
      }
    });

    // Check Next.js hydrated data
    try {
      const nextData = window.__NEXT_DATA__;
      if (nextData) {
        console.log("__NEXT_DATA__ found:", JSON.stringify(nextData).slice(0, 1000));
      }
    } catch (e) {}

    // Check window globals that might hold item data
    for (const key of Object.keys(window)) {
      if (
        key.toLowerCase().includes("item") ||
        key.toLowerCase().includes("value") ||
        key.toLowerCase().includes("mm2")
      ) {
        try {
          const val = JSON.stringify(window[key]);
          if (val && val.length > 10) {
            console.log("Window key:", key, "=", val.slice(0, 300));
          }
        } catch (e) {}
      }
    }

    console.log("Scraped", Object.keys(items).length, "items from DOM");
  }

  // Download result as JSON
  const output = apiData ? apiData.data : items;
  const blob = new Blob([JSON.stringify(output, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "bloxluck-items.json";
  a.click();
  console.log("Done! bloxluck-items.json downloading...");
})();
