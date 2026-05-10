import fetch from "node-fetch";

async function testDisplayNameFix() {
  const baseURL = "http://localhost:3006";
  const timestamp = Date.now();

  console.log("Testing display_name fix...\n");

  // Create an item
  console.log("1. Creating item...");
  const createResponse = await fetch(`${baseURL}/api/admin/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `Test Item ${timestamp}`,
      display_name: "Fancy Display Name",
      value: 100,
      image_url: "https://example.com/test.png",
      rarity: "common",
    }),
  });

  const createdItem = await createResponse.json();
  console.log("Created:", createdItem.item);

  // Update the display name
  console.log("\n2. Updating display_name...");
  const encodedId = encodeURIComponent(createdItem.item.id);
  const updateResponse = await fetch(
    `${baseURL}/api/admin/items/${encodedId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `Test Item ${timestamp}`,
        display_name: "Updated Fancy Display Name",
        value: 200,
        image_url: "https://example.com/test.png",
        rarity: "rare",
      }),
    },
  );

  const updatedItem = await updateResponse.json();
  console.log("Updated:", updatedItem.item);

  // Verify the name is still correct
  console.log("\n3. Verifying name is preserved...");
  console.log("Name should be:", `Test Item ${timestamp}`);
  console.log("Display name should be:", "Updated Fancy Display Name");
  console.log("Actual name:", updatedItem.item.name);
  console.log("Actual display_name:", updatedItem.item.display_name);

  if (
    updatedItem.item.name === `Test Item ${timestamp}` &&
    updatedItem.item.display_name === "Updated Fancy Display Name"
  ) {
    console.log("✅ Fix successful!");
  } else {
    console.log("❌ Fix failed!");
  }
}

testDisplayNameFix().catch(console.error);
