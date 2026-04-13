import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ViewStyle,
} from "react-native";
import { Modal, Portal, useTheme } from "react-native-paper";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/MaterialIcons";

interface WinnerResult {
  isUserWon: boolean;
  quarterLabel: string;
  team1Mascot: string;
  team2Mascot: string;
  squareCoords: [number, number];
  totalWinnings?: number;
  winnerName?: string; // For loss display
}

interface WinnerModalProps {
  visible: boolean;
  onDismiss: () => void;
  result: WinnerResult | null;
}

export const WinnerModal: React.FC<WinnerModalProps> = ({
  visible,
  onDismiss,
  result,
}) => {
  const theme = useTheme();
  const isDark = theme.dark;

  if (!result) return null;

  const containerBg = isDark ? "#1a1a2e" : "#ffffff";
  const textPrimary = isDark ? "#ffffff" : "#1a1a2e";
  const textSecondary = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)";
  const dividerColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={{
          justifyContent: "center",
          alignItems: "center",
          flex: 1,
        }}
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      >
        <View
          style={{
            width: "85%",
            maxHeight: "70%",
            borderRadius: 20,
            overflow: "hidden",
            backgroundColor: containerBg,
            elevation: 20,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.45,
            shadowRadius: 20,
          }}
        >
          {/* Close Button */}
          <TouchableOpacity
            onPress={onDismiss}
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              zIndex: 10,
              padding: 8,
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Icon
              name="close"
              size={24}
              color={isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)"}
            />
          </TouchableOpacity>

          {result.isUserWon ? (
            // ✅ WIN STATE
            <>
              <LinearGradient
                colors={
                  isDark ? ["#4CAF50", "#2E7D32"] : ["#66BB6A", "#43A047"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  paddingTop: 48,
                  paddingBottom: 32,
                  paddingHorizontal: 24,
                  alignItems: "center",
                }}
              >
                {/* Optional subtle icon */}
                <Icon
                  name="check-circle"
                  size={48}
                  color="rgba(255,255,255,0.9)"
                  style={{ marginBottom: 12 }}
                />

                {/* Main headline: "You Won $X.XX" */}
                <Text
                  style={{
                    fontSize: 32,
                    fontWeight: "700",
                    color: "#ffffff",
                    marginBottom: 4,
                  }}
                >
                  You Won{" "}
                  <Text style={{ color: "#E8F5E9" }}>
                    ${result.totalWinnings?.toFixed(2) || "0.00"}
                  </Text>
                </Text>

                {/* Secondary: Quarter info */}
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "500",
                    color: "rgba(255,255,255,0.9)",
                    marginTop: 12,
                  }}
                >
                  {result.quarterLabel} — {result.team1Mascot} vs{" "}
                  {result.team2Mascot}
                </Text>
              </LinearGradient>

              {/* Tertiary: Square coords */}
              <View
                style={{
                  paddingHorizontal: 24,
                  paddingVertical: 20,
                  alignItems: "center",
                  borderTopWidth: 1,
                  borderTopColor: dividerColor,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    color: textSecondary,
                    marginBottom: 8,
                  }}
                >
                  Winning Square
                </Text>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "600",
                    color: textPrimary,
                  }}
                >
                  ({result.squareCoords[0]}, {result.squareCoords[1]})
                </Text>
              </View>

              {/* Action button */}
              <View style={{ paddingHorizontal: 24, paddingBottom: 20 }}>
                <TouchableOpacity
                  onPress={onDismiss}
                  style={{
                    backgroundColor: isDark
                      ? "rgba(76,175,80,0.2)"
                      : "rgba(76,175,80,0.1)",
                    paddingVertical: 12,
                    paddingHorizontal: 24,
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: isDark
                      ? "rgba(76,175,80,0.6)"
                      : "rgba(76,175,80,0.4)",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: isDark ? "#8FBC8F" : "#4CAF50",
                    }}
                  >
                    Nice!
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            // ❌ LOSS STATE
            <>
              <LinearGradient
                colors={
                  isDark ? ["#616161", "#424242"] : ["#B0BEC5", "#90A4AE"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  paddingTop: 48,
                  paddingBottom: 32,
                  paddingHorizontal: 24,
                  alignItems: "center",
                }}
              >
                {/* Subtle icon instead of emoji */}
                <Icon
                  name="close-circle"
                  size={48}
                  color="rgba(255,255,255,0.85)"
                  style={{ marginBottom: 12 }}
                />

                {/* Main headline: "No Win This Quarter" */}
                <Text
                  style={{
                    fontSize: 32,
                    fontWeight: "700",
                    color: "#ffffff",
                    marginBottom: 8,
                    textAlign: "center",
                  }}
                >
                  No Win This Quarter
                </Text>

                {/* Secondary: Winning square owner */}
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "500",
                    color: "rgba(255,255,255,0.9)",
                    marginTop: 12,
                    textAlign: "center",
                  }}
                >
                  {result.quarterLabel} — {result.team1Mascot} vs{" "}
                  {result.team2Mascot}
                </Text>
              </LinearGradient>

              {/* Tertiary: Winning square info */}
              <View
                style={{
                  paddingHorizontal: 24,
                  paddingVertical: 20,
                  alignItems: "center",
                  borderTopWidth: 1,
                  borderTopColor: dividerColor,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    color: textSecondary,
                    marginBottom: 8,
                  }}
                >
                  Winning Square
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: textPrimary,
                    marginBottom: 4,
                  }}
                >
                  {result.winnerName || "No winner"}
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: textSecondary,
                  }}
                >
                  ({result.squareCoords[0]}, {result.squareCoords[1]})
                </Text>
              </View>

              {/* Action button */}
              <View style={{ paddingHorizontal: 24, paddingBottom: 20 }}>
                <TouchableOpacity
                  onPress={onDismiss}
                  style={{
                    backgroundColor: isDark
                      ? "rgba(158,158,158,0.2)"
                      : "rgba(176,190,197,0.15)",
                    paddingVertical: 12,
                    paddingHorizontal: 24,
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: isDark
                      ? "rgba(158,158,158,0.5)"
                      : "rgba(176,190,197,0.4)",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: isDark ? "#B0BEC5" : "#78909C",
                    }}
                  >
                    Got it
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </Modal>
    </Portal>
  );
};
