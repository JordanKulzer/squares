const path = require("path");
const {
  getSentryExpoConfig
} = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "css-select") {
    console.log("⚠️ Metro intercepted 'css-select' → using emptyShim.js");
    return {
      type: "sourceFile",
      filePath: path.resolve(__dirname, "shims/emptyShim.js"),
    };
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;