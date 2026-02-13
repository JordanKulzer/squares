import React, { useEffect, useState } from "react";
import { View, Platform } from "react-native";
import Constants from "expo-constants";
import { supabase } from "../lib/supabase";

const isExpoGo = Constants.appOwnership === "expo";
const extra: any =
  Constants.expoConfig?.extra ?? (Constants as any).manifest?.extra ?? {};

let BannerAd: any = null;
let BannerAdSize: any = {};
let TestIds: any = { ADAPTIVE_BANNER: "" };

if (!isExpoGo) {
  const ads = require("react-native-google-mobile-ads");
  BannerAd = ads.BannerAd;
  BannerAdSize = ads.BannerAdSize;
  TestIds = ads.TestIds;
}

const BANNER_ID = isExpoGo
  ? ""
  : Platform.select({
      ios: __DEV__
        ? TestIds.ADAPTIVE_BANNER
        : extra.ADMOB_BANNER_ID_IOS || TestIds.ADAPTIVE_BANNER,
      android: __DEV__
        ? TestIds.ADAPTIVE_BANNER
        : extra.ADMOB_BANNER_ID_ANDROID || TestIds.ADAPTIVE_BANNER,
    }) || "";

const AdBanner: React.FC = () => {
  const [isPremium, setIsPremium] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    const checkPremium = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from("users")
          .select("premium")
          .eq("id", user.id)
          .maybeSingle();

        if (!mounted) return;
        if (error) {
          console.warn("Failed to fetch premium flag", error);
          setIsPremium(false);
        } else {
          setIsPremium(!!data?.premium);
        }
      } catch (e) {
        console.warn("Error checking premium status", e);
      } finally {
        if (mounted) setReady(true);
      }
    };

    checkPremium();
    return () => {
      mounted = false;
    };
  }, []);

  if (!ready || isPremium || isExpoGo || !BannerAd) return null;

  return (
    <View style={{ alignItems: "center", width: "100%" }}>
      <BannerAd
        unitId={BANNER_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdFailedToLoad={(error: any) => {
          console.warn("AdMob banner failed", error);
        }}
      />
    </View>
  );
};

export default AdBanner;
