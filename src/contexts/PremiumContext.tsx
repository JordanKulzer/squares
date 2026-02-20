import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { supabase } from "../lib/supabase";

type PremiumType = "legacy_onetime" | "subscription" | null;

interface PremiumContextType {
  isPremium: boolean;
  loading: boolean;
  premiumType: PremiumType;
  refreshPremiumStatus: () => Promise<void>;
  setPremiumStatus: (status: boolean) => void;
  // Dev mode for testing
  isDevMode: boolean;
  toggleDevPremium: () => void;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

export const PremiumProvider = ({ children }: { children: ReactNode }) => {
  const [realPremiumStatus, setRealPremiumStatus] = useState(false);
  const [devModeOverride, setDevModeOverride] = useState(false);
  const [loading, setLoading] = useState(true);
  const [premiumType, setPremiumType] = useState<PremiumType>(null);

  // In dev mode, override real premium status
  const isPremium = __DEV__ && devModeOverride ? true : realPremiumStatus;

  const refreshPremiumStatus = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setRealPremiumStatus(false);
        setPremiumType(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select(
          "is_premium, premium_type, subscription_expires_at"
        )
        .eq("id", user.id)
        .single();

      if (!error && data) {
        setPremiumType(data.premium_type as PremiumType);

        // Client-side subscription expiry check
        if (
          data.premium_type === "subscription" &&
          data.subscription_expires_at
        ) {
          const expiresAt = new Date(data.subscription_expires_at);
          if (expiresAt < new Date()) {
            // Subscription expired — mark as not premium
            setRealPremiumStatus(false);
            // Update DB to reflect expired status
            await supabase
              .from("users")
              .update({
                is_premium: false,
                subscription_status: "expired",
              })
              .eq("id", user.id);
            return;
          }
        }

        setRealPremiumStatus(data.is_premium || false);
      }
    } catch (err) {
      console.error("Error fetching premium status:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleDevPremium = useCallback(() => {
    if (__DEV__) {
      setDevModeOverride((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    refreshPremiumStatus();

    // Listen for auth state changes to refresh premium status
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        refreshPremiumStatus();
      } else {
        setRealPremiumStatus(false);
        setPremiumType(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshPremiumStatus]);

  return (
    <PremiumContext.Provider
      value={{
        isPremium,
        loading,
        premiumType,
        refreshPremiumStatus,
        setPremiumStatus: setRealPremiumStatus,
        isDevMode: __DEV__ && devModeOverride,
        toggleDevPremium,
      }}
    >
      {children}
    </PremiumContext.Provider>
  );
};

export const usePremium = () => {
  const context = useContext(PremiumContext);
  if (!context) {
    throw new Error("usePremium must be used within PremiumProvider");
  }
  return context;
};
