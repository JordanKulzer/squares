import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const supabaseUrl = "https://usjarubftgzhxgbdfspl.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzamFydWJmdGd6aHhnYmRmc3BsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NzczMzUsImV4cCI6MjA2NjU1MzMzNX0.lus8w1XMgX9tLhcHnt9o6CtpxcQePHkWIbxa3A7smDI";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
