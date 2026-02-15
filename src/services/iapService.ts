import { Platform } from "react-native";
import { supabase } from "../lib/supabase";
import Constants from "expo-constants";

const extra: any =
  Constants.expoConfig?.extra ?? (Constants as any).manifest?.extra ?? {};
const PREMIUM_PRODUCT_ID =
  extra.IAP_PREMIUM_PRODUCT_ID || "com.jkulzer.squaresgame.premium";

const isExpoGo = Constants.appOwnership === "expo";

// Only import native IAP module if not in Expo Go
let initConnection: any = null;
let endConnection: any = null;
let getProducts: any = null;
let requestPurchase: any = null;
let finishTransaction: any = null;
let purchaseUpdatedListener: any = null;
let purchaseErrorListener: any = null;
let getAvailablePurchases: any = null;

if (!isExpoGo) {
  const iap = require("react-native-iap");
  initConnection = iap.initConnection;
  endConnection = iap.endConnection;
  getProducts = iap.getProducts;
  requestPurchase = iap.requestPurchase;
  finishTransaction = iap.finishTransaction;
  purchaseUpdatedListener = iap.purchaseUpdatedListener;
  purchaseErrorListener = iap.purchaseErrorListener;
  getAvailablePurchases = iap.getAvailablePurchases;
}

const productIds = Platform.select({
  ios: [PREMIUM_PRODUCT_ID],
  android: [PREMIUM_PRODUCT_ID],
}) as string[];

type PurchaseCallback = (success: boolean) => void;

export const isIAPSupported = () => !isExpoGo;

class IAPService {
  private purchaseUpdateSubscription: any = null;
  private purchaseErrorSubscription: any = null;
  private onPurchaseComplete: PurchaseCallback | null = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  async initialize(onPurchaseComplete: PurchaseCallback): Promise<void> {
    // Skip in Expo Go
    if (isExpoGo) {
      console.log("IAP not supported in Expo Go");
      return;
    }

    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.onPurchaseComplete = onPurchaseComplete;

    this.initPromise = (async () => {
      try {
        await initConnection();
        this.initialized = true;

        this.purchaseUpdateSubscription = purchaseUpdatedListener(
          async (purchase: any) => {
            const receipt = purchase.transactionReceipt;
            if (receipt) {
              await this.validateAndStorePurchase(purchase);
              await finishTransaction({ purchase, isConsumable: false });
              this.onPurchaseComplete?.(true);
            }
          }
        );

        this.purchaseErrorSubscription = purchaseErrorListener(
          (error: any) => {
            console.error("Purchase error:", error);
            this.onPurchaseComplete?.(false);
          }
        );
      } catch (err) {
        console.error("IAP initialization error:", err);
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  private async ensureConnection(): Promise<boolean> {
    if (this.initialized) return true;
    if (this.initPromise) {
      await this.initPromise;
      return this.initialized;
    }
    // If initialize() was never called, try connecting now
    try {
      await initConnection();
      this.initialized = true;
      return true;
    } catch (err) {
      console.error("IAP connection error:", err);
      return false;
    }
  }

  async getProduct(): Promise<any | null> {
    if (isExpoGo) {
      // Return mock product for UI testing in Expo Go
      return {
        productId: PREMIUM_PRODUCT_ID,
        title: "Premium (Dev)",
        description: "Unlock all features",
        localizedPrice: "$4.99",
        price: "4.99",
      };
    }

    try {
      const connected = await this.ensureConnection();
      if (!connected) return null;

      const products = await getProducts({ skus: productIds });
      if (!products || products.length === 0) {
        console.warn(
          "No IAP products found for SKU:",
          productIds,
          "— make sure the product is created in App Store Connect / Google Play Console"
        );
        return null;
      }
      return products[0];
    } catch (err) {
      console.error("Error fetching products:", err);
      return null;
    }
  }

  async purchasePremium(): Promise<void> {
    if (isExpoGo) {
      console.log("Purchase not available in Expo Go");
      throw new Error("Purchase not available in Expo Go");
    }

    const connected = await this.ensureConnection();
    if (!connected) throw new Error("IAP not connected");

    try {
      await requestPurchase({ sku: PREMIUM_PRODUCT_ID });
    } catch (err) {
      console.error("Purchase request error:", err);
      throw err;
    }
  }

  async restorePurchases(): Promise<boolean> {
    if (isExpoGo) {
      console.log("Restore not available in Expo Go");
      return false;
    }

    const connected = await this.ensureConnection();
    if (!connected) return false;

    try {
      const purchases = await getAvailablePurchases();
      const premiumPurchase = purchases.find(
        (p: any) => p.productId === PREMIUM_PRODUCT_ID
      );

      if (premiumPurchase) {
        await this.validateAndStorePurchase(premiumPurchase);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Restore purchases error:", err);
      return false;
    }
  }

  private async validateAndStorePurchase(purchase: any): Promise<void> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from("users")
        .update({
          is_premium: true,
          premium_purchased_at: new Date().toISOString(),
          premium_receipt: purchase.transactionReceipt,
        })
        .eq("id", user.id);
    } catch (err) {
      console.error("Error storing purchase:", err);
    }
  }

  cleanup(): void {
    if (isExpoGo) return;

    this.purchaseUpdateSubscription?.remove();
    this.purchaseErrorSubscription?.remove();
    endConnection?.();
    this.initialized = false;
  }
}

export const iapService = new IAPService();
