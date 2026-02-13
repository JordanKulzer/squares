import React from "react";
import { View, StyleSheet } from "react-native";
import { usePremium } from "../contexts/PremiumContext";
import { getAdUnitIds, isAdsSupported } from "../services/adService";
import Constants from "expo-constants";

const isExpoGo = Constants.appOwnership === "expo";

// Only import native ads module if not in Expo Go
let BannerAd: any = null;
let BannerAdSize: any = { ANCHORED_ADAPTIVE_BANNER: "" };

if (!isExpoGo) {
  const ads = require("react-native-google-mobile-ads");
  BannerAd = ads.BannerAd;
  BannerAdSize = ads.BannerAdSize;
}

interface AdBannerProps {
  size?: string;
}

const AdBanner: React.FC<AdBannerProps> = ({ size }) => {
  const { isPremium, loading } = usePremium();

  // Don't show ads in Expo Go, if user is premium, or still loading
  if (!isAdsSupported() || loading || isPremium) {
    return null;
  }

  const adSize = size || BannerAdSize.ANCHORED_ADAPTIVE_BANNER;

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={getAdUnitIds().banner}
        size={adSize}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdFailedToLoad={(error: any) => {
          console.log("Banner ad failed to load:", error);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
});

export default AdBanner;
