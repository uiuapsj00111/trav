import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://mklgcbwtvjgrkpleksxo.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rbGdjYnd0dmpncmtwbGVrc3hvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE4NTM2MywiZXhwIjoyMDg2NzYxMzYzfQ.8iC2C4cx9SX35-X6r_qLv7YDmJBRXwnm-jIfi0Bewys"
);

const { error } = await supabase.from("bots").delete().eq("id", 14);
console.log("delete id=14:", error || "ok");

const { data } = await supabase.from("bots").select("id, name, last_heartbeat").order("id");
console.log("remaining bots:", JSON.stringify(data, null, 2));
