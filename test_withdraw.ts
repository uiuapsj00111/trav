import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testWithdraw() {
    const payload = {
        username: "Trav_ABC",
        roblox_user_id: "12345",
        items: [
            {
                id: 1, // Need a valid ID from available withdraw_queue ideally
                name: "Test Item",
                value: 10
            }
        ]
    };
    
    // Check if Trav_ABC has balance
    const { data: user } = await supabase.from("user_stats").select("balance").eq("username", "Trav_ABC").single();
    console.log("User Balance:", user?.balance);

    const res = await fetch("http://localhost:3000/api/bot/withdraw/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Response:", data);
}

testWithdraw();
