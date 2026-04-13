import { useRef, useState } from "react";
import * as Haptics from "expo-haptics";

export type PremiumGateSource =
  | "square_limit"
  | "custom_color"
  | "icon"
  | "initial"
  | "premium_row"
  | string;

interface PremiumGateState {
  visible: boolean;
  source: PremiumGateSource | null;
  open: (source: PremiumGateSource) => void;
  close: () => void;
}

export function usePremiumGate(): PremiumGateState {
  const [visible, setVisible] = useState(false);
  const [source, setSource] = useState<PremiumGateSource | null>(null);
  const isOpening = useRef(false);

  const open = (src: PremiumGateSource) => {
    if (isOpening.current) return;
    isOpening.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSource(src);
    setVisible(true);
  };

  const close = () => {
    setVisible(false);
    setSource(null);
    isOpening.current = false;
  };

  return { visible, source, open, close };
}
