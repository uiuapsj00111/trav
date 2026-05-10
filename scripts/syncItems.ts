
import { mm2Items } from "../src/lib/mm2Items";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function sync() {
  console.log(`Syncing ${mm2Items.length} items...`);
  
  const names = new Set<string>();
  const processedItems = mm2Items.map(item => {
    let name = item.name.replace(/&#x27;/g, "'");
    
    if (names.has(name)) {
      // Try type suffix
      const typeSuffix = item.type === "knife" ? "Knife" : "Gun";
      name = `${name} (${typeSuffix})`;
      
      // If still not unique, try slug or counter
      let counter = 2;
      let baseName = name;
      while (names.has(name)) {
        name = `${baseName} ${counter++}`;
      }
    }
    
    names.add(name);
    
    return {
      name,
      value: item.value,
      rarity: item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1),
      image_url: item.image,
      updated_at: new Date().toISOString()
    };
  });

  // Batch into 50s
  for (let i = 0; i < processedItems.length; i += 50) {
    const batch = processedItems.slice(i, i + 50);
    const { error } = await supabase
      .from("mm2_items")
      .upsert(batch, { onConflict: "name" });
    
    if (error) {
      console.error(`Error syncing batch starting at ${i}:`, error.message);
    } else {
      console.log(`Synced items ${i} to ${Math.min(i + 50, processedItems.length)}`);
    }
  }
  
  console.log("Sync complete!");
}

sync();
