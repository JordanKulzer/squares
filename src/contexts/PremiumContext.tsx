import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { supabase } from "../lib/supabase";

interface PremiumContextType {
  isPremium: boolean;
  loading: boolean;
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

  // In dev mode, override real premium status
  const isPremium = __DEV__ && devModeOverride ? true : realPremiumStatus;

  const refreshPremiumStatus = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setRealPremiumStatus(false);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("is_premium")
        .eq("id", user.id)
        .single();

      if (!error && data) {
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
