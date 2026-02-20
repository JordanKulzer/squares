import { Platform } from "react-native";
import { supabase } from "../lib/supabase";
import Constants from "expo-constants";

const extra: any =
  Constants.expoConfig?.extra ?? (Constants as any).manifest?.extra ?? {};

// Product IDs
const LEGACY_PREMIUM_ID =
  extra.IAP_PREMIUM_PRODUCT_ID || "com.jkulzer.squaresgame.premium";
const EXTRA_SQUARE_ID = "com.jkulzer.squaresgame.extra_square";
const PREMIUM_MONTHLY_ID = "com.jkulzer.squaresgame.premium_monthly";

const isExpoGo = Constants.appOwnership === "expo";

// Only import native IAP module if not in Expo Go
let initConnection: any = null;
let endConnection: any = null;
let getProducts: any = null;
let getSubscriptions: any = null;
let requestPurchase: any = null;
let requestSubscription: any = null;
let finishTransaction: any = null;
let purchaseUpdatedListener: any = null;
let purchaseErrorListener: any = null;
let getAvailablePurchases: any = null;

if (!isExpoGo) {
  const iap = require("react-native-iap");
  initConnection = iap.initConnection;
  endConnection = iap.endConnection;
  getProducts = iap.getProducts;
  getSubscriptions = iap.getSubscriptions;
  requestPurchase = iap.requestPurchase;
  requestSubscription = iap.requestSubscription;
  finishTransaction = iap.finishTransaction;
  purchaseUpdatedListener = iap.purchaseUpdatedListener;
  purchaseErrorListener = iap.purchaseErrorListener;
  getAvailablePurchases = iap.getAvailablePurchases;
}

const productIds = Platform.select({
  ios: [EXTRA_SQUARE_ID],
  android: [EXTRA_SQUARE_ID],
}) as string[];

const subscriptionIds = Platform.select({
  ios: [PREMIUM_MONTHLY_ID],
  android: [PREMIUM_MONTHLY_ID],
}) as string[];

