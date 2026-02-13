import { Platform } from "react-native";
import Constants from "expo-constants";

const extra: any =
  Constants.expoConfig?.extra ?? (Constants as any).manifest?.extra ?? {};
const isDev = __DEV__;
const isExpoGo = Constants.appOwnership === "expo";

// Only import native ads module if not in Expo Go
let RewardedAd: any = null;
let RewardedAdEventType: any = {};
let AdEventType: any = {};
let TestIds: any = { ADAPTIVE_BANNER: "", REWARDED: "" };

if (!isExpoGo) {
  const ads = require("react-native-google-mobile-ads");
  RewardedAd = ads.RewardedAd;
  RewardedAdEventType = ads.RewardedAdEventType;
  AdEventType = ads.AdEventType;
  TestIds = ads.TestIds;
}

// Use test IDs in development, real IDs in production
const BANNER_ID = isExpoGo
  ? ""
  : Platform.select({
      ios: isDev
        ? TestIds.ADAPTIVE_BANNER
        : extra.ADMOB_BANNER_ID_IOS || TestIds.ADAPTIVE_BANNER,
      android: isDev
        ? TestIds.ADAPTIVE_BANNER
        : extra.ADMOB_BANNER_ID_ANDROID || TestIds.ADAPTIVE_BANNER,
    }) || "";

const REWARDED_ID = isExpoGo
  ? ""
  : Platform.select({
      ios: isDev
        ? TestIds.REWARDED
        : extra.ADMOB_REWARDED_ID_IOS || TestIds.REWARDED,
      android: isDev
        ? TestIds.REWARDED
        : extra.ADMOB_REWARDED_ID_ANDROID || TestIds.REWARDED,
    }) || "";

export const getAdUnitIds = () => ({
  banner: BANNER_ID,
  rewarded: REWARDED_ID,
});

export const isAdsSupported = () => !isExpoGo;

class AdService {
  private rewardedAd: any = null;
  private isLoaded = false;
  private isLoading = false;

  loadRewardedAd(): Promise<void> {
    // Skip in Expo Go
    if (isExpoGo || !RewardedAd) {
      return Promise.resolve();
    }

    if (this.isLoading) {
      return Promise.resolve();
    }

    this.isLoading = true;

    return new Promise((resolve, reject) => {
      this.rewardedAd = RewardedAd.createForAdRequest(REWARDED_ID, {
        requestNonPersonalizedAdsOnly: true,
      });

      const unsubscribeLoaded = this.rewardedAd.addAdEventListener(
        RewardedAdEventType.LOADED,
        () => {
          this.isLoaded = true;
          this.isLoading = false;
          unsubscribeLoaded();
          resolve();
        }
      );

      const unsubscribeError = this.rewardedAd.addAdEventListener(
        AdEventType.ERROR,
        (error: any) => {
          this.isLoading = false;
          unsubscribeError();
          reject(error);
        }
      );

      this.rewardedAd.load();
    });
  }

  async showRewardedAd(): Promise<boolean> {
    // In Expo Go, simulate successful ad watch
    if (isExpoGo || !RewardedAd) {
      return true;
    }

    return new Promise((resolve) => {
      if (!this.rewardedAd || !this.isLoaded) {
        resolve(false);
        return;
      }

      let rewarded = false;

      const unsubscribeEarned = this.rewardedAd.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        () => {
          rewarded = true;
        }
      );

      const unsubscribeClosed = this.rewardedAd.addAdEventListener(
        AdEventType.CLOSED,
        () => {
          unsubscribeEarned();
          unsubscribeClosed();
          this.isLoaded = false;
          // Preload next ad in background
          this.loadRewardedAd().catch(console.error);
          resolve(rewarded);
        }
      );

      this.rewardedAd.show();
    });
  }

  isRewardedAdReady(): boolean {
    // In Expo Go, always return true to skip ad requirement
    if (isExpoGo) {
      return true;
    }
    return this.isLoaded;
  }
}

export const adService = new AdService();
