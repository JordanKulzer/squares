import React from "react";
import { View, Dimensions } from "react-native";
import SkeletonPlaceholder from "react-native-skeleton-placeholder-expo";
import { useTheme } from "react-native-paper";

const screenWidth = Dimensions.get("window").width;

const SkeletonLoader = ({
  variant,
}: {
  variant: "gamePickerScreen" | "squareScreen";
}) => {
  const theme = useTheme();
  const isDark = theme.dark;

  const baseColor = isDark ? "#2b2b2d" : "#e8e8f0";
  const highlightColor = isDark ? "#5e60ce" : "#f4f4f8";

  if (variant === "gamePickerScreen") {
    // GamePickerScreen: cards or rows of games
    return (
      <SkeletonPlaceholder
        backgroundColor={baseColor}
        highlightColor={highlightColor}
        borderRadius={12}
      >
        {[...Array(5)].map((_, i) => (
          <View
            key={i}
            style={{
              width: screenWidth - 32,
              height: 90,
              borderRadius: 12,
              marginBottom: 16,
              alignSelf: "center",
            }}
          />
        ))}
      </SkeletonPlaceholder>
    );
  }

  if (variant === "squareScreen") {
    // SquareScreen: team names + grid area + stats placeholders
    return (
      <SkeletonPlaceholder
        backgroundColor={baseColor}
        highlightColor={highlightColor}
        borderRadius={8}
      >
        <View style={{ alignItems: "center", marginTop: 20 }}>
          <View
            style={{
              width: 180,
              height: 24,
              borderRadius: 6,
              marginBottom: 12,
            }}
          />
          <View
            style={{
              width: 100,
              height: 18,
              borderRadius: 6,
              marginBottom: 20,
            }}
          />
        </View>

        {/* Grid placeholder */}
        <View
          style={{
            width: screenWidth - 40,
            height: screenWidth - 40,
            borderRadius: 8,
            alignSelf: "center",
            marginBottom: 20,
          }}
        />

        {/* Footer / price info */}
        <View style={{ alignItems: "center" }}>
          <View
            style={{
              width: 120,
              height: 16,
              borderRadius: 6,
              marginBottom: 10,
            }}
          />
          <View style={{ width: 160, height: 16, borderRadius: 6 }} />
        </View>
      </SkeletonPlaceholder>
    );
  }

  return null;
};

export default SkeletonLoader;
