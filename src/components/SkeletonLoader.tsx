import React from "react";
import { View, Dimensions } from "react-native";
import SkeletonPlaceholder from "react-native-skeleton-placeholder-expo";
import { useTheme } from "react-native-paper";

const screenWidth = Dimensions.get("window").width;

const SkeletonLoader = ({
  variant,
}: {
  variant: "gamePickerScreen" | "squareScreen" | "friendsList" | "friendRequests" | "homeScreen" | "list" | "profile";
}) => {
  const theme = useTheme();
  const isDark = theme.dark;

  const baseColor = isDark ? "#2b2b2d" : "#e8e8f0";
  const highlightColor = isDark ? "#5e60ce" : "#5e60ce";

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

  if (variant === "friendsList") {
    // FriendsScreen: List of friend cards with avatars
    return (
      <SkeletonPlaceholder
        backgroundColor={baseColor}
        highlightColor={highlightColor}
        borderRadius={12}
      >
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          {[...Array(6)].map((_, i) => (
            <View
              key={i}
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 12,
                marginBottom: 8,
                borderRadius: 12,
              }}
            >
              {/* Avatar circle */}
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  marginRight: 12,
                }}
              />
              {/* Text content */}
              <View style={{ flex: 1 }}>
                <View
                  style={{
                    width: "60%",
                    height: 16,
                    borderRadius: 4,
                    marginBottom: 8,
                  }}
                />
                <View
                  style={{
                    width: "80%",
                    height: 12,
                    borderRadius: 4,
                  }}
                />
              </View>
            </View>
          ))}
        </View>
      </SkeletonPlaceholder>
    );
  }

  if (variant === "friendRequests") {
    // Friend requests with action buttons
    return (
      <SkeletonPlaceholder
        backgroundColor={baseColor}
        highlightColor={highlightColor}
        borderRadius={12}
      >
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          {[...Array(3)].map((_, i) => (
            <View
              key={i}
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 12,
                marginBottom: 8,
                borderRadius: 12,
              }}
            >
              {/* Avatar circle */}
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  marginRight: 12,
                }}
              />
              {/* Text content */}
              <View style={{ flex: 1 }}>
                <View
                  style={{
                    width: "50%",
                    height: 16,
                    borderRadius: 4,
                    marginBottom: 8,
                  }}
                />
                <View
                  style={{
                    width: "70%",
                    height: 12,
                    borderRadius: 4,
                  }}
                />
              </View>
              {/* Action buttons */}
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                  }}
                />
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                  }}
                />
              </View>
            </View>
          ))}
        </View>
      </SkeletonPlaceholder>
    );
  }

  if (variant === "homeScreen") {
    // HomeScreen: Header + grid of square cards
    return (
      <SkeletonPlaceholder
        backgroundColor={baseColor}
        highlightColor={highlightColor}
        borderRadius={12}
      >
        <View style={{ padding: 16 }}>
          {/* Header section */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 24,
            }}
          >
            <View style={{ width: 120, height: 28, borderRadius: 6 }} />
            <View style={{ width: 40, height: 40, borderRadius: 20 }} />
          </View>

          {/* Square cards */}
          {[...Array(4)].map((_, i) => (
            <View
              key={i}
              style={{
                width: "100%",
                height: 120,
                borderRadius: 12,
                marginBottom: 16,
              }}
            />
          ))}
        </View>
      </SkeletonPlaceholder>
    );
  }

  if (variant === "list") {
    // Generic list skeleton
    return (
      <SkeletonPlaceholder
        backgroundColor={baseColor}
        highlightColor={highlightColor}
        borderRadius={12}
      >
        <View style={{ padding: 16 }}>
          {[...Array(5)].map((_, i) => (
            <View
              key={i}
              style={{
                width: "100%",
                height: 80,
                borderRadius: 12,
                marginBottom: 12,
              }}
            />
          ))}
        </View>
      </SkeletonPlaceholder>
    );
  }

  if (variant === "profile") {
    // ProfileScreen: Card with profile info and stats
    return (
      <SkeletonPlaceholder
        backgroundColor={baseColor}
        highlightColor={highlightColor}
        borderRadius={16}
      >
        <View style={{ padding: 16 }}>
          {/* Main card */}
          <View
            style={{
              width: "100%",
              borderRadius: 16,
              padding: 20,
              marginBottom: 16,
            }}
          >
            {/* Profile info section */}
            <View style={{ marginBottom: 24 }}>
              <View style={{ width: 150, height: 20, borderRadius: 4, marginBottom: 16 }} />
              <View style={{ width: 100, height: 16, borderRadius: 4, marginBottom: 8 }} />
              <View style={{ width: 180, height: 18, borderRadius: 4 }} />
            </View>

            {/* Divider */}
            <View style={{ width: "100%", height: 1, marginBottom: 24 }} />

            {/* Statistics section */}
            <View>
              <View style={{ width: 100, height: 20, borderRadius: 4, marginBottom: 16 }} />
              <View style={{ flexDirection: "row", gap: 16 }}>
                <View style={{ flex: 1 }}>
                  <View style={{ width: "80%", height: 14, borderRadius: 4, marginBottom: 8 }} />
                  <View style={{ width: "60%", height: 24, borderRadius: 4 }} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ width: "80%", height: 14, borderRadius: 4, marginBottom: 8 }} />
                  <View style={{ width: "60%", height: 24, borderRadius: 4 }} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ width: "80%", height: 14, borderRadius: 4, marginBottom: 8 }} />
                  <View style={{ width: "60%", height: 24, borderRadius: 4 }} />
                </View>
              </View>
            </View>
          </View>

          {/* Buttons */}
          <View style={{ width: "100%", height: 40, borderRadius: 20, marginBottom: 12 }} />
          <View style={{ width: "100%", height: 40, borderRadius: 20 }} />
        </View>
      </SkeletonPlaceholder>
    );
  }

  return null;
};

export default SkeletonLoader;