type PurchaseCallback = (success: boolean, productId?: string) => void;

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
              const pid = purchase.productId;

              if (pid === EXTRA_SQUARE_ID) {
                // Consumable: increment extra square slots
                await this.handleExtraSquarePurchase();
                await finishTransaction({ purchase, isConsumable: true });
              } else if (pid === PREMIUM_MONTHLY_ID) {
                // Subscription: activate premium
                await this.handleSubscriptionPurchase(purchase);
                await finishTransaction({ purchase, isConsumable: false });
              } else {
                // Legacy one-time purchase
                await this.handleLegacyPurchase(purchase);
                await finishTransaction({ purchase, isConsumable: false });
              }

              this.onPurchaseComplete?.(true, pid);
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
    try {
      await initConnection();
      this.initialized = true;
      return true;
    } catch (err) {
      console.error("IAP connection error:", err);
      return false;
    }
  }

  // --- Product fetching ---

  async getExtraSquareProduct(): Promise<any | null> {
    if (isExpoGo) {
      return {
        productId: EXTRA_SQUARE_ID,
        title: "Extra Square Slot (Dev)",
        description: "Add 1 extra active square slot",
        localizedPrice: "$0.99",
        price: "0.99",
      };
    }

    try {
      const connected = await this.ensureConnection();
      if (!connected) return null;

      const products = await getProducts({ skus: [EXTRA_SQUARE_ID] });
      return products?.[0] || null;
    } catch (err) {
      console.error("Error fetching extra square product:", err);
      return null;
    }
  }

  async getSubscriptionProduct(): Promise<any | null> {
    if (isExpoGo) {
      return {
        productId: PREMIUM_MONTHLY_ID,
        title: "Premium Monthly (Dev)",
        description: "Unlimited squares, ad-free, premium icons & colors",
        localizedPrice: "$4.99",
        price: "4.99",
      };
    }

    try {
      const connected = await this.ensureConnection();
      if (!connected) return null;

      const subs = await getSubscriptions({ skus: [PREMIUM_MONTHLY_ID] });
      return subs?.[0] || null;
    } catch (err) {
      console.error("Error fetching subscription product:", err);
      return null;
    }
  }

  /** @deprecated Use getExtraSquareProduct or getSubscriptionProduct */
  async getProduct(): Promise<any | null> {
    return this.getSubscriptionProduct();
  }

  // --- Purchase methods ---

  async purchaseExtraSquare(): Promise<void> {
    if (isExpoGo) {
      throw new Error("Purchase not available in Expo Go");
    }

    const connected = await this.ensureConnection();
    if (!connected) throw new Error("IAP not connected");

    try {
      await requestPurchase({ sku: EXTRA_SQUARE_ID });
    } catch (err) {
      console.error("Extra square purchase error:", err);
      throw err;
    }
  }

  async purchaseSubscription(): Promise<void> {
    if (isExpoGo) {
      throw new Error("Purchase not available in Expo Go");
    }

    const connected = await this.ensureConnection();
    if (!connected) throw new Error("IAP not connected");

    try {
      if (requestSubscription) {
        await requestSubscription({ sku: PREMIUM_MONTHLY_ID });
      } else {
        await requestPurchase({ sku: PREMIUM_MONTHLY_ID });
      }
    } catch (err) {
      console.error("Subscription purchase error:", err);
      throw err;
    }
  }

  /** @deprecated Use purchaseExtraSquare or purchaseSubscription */
  async purchasePremium(): Promise<void> {
    return this.purchaseSubscription();
  }

  // --- Purchase handlers ---

  private async handleExtraSquarePurchase(): Promise<void> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Insert a consumable credit (single-use, just like earned credits)
      await supabase
        .from("square_credits")
        .insert({ user_id: user.id, reason: "purchased" });
    } catch (err) {
      console.error("Error handling extra square purchase:", err);
    }
  }

  private async handleSubscriptionPurchase(purchase: any): Promise<void> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Set expiration 30 days from now (store will handle actual renewal)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await supabase
        .from("users")
        .update({
          is_premium: true,
          premium_type: "subscription",
          subscription_status: "active",
          subscription_expires_at: expiresAt.toISOString(),
          premium_purchased_at: new Date().toISOString(),
          premium_receipt: purchase.transactionReceipt,
        })
        .eq("id", user.id);
    } catch (err) {
      console.error("Error handling subscription purchase:", err);
    }
  }

  private async handleLegacyPurchase(purchase: any): Promise<void> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from("users")
        .update({
          is_premium: true,
          premium_type: "legacy_onetime",
          premium_purchased_at: new Date().toISOString(),
          premium_receipt: purchase.transactionReceipt,
        })
        .eq("id", user.id);
    } catch (err) {
      console.error("Error storing legacy purchase:", err);
    }
  }

  // --- Restore ---

  async restorePurchases(): Promise<boolean> {
    if (isExpoGo) {
      console.log("Restore not available in Expo Go");
      return false;
    }

    const connected = await this.ensureConnection();
    if (!connected) return false;

    try {
      const purchases = await getAvailablePurchases();
      let restored = false;

      // Check for legacy one-time purchase
      const legacyPurchase = purchases.find(
        (p: any) => p.productId === LEGACY_PREMIUM_ID
      );
      if (legacyPurchase) {
        await this.handleLegacyPurchase(legacyPurchase);
        restored = true;
      }

      // Check for subscription
      const subPurchase = purchases.find(
        (p: any) => p.productId === PREMIUM_MONTHLY_ID
      );
      if (subPurchase) {
        await this.handleSubscriptionPurchase(subPurchase);
        restored = true;
      }

      // Note: extra square consumables can't be restored (they're single-use)

      return restored;
    } catch (err) {
      console.error("Restore purchases error:", err);
      return false;
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
