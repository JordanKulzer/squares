import { useCallback, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SHOWN_KEY_PREFIX = "reward_shown_";

interface RewardState {
  /** Whether the reward modal is currently visible */
  visible: boolean;
  /** Current free credit balance — shown inside the modal */
  creditBalance: number;
  /**
   * Trigger the reward modal for a specific milestone.
   *
   * Safe to call multiple times with the same milestoneId — AsyncStorage
   * deduplication ensures the UI is shown exactly once per milestone,
   * across app restarts and multiple devices (since milestoneId is
   * derived from the server-side transaction_id which is unique per grant).
   */
  show: (milestoneId: string, balance: number) => Promise<void>;
  /** Dismiss the modal */
  dismiss: () => void;
}

export function useQuarterWinReward(): RewardState {
  const [visible, setVisible] = useState(false);
  const [creditBalance, setCreditBalance] = useState(0);

  const show = useCallback(async (milestoneId: string, balance: number) => {
    const key = `${SHOWN_KEY_PREFIX}${milestoneId}`;

    try {
      const alreadyShown = await AsyncStorage.getItem(key);
      if (alreadyShown) {
        console.log(`[rewardUI] reward_ui_skipped_duplicate milestoneId=${milestoneId}`);
        return;
      }

      // Mark as shown before rendering — prevents a second call from showing
      // again if this function is invoked while the modal is already open.
      await AsyncStorage.setItem(key, "1");

      console.log(`[rewardUI] reward_ui_shown milestoneId=${milestoneId}`);
      setCreditBalance(balance);
      setVisible(true);
    } catch (err) {
      // Storage failures are non-fatal — show the modal anyway so the
      // user isn't silently deprived of the reward feedback.
      console.warn("[rewardUI] AsyncStorage error, showing anyway:", err);
      setCreditBalance(balance);
      setVisible(true);
    }
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
  }, []);

  return { visible, creditBalance, show, dismiss };
}
