import { useState, useCallback } from "react";
import { getAvailableCredits } from "../utils/squareLimits";

interface FreeCreditsState {
  credits: number;
  loading: boolean;
  fetch: (userId: string) => Promise<void>;
}

export function useFreeCredits(): FreeCreditsState {
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async (userId: string) => {
    if (!userId) return;
    setLoading(true);
    try {
      const count = await getAvailableCredits(userId);
      setCredits(count);
      console.log(`[freeCredits] free_credit_balance_loaded userId=${userId} balance=${count}`);
    } catch (err) {
      console.warn("[freeCredits] Failed to fetch credit balance:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { credits, loading, fetch };
}
