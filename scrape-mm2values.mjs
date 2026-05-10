/**
 * MM2Values scraper - scrapes item names + values from mm2values.com
 * Run: node scrape-mm2values.mjs
 * Output: mm2values-items.json
 */

import { writeFileSync } from "fs";

const PAGES = [
  { url: "https://mm2values.com/?p=godly",   category: "Godly" },
  { url: "https://mm2values.com/?p=ancient",  category: "Ancient" },
  { url: "https://mm2values.com/?p=vintage",  category: "Vintage" },
  { url: "https://mm2values.com/?p=sets",     category: "Sets" },
];

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchPage(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function parseItems(html, category) {
  const items = [];

  // Match item blocks — mm2values uses patterns like:
  // <div class="item-name">Clockwork</div> ... <div class="item-value">150</div>
  // Also try: name in alt/title of img, value in text

  // Strategy 1: JSON embedded in page (some pages have window.__NUXT__ or similar)
  const jsonMatch = html.match(/window\.__(?:DATA|ITEMS|NUXT)__\s*=\s*(\{[\s\S]*?\});/);
  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[1]);
      console.log(`[${category}] Found embedded JSON`);
      return data;
    } catch {}
  }

  // Strategy 2: Parse HTML table rows / item cards
  // Pattern: find item name + value pairs
  // mm2values uses: <td> or <div> with item name, then value next to it

  // Match patterns like: ItemName ... VALUE: 123  or  ItemName\t123
  const lines = html
    .replace(/<[^>]+>/g, "\n") // strip tags
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  let lastName = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Value line patterns
    const valueMatch =
      line.match(/^VALUE[:\s]+([0-9,]+(?:\.[0-9]+)?)/i) ||
      line.match(/^([0-9,]+(?:\.[0-9]+)?)$/) ||
      line.match(/value[:\s]+([0-9,]+(?:\.[0-9]+)?)/i);

    if (valueMatch && lastName) {
      const val = parseFloat(valueMatch[1].replace(/,/g, ""));
      if (!isNaN(val) && val > 0) {
        items.push({ name: lastName, value: val, category });
        lastName = null;
      }
      continue;
    }

    // Name line: skip obvious non-names
    if (
      line.length > 2 &&
      line.length < 40 &&
      !line.match(/^(https?:|#|@|Copyright|Privacy|Terms|Menu|Home|Search|Login|Sign)/i) &&
      !line.match(/^\d+$/) &&
      !line.match(/^(Godly|Ancient|Vintage|Sets|Pets|Knives|Guns|Click|Filter|Sort|Value|Category|Unique|Legendary|Rare|Common|Uncommon|More Data|coming with)/i) &&
      !line.match(/[():]/) // skip lines with parentheses or colons (UI text)
    ) {
      lastName = line;
    }
  }

  return items;
}

async function main() {
  const allItems = [];

  for (const { url, category } of PAGES) {
    console.log(`Fetching ${category}: ${url}`);
    try {
      const html = await fetchPage(url);
      const items = parseItems(html, category);
      console.log(`  -> Found ${items.length} items`);
      allItems.push(...items);
    } catch (err) {
      console.error(`  -> Error: ${err.message}`);
    }
    await sleep(1200); // be polite
  }

  // Deduplicate by name (keep highest value)
  const map = new Map();
  for (const item of allItems) {
    const key = item.name.toLowerCase();
    if (!map.has(key) || map.get(key).value < item.value) {
      map.set(key, item);
    }
  }

  const result = Array.from(map.values()).sort((a, b) => b.value - a.value);

  writeFileSync(
    "mm2values-items.json",
    JSON.stringify(result, null, 2),
    "utf-8"
  );

  console.log(`\nDone! ${result.length} unique items saved to mm2values-items.json`);

  // Print top 20 as preview
  console.log("\nTop 20 items:");
  result.slice(0, 20).forEach((i, idx) => {
    console.log(`  ${idx + 1}. ${i.name} (${i.category}) = ${i.value}`);
  });
}

main().catch(console.error);
