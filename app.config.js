import "dotenv/config";

export default {
  expo: {
    name: "My Squares!",
    slug: "squares",
    version: "2.0.0",
    orientation: "portrait",
    icon: "./assets/icons/New_New_Splash_Logo.png",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    jsEngine: "hermes",
    scheme: "squaresgame",
    deepLinks: ["squaresgame://"],
    splash: {
      image: "./assets/icons/My_Squares_new_logo_white1.png",
      resizeMode: "contain",
      // backgroundColor: "#5e60ce",
    },
    ios: {
      bundleIdentifier: "com.jkulzer.squaresgame",
      supportsTablet: true,
      associatedDomains: ["applinks:squares-41599.web.app"],
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSUserNotificationUsageDescription:
          "This app uses notifications to alert you when quarters end and deadlines approach.",
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/icons/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      permissions: ["android.permission.CAMERA"],
      package: "com.jkulzer.squaresgame",
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "https",
              host: "squares-41599.web.app",
              pathPrefix: "/session/",
            },
          ],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
    },
    web: {
      favicon: "./assets/icons/favicon.png",
    },
    plugins: [
      "expo-web-browser",
      "expo-font",
      "expo-notifications",
      "react-native-iap",
      [
        "expo-build-properties",
        {
          ios: {
            deploymentTarget: "16.4",
            useModularHeaders: true,
          },
        },
      ],
      [
        "@sentry/react-native/expo",
        {
          url: "https://sentry.io/",
          project: "react-native",
          organization: "squares-cp",
        },
      ],
      [
        "react-native-google-mobile-ads",
        {
          androidAppId:
            process.env.ADMOB_APP_ID_ANDROID ||
            "ca-app-pub-3940256099942544~3347511713",
          iosAppId:
            process.env.ADMOB_APP_ID_IOS ||
            "ca-app-pub-3940256099942544~1458002511",
        },
      ],
    ],
    owner: "jordankulzer",
    extra: {
      eas: {
        projectId: "a0d72e60-1d9e-4aa4-93ec-66f16f8da1c8",
      },
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
      // AdMob ad unit IDs (test IDs used as fallback)
      ADMOB_BANNER_ID_IOS:
        process.env.ADMOB_BANNER_ID_IOS ||
        "ca-app-pub-3940256099942544/2435281174",
      ADMOB_BANNER_ID_ANDROID:
        process.env.ADMOB_BANNER_ID_ANDROID ||
        "ca-app-pub-3940256099942544/9214589741",
      ADMOB_REWARDED_ID_IOS:
        process.env.ADMOB_REWARDED_ID_IOS ||
        "ca-app-pub-3940256099942544/1712485313",
      ADMOB_REWARDED_ID_ANDROID:
        process.env.ADMOB_REWARDED_ID_ANDROID ||
        "ca-app-pub-3940256099942544/5224354917",
      ADMOB_INTERSTITIAL_ID_IOS:
        process.env.ADMOB_INTERSTITIAL_ID_IOS ||
        "ca-app-pub-3940256099942544/4411468910",
      ADMOB_INTERSTITIAL_ID_ANDROID:
        process.env.ADMOB_INTERSTITIAL_ID_ANDROID ||
        "ca-app-pub-3940256099942544/1033173712",
      // IAP product ID
      IAP_PREMIUM_PRODUCT_ID:
        process.env.IAP_PREMIUM_PRODUCT_ID || "com.jkulzer.squaresgame.premium",
    },
  },
};
