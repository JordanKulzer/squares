/**
 * IAP Service — handles all in-app purchase, restore, and Supabase entitlement logic.
 *
 * QA / validation checklist: see IAP_VALIDATION_CHECKLIST.md in this directory.
 *
 * Products
 *   - com.jkulzer.squaresgame.premium_monthly   subscription  restorable
 *   - com.jkulzer.squaresgame.extra_square       consumable    NOT restorable
 *   - com.jkulzer.squaresgame.premium            legacy/deprecated  restorable
 *
 * Idempotency
 *   Extra square credits require a non-null transactionId. The unique index
 *   on square_credits(transaction_id) makes duplicate inserts a no-op (pg error 23505).
 *   See IAP_VALIDATION_CHECKLIST.md §5 for the migration SQL.
 */
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

  /**
   * The Supabase user ID captured at the moment the user initiates a purchase
   * or restore.  All purchase handlers use this value rather than calling
   * supabase.auth.getUser() at callback time, which may reflect a different
   * account if the user switched between purchase initiation and receipt.
   *
   * Cleared to null after each handler completes (or after restore finishes).
   * If null when a handler fires, the operation is aborted — this covers the
   * case where a purchase callback arrives after the user has fully logged out.
   */
  private purchaseInitiatorId: string | null = null;

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

              // Use the user ID that was captured when the purchase was initiated,
              // not the currently signed-in user.  If purchaseInitiatorId is null
              // (e.g. the user logged out between tap and callback), abort rather
              // than writing to whoever happens to be signed in now.
              const targetUserId = this.purchaseInitiatorId;
              this.purchaseInitiatorId = null; // consumed — clear immediately

              if (!targetUserId) {
                console.error(
                  "purchaseUpdatedListener: no initiator user ID — entitlement write aborted to prevent misassignment",
                  { productId: pid },
                );
                await finishTransaction({ purchase, isConsumable: pid === EXTRA_SQUARE_ID });
                this.onPurchaseComplete?.(false);
                return;
              }

              if (pid === EXTRA_SQUARE_ID) {
                // Consumable: increment extra square slots.
                // handleExtraSquarePurchase throws on unexpected DB errors;
                // we still finish the transaction so Apple doesn't replay it.
                try {
                  await this.handleExtraSquarePurchase(purchase, targetUserId);
                } catch (creditErr) {
                  console.error("Failed to grant extra square credit:", creditErr);
                  // Do not call onPurchaseComplete(true) — user did not receive credit.
                  await finishTransaction({ purchase, isConsumable: true });
                  this.onPurchaseComplete?.(false);
                  return;
                }
                await finishTransaction({ purchase, isConsumable: true });
              } else if (pid === PREMIUM_MONTHLY_ID) {
                // Subscription: activate premium
                await this.handleSubscriptionPurchase(purchase, targetUserId);
                await finishTransaction({ purchase, isConsumable: false });
              } else {
                // Legacy one-time purchase
                await this.handleLegacyPurchase(purchase, targetUserId);
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
        description: "Unlimited squares, premium icons & colors",
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

    // Capture the initiating user before the async store dialog.
    // The listener callback must write to this user, not whoever is
    // signed in when the callback eventually fires.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No authenticated user");
    this.purchaseInitiatorId = user.id;

    try {
      await requestPurchase({
        request: {
          apple: { sku: EXTRA_SQUARE_ID },
          google: { skus: [EXTRA_SQUARE_ID] },
        },
        type: "in-app",
      });
    } catch (err) {
      this.purchaseInitiatorId = null;
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

    // Capture the initiating user — same rationale as purchaseExtraSquare.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No authenticated user");
    this.purchaseInitiatorId = user.id;

    try {
      await requestPurchase({
        request: {
          apple: { sku: PREMIUM_MONTHLY_ID },
          google: { skus: [PREMIUM_MONTHLY_ID] },
        },
        type: "subs",
      });
    } catch (err) {
      this.purchaseInitiatorId = null;
      console.error("Subscription purchase error:", err);
      throw err;
    }
  }

  /** @deprecated Use purchaseExtraSquare or purchaseSubscription */
  async purchasePremium(): Promise<void> {
    return this.purchaseSubscription();
  }

  // --- Purchase handlers ---

  private async handleExtraSquarePurchase(purchase: any, userId: string): Promise<void> {
    // Require a durable transaction identifier — without it we cannot
    // guarantee idempotency, so we refuse to grant the credit.
    const transactionId: string | null =
      purchase.transactionId ?? purchase.purchaseToken ?? null;

    if (!transactionId) {
      console.error(
        "handleExtraSquarePurchase: no transactionId on purchase object — credit not granted",
        purchase,
      );
      return;
    }

    // Insert with transaction_id. The unique index on square_credits(transaction_id)
    // makes this a no-op if the same transaction is replayed (e.g. after app restart
    // before finishTransaction was called). Error code 23505 is a unique violation.
    const { error } = await supabase
      .from("square_credits")
      .insert({ user_id: userId, reason: "purchased", transaction_id: transactionId });

    if (error) {
      if (error.code === "23505") {
        // Duplicate — credit was already granted for this transaction. Safe to ignore.
        console.log("Extra square credit already granted for transaction:", transactionId);
        return;
      }
      // Any other DB error is a real problem — re-throw so the caller can log it.
      throw error;
    }
  }

  private async handleSubscriptionPurchase(purchase: any, userId: string): Promise<void> {
    try {
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
        .eq("id", userId);

      // Award premium member badge
      await supabase
        .from("badges")
        .upsert(
          { user_id: userId, badge_type: "premium_member", earned_at: new Date().toISOString() },
          { onConflict: "user_id,badge_type" }
        );
    } catch (err) {
      console.error("Error handling subscription purchase:", err);
    }
  }

  private async handleLegacyPurchase(purchase: any, userId: string): Promise<void> {
    try {
      const receipt = purchase.purchaseToken ?? purchase.transactionReceipt;

      await supabase
        .from("users")
        .update({
          is_premium: true,
          premium_type: "legacy_onetime",
          premium_purchased_at: new Date().toISOString(),
          premium_receipt: receipt,
        })
        .eq("id", userId);

      // Award premium member badge
      await supabase
        .from("badges")
        .upsert(
          { user_id: userId, badge_type: "premium_member", earned_at: new Date().toISOString() },
          { onConflict: "user_id,badge_type" }
        );
    } catch (err) {
      console.error("Error storing legacy purchase:", err);
    }
  }

  // Restore-only handler: marks premium active without overwriting subscription_expires_at.
  // We must not reset expiry on restore — the stored date reflects when Apple will
  // actually stop renewing and must not be clobbered with a new 30-day window.
  private async handleSubscriptionRestore(purchase: any, userId: string): Promise<void> {
    try {
      const receipt = purchase.purchaseToken ?? purchase.transactionReceipt;

      await supabase
        .from("users")
        .update({
          is_premium: true,
          premium_type: "subscription",
          subscription_status: "active",
          premium_receipt: receipt,
          // Intentionally NOT updating subscription_expires_at or premium_purchased_at
        })
        .eq("id", userId);

      await supabase
        .from("badges")
        .upsert(
          { user_id: userId, badge_type: "premium_member", earned_at: new Date().toISOString() },
          { onConflict: "user_id,badge_type" }
        );
    } catch (err) {
      console.error("Error restoring subscription:", err);
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

    // Capture the user at the moment restore is tapped.  All writes below
    // target this user ID, not whoever supabase.auth.getUser() might return
    // after the async getAvailablePurchases() call completes.
    const { data: { user: restoringUser } } = await supabase.auth.getUser();
    if (!restoringUser) return false;
    const restoreTargetId = restoringUser.id;

    try {
      const purchases = await getAvailablePurchases();
      let restored = false;

      // Check for legacy one-time purchase (lifetime, always restorable)
      const legacyPurchase = purchases.find(
        (p: any) => p.productId === LEGACY_PREMIUM_ID
      );
      if (legacyPurchase) {
        await this.handleLegacyPurchase(legacyPurchase, restoreTargetId);
        restored = true;
      }

      // Check for active subscription — use restore handler (does not overwrite expiry)
      const subPurchase = purchases.find(
        (p: any) => p.productId === PREMIUM_MONTHLY_ID
      );
      if (subPurchase) {
        await this.handleSubscriptionRestore(subPurchase, restoreTargetId);
        restored = true;
      }

      // Extra square consumables are NOT restorable — intentionally excluded.

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
    this.initPromise = null;
    this.connectionPromise = null;
    this.purchaseInitiatorId = null;
  }
}

export const iapService = new IAPService();
