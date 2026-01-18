// import { createClient } from "@supabase/supabase-js";
// import AsyncStorage from "@react-native-async-storage/async-storage";

// const supabaseUrl = "https://usjarubftgzhxgbdfspl.supabase.co";
// const supabaseAnonKey =
//   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzamFydWJmdGd6aHhnYmRmc3BsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NzczMzUsImV4cCI6MjA2NjU1MzMzNX0.lus8w1XMgX9tLhcHnt9o6CtpxcQePHkWIbxa3A7smDI";

// export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
//   auth: {
//     storage: AsyncStorage,
//     autoRefreshToken: true,
//     persistSession: true,
//     detectSessionInUrl: false,
//   },
// });
// eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value "https://usjarubftgzhxgbdfspl.supabase.co"

// eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzamFydWJmdGd6aHhnYmRmc3BsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NzczMzUsImV4cCI6MjA2NjU1MzMzNX0.lus8w1XMgX9tLhcHnt9o6CtpxcQePHkWIbxa3A7smDI"

import Constants from "expo-constants";
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const extra: any =
  Constants.expoConfig?.extra ?? (Constants as any).manifest?.extra ?? {};

const url = extra.EXPO_PUBLIC_SUPABASE_URL;
const anon = extra.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  throw new Error(
    "Supabase env missing. Check EAS env + app.config.js"
  );
}

export const supabase = createClient(url, anon, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});