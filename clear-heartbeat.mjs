import { createClient } from '@supabase/supabase-js';
const s = createClient('https://mklgcbwtvjgrkpleksxo.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rbGdjYnd0dmpncmtwbGVrc3hvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE4NTM2MywiZXhwIjoyMDg2NzYxMzYzfQ.8iC2C4cx9SX35-X6r_qLv7YDmJBRXwnm-jIfi0Bewys');
const { data, error } = await s.from('bots').update({ last_heartbeat: null }).eq('id', 1).select();
console.log('result:', JSON.stringify({ data, error }));
