import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Modal, Portal, useTheme } from "react-native-paper";
import LinearGradient from "react-native-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";

interface FreeSquareRewardModalProps {
  visible: boolean;
  creditBalance: number;
  onUseNow: () => void;
  onDismiss: () => void;
}

export const FreeSquareRewardModal: React.FC<FreeSquareRewardModalProps> = ({
  visible,
  creditBalance,
  onUseNow,
  onDismiss,
}) => {
  const theme = useTheme();
  const isDark = theme.dark;

  const surfaceBg = isDark ? "#1a1a2e" : "#ffffff";
  const textPrimary = isDark ? "#ffffff" : "#1a1a2e";
  const textSecondary = isDark
    ? "rgba(255,255,255,0.6)"
    : "rgba(0,0,0,0.55)";
  const divider = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

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
        style={{ backgroundColor: "rgba(0,0,0,0.65)" }}
      >
        <View
          style={{
            width: "85%",
            borderRadius: 20,
            overflow: "hidden",
            backgroundColor: surfaceBg,
            elevation: 20,
            shadowColor: "#6C63FF",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.35,
            shadowRadius: 20,
          }}
        >
          {/* Close button */}
          <TouchableOpacity
            onPress={onDismiss}
            style={{
              position: "absolute",
              top: 14,
              right: 14,
              zIndex: 10,
              padding: 6,
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <MaterialIcons
              name="close"
              size={22}
              color={isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)"}
            />
          </TouchableOpacity>

          {/* Gradient header */}
          <LinearGradient
            colors={isDark ? ["#5E35B1", "#3949AB"] : ["#7C4DFF", "#5C6BC0"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              paddingTop: 40,
              paddingBottom: 28,
              paddingHorizontal: 24,
              alignItems: "center",
            }}
          >
            <MaterialIcons
              name="card-giftcard"
              size={52}
              color="rgba(255,255,255,0.95)"
              style={{ marginBottom: 14 }}
            />
            <Text
              style={{
                fontSize: 24,
                fontWeight: "700",
                color: "#ffffff",
                textAlign: "center",
                fontFamily: "Rubik_600SemiBold",
                letterSpacing: 0.2,
              }}
            >
              You Earned a Free Square!
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "rgba(255,255,255,0.82)",
                textAlign: "center",
                marginTop: 10,
                fontFamily: "Rubik_400Regular",
                lineHeight: 20,
              }}
            >
              You reached 4 quarter wins and received{"\n"}1 free square credit.
            </Text>
          </LinearGradient>

          {/* Credit balance */}
          <View
            style={{
              paddingHorizontal: 24,
              paddingVertical: 18,
              alignItems: "center",
              borderBottomWidth: 1,
              borderBottomColor: divider,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                color: textSecondary,
                fontFamily: "Rubik_400Regular",
                marginBottom: 4,
              }}
            >
              Your free credit balance
            </Text>
            <Text
              style={{
                fontSize: 28,
                fontWeight: "700",
                color: theme.colors.primary,
                fontFamily: "Rubik_600SemiBold",
              }}
            >
              {creditBalance}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: textSecondary,
                fontFamily: "Rubik_400Regular",
                marginTop: 2,
              }}
            >
              {creditBalance === 1 ? "credit available" : "credits available"}
            </Text>
          </View>

          {/* Actions */}
          <View style={{ paddingHorizontal: 20, paddingVertical: 18, gap: 10 }}>
            {/* Primary: Use it now */}
            <TouchableOpacity
              onPress={onUseNow}
              style={{
                backgroundColor: theme.colors.primary,
                paddingVertical: 13,
                borderRadius: 12,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 6,
              }}
              activeOpacity={0.85}
            >
              <MaterialIcons name="add-circle-outline" size={18} color="#fff" />
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "700",
                  color: "#ffffff",
                  fontFamily: "Rubik_600SemiBold",
                  letterSpacing: 0.2,
                }}
              >
                Use It Now
              </Text>
            </TouchableOpacity>

            {/* Secondary: Not now */}
            <TouchableOpacity
              onPress={onDismiss}
              style={{
                paddingVertical: 11,
                borderRadius: 12,
                alignItems: "center",
                borderWidth: 1,
                borderColor: isDark
                  ? "rgba(255,255,255,0.12)"
                  : "rgba(0,0,0,0.10)",
              }}
              activeOpacity={0.7}
            >
              <Text
                style={{
                  fontSize: 14,
                  color: textSecondary,
                  fontFamily: "Rubik_500Medium",
                }}
              >
                Not Now
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Portal>
  );
};
