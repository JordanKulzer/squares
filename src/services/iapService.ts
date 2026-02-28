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
let fetchProducts: any = null;
let requestPurchase: any = null;
let finishTransaction: any = null;
let purchaseUpdatedListener: any = null;
let purchaseErrorListener: any = null;
let getAvailablePurchases: any = null;

if (!isExpoGo) {
  const iap = require("react-native-iap");
  initConnection = iap.initConnection;
  endConnection = iap.endConnection;
  fetchProducts = iap.fetchProducts;
  requestPurchase = iap.requestPurchase;
  finishTransaction = iap.finishTransaction;
  purchaseUpdatedListener = iap.purchaseUpdatedListener;
  purchaseErrorListener = iap.purchaseErrorListener;
  getAvailablePurchases = iap.getAvailablePurchases;
}

type PurchaseCallback = (success: boolean, productId?: string) => void;

export const isIAPSupported = () => !isExpoGo;

class IAPService {
  private purchaseUpdateSubscription: any = null;
  private purchaseErrorSubscription: any = null;
  private onPurchaseComplete: PurchaseCallback | null = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  // Guard against concurrent ensureConnection calls
  private connectionPromise: Promise<boolean> | null = null;

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
            // v14: use purchaseToken instead of transactionReceipt
            const receipt = purchase.purchaseToken ?? purchase.transactionReceipt;
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

    // If initialize() already started, wait for it
    if (this.initPromise) {
      await this.initPromise;
      return this.initialized;
    }

    // Guard against concurrent bare ensureConnection calls
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = (async () => {
      try {
        await initConnection();
        this.initialized = true;
        this.connectionPromise = null;
        return true;
      } catch (err) {
        console.error("IAP connection error:", err);
        this.connectionPromise = null;
        return false;
      }
    })();

    return this.connectionPromise;
  }

  // --- Product fetching ---
  // v14: fetchProducts({ skus, type }) replaces getProducts/getSubscriptions
  // Returns a normalized object matching the ProductInfo interface in the modal

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

      const products = await fetchProducts({ skus: [EXTRA_SQUARE_ID], type: "in-app" });
      const product = products?.[0];
      if (!product) return null;

      // Normalize v14 field names to match the modal's ProductInfo interface
      return {
        productId: product.id ?? product.productId,
        title: product.displayName ?? product.title,
        description: product.description,
        localizedPrice: product.displayPrice ?? product.localizedPrice,
        price: String(product.price ?? "0.99"),
      };
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

      const subs = await fetchProducts({ skus: [PREMIUM_MONTHLY_ID], type: "subs" });
      const sub = subs?.[0];
      if (!sub) return null;

      // Normalize v14 field names to match the modal's ProductInfo interface
      return {
        productId: sub.id ?? sub.productId,
        title: sub.displayName ?? sub.title,
        description: sub.description,
        localizedPrice: sub.displayPrice ?? sub.localizedPrice,
        price: String(sub.price ?? "4.99"),
      };
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
  // v14: requestPurchase({ request: { apple: { sku } }, type })

  async purchaseExtraSquare(): Promise<void> {
    if (isExpoGo) {
      throw new Error("Purchase not available in Expo Go");
    }

    const connected = await this.ensureConnection();
    if (!connected) throw new Error("IAP not connected");

    try {
      await requestPurchase({
        request: {
          apple: { sku: EXTRA_SQUARE_ID },
          google: { skus: [EXTRA_SQUARE_ID] },
        },
        type: "in-app",
      });
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
      await requestPurchase({
        request: {
          apple: { sku: PREMIUM_MONTHLY_ID },
          google: { skus: [PREMIUM_MONTHLY_ID] },
        },
        type: "subs",
      });
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

      // v14: purchaseToken replaces transactionReceipt
      const receipt = purchase.purchaseToken ?? purchase.transactionReceipt;

      await supabase
        .from("users")
        .update({
          is_premium: true,
          premium_type: "subscription",
          subscription_status: "active",
          subscription_expires_at: expiresAt.toISOString(),
          premium_purchased_at: new Date().toISOString(),
          premium_receipt: receipt,
        })
        .eq("id", user.id);

      // Award premium member badge
      await supabase
        .from("badges")
        .upsert(
          { user_id: user.id, badge_type: "premium_member", earned_at: new Date().toISOString() },
          { onConflict: "user_id,badge_type" }
        );
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

      const receipt = purchase.purchaseToken ?? purchase.transactionReceipt;

      await supabase
        .from("users")
        .update({
          is_premium: true,
          premium_type: "legacy_onetime",
          premium_purchased_at: new Date().toISOString(),
          premium_receipt: receipt,
        })
        .eq("id", user.id);

      // Award premium member badge
      await supabase
        .from("badges")
        .upsert(
          { user_id: user.id, badge_type: "premium_member", earned_at: new Date().toISOString() },
          { onConflict: "user_id,badge_type" }
        );
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
