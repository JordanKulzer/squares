import "dotenv/config";

export default {
  expo: {
    name: "My Squares!",
    slug: "squares",
    version: "1.7.7",
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
    },
    web: {
      favicon: "./assets/icons/favicon.png",
    },
    plugins: [
      "expo-web-browser",
      "expo-font",
      "expo-notifications",
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
    ],
    owner: "jordankulzer",
    extra: {
      eas: {
        projectId: "a0d72e60-1d9e-4aa4-93ec-66f16f8da1c8",
      },
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
    },
  },
};
