export default {
  expo: {
    name: "Squares",
    slug: "squares",
    version: "1.0.18",
    orientation: "portrait",
    icon: "./assets/icons/squares-logo-white.png",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    jsEngine: "jsc",
    scheme: "squaresgame",
    deepLinks: ["squaresgame://"],
    splash: {
      image: "./assets/icons/squares-logo.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      bundleIdentifier: "com.jkulzer.squaresgame",
      buildNumber: "18",
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
    },
  },
};
