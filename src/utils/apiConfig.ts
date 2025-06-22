// utils/apiConfig.ts
import Constants from "expo-constants";

const LOCAL = "http://192.168.1.113:3000"; // your local IP (keep updated)
const PROD = "https://squares-api.onrender.com";

export const API_BASE_URL = __DEV__ ? LOCAL : PROD;
