// Fetch affiliate info by code from your backend API
import { supabase } from "./supabase";

export async function getAffiliateInfo(code: string) {
  // Example: fetch from Supabase or your API endpoint
  const { data, error } = await supabase
    .from("affiliates")
    .select("username, avatar")
    .eq("code", code)
    .single();
  if (error) return null;
  return data;
}
