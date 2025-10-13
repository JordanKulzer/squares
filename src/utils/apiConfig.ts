// utils/apiConfig.ts
import Constants from "expo-constants";

const LOCAL = "http://10.66.100.51:3000";
// your local IP (keep updated)
const PROD = "https://squares-api.onrender.com";

//export const API_BASE_URL = __DEV__ ? LOCAL : PROD;
export const API_BASE_URL = PROD;
