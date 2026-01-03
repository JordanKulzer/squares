// src/utils/apiConfig.ts
import Constants from "expo-constants";

const extra: any =
  Constants.expoConfig?.extra ?? (Constants as any).manifest?.extra ?? {};

export const API_BASE_URL: string | undefined = extra.EXPO_PUBLIC_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error("Missing EXPO_PUBLIC_API_BASE_URL (check .env / EAS env)");
}