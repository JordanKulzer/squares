import React from "react";
import { View, Dimensions } from "react-native";
import SkeletonPlaceholder from "react-native-skeleton-placeholder-expo";
import { useTheme } from "react-native-paper";

const screenWidth = Dimensions.get("window").width;

const SkeletonLoader = ({
  variant,
}: {
  variant: "gamePickerScreen" | "squareScreen" | "friendsList" | "friendRequests" | "friendsListScreen" | "homeScreen" | "leaderboardScreen" | "leaderboardWeeklyScreen" | "list" | "profile" | "badgeGrid" | "browseScreen";
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
    // FriendsScreen: tab bar + list of friend cards with avatars
    return (
      <SkeletonPlaceholder
        backgroundColor={baseColor}
        highlightColor={highlightColor}
        borderRadius={12}
      >
        {/* Tab bar placeholder */}
        <View style={{ flexDirection: "row", paddingTop: 8, paddingHorizontal: 16, marginBottom: 4 }}>
          <View style={{ flex: 1, height: 42, borderRadius: 8, marginRight: 4 }} />
          <View style={{ flex: 1, height: 42, borderRadius: 8, marginLeft: 4 }} />
        </View>
        {/* Friend card rows */}
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          {[...Array(5)].map((_, i) => (
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
              <View style={{ width: 56, height: 56, borderRadius: 28, marginRight: 12 }} />
              {/* Text content */}
              <View style={{ flex: 1 }}>
                <View style={{ width: "55%", height: 15, borderRadius: 4, marginBottom: 8 }} />
                <View style={{ width: "75%", height: 12, borderRadius: 4 }} />
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
    // HomeScreen: game card list (below action buttons + "Your Squares" header)
    return (
      <SkeletonPlaceholder
        backgroundColor={baseColor}
        highlightColor={highlightColor}
        borderRadius={16}
      >
        <View style={{ paddingHorizontal: 5 }}>
          {[...Array(4)].map((_, i) => (
            <View
              key={i}
              style={{
                width: "100%",
                borderRadius: 16,
                padding: 16,
                marginBottom: 10,
              }}
            >
              {/* Title row */}
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                <View style={{ flex: 1, height: 18, borderRadius: 5 }} />
                <View style={{ width: 52, height: 18, borderRadius: 10, marginLeft: 8 }} />
              </View>
              {/* Teams row */}
              <View style={{ width: "65%", height: 14, borderRadius: 4, marginBottom: 8 }} />
              {/* Stats row */}
              <View style={{ flexDirection: "row", gap: 16 }}>
                <View style={{ width: 48, height: 12, borderRadius: 4 }} />
                <View style={{ width: 60, height: 12, borderRadius: 4 }} />
                <View style={{ width: 80, height: 12, borderRadius: 4 }} />
              </View>
            </View>
          ))}
        </View>
      </SkeletonPlaceholder>
    );
  }

  if (variant === "badgeGrid") {
    // 2-column grid matching real layout: paddingHorizontal 10 on container, gap 10 between columns
    const cardWidth = (screenWidth - 10 * 2 - 10) / 2;
    const cardHeight = cardWidth * 1.25;
    return (
      <SkeletonPlaceholder
        backgroundColor={baseColor}
        highlightColor={highlightColor}
        borderRadius={12}
      >
        <View style={{ paddingHorizontal: 10, paddingTop: 4 }}>
          {[...Array(4)].map((_, rowIdx) => (
            <View key={rowIdx} style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
              {[0, 1].map((colIdx) => (
                <View
                  key={colIdx}
                  style={{ width: cardWidth, height: cardHeight, borderRadius: 12, padding: 14, alignItems: "center" }}
                >
                  {/* Icon */}
                  <View style={{ width: 44, height: 44, borderRadius: 22, marginBottom: 10 }} />
                  {/* Title */}
                  <View style={{ width: "68%", height: 14, borderRadius: 5, marginBottom: 7 }} />
                  {/* Desc line 1 */}
                  <View style={{ width: "85%", height: 11, borderRadius: 4, marginBottom: 4 }} />
                  {/* Desc line 2 */}
                  <View style={{ width: "60%", height: 11, borderRadius: 4, marginBottom: 12 }} />
                  {/* Rarity chip */}
                  <View style={{ width: "52%", height: 22, borderRadius: 10 }} />
                </View>
              ))}
            </View>
          ))}
        </View>
      </SkeletonPlaceholder>
    );
  }

  if (variant === "browseScreen") {
    // BrowsePublicSquaresScreen: featured card + section + game cards
    const cardWidth = screenWidth - 24;
    return (
      <SkeletonPlaceholder
        backgroundColor={baseColor}
        highlightColor={highlightColor}
        borderRadius={16}
      >
        <View style={{ paddingHorizontal: 12, paddingTop: 4 }}>
          {/* Section label */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <View style={{ width: 140, height: 20, borderRadius: 6 }} />
            <View style={{ width: 24, height: 24, borderRadius: 6 }} />
          </View>

          {/* Featured card */}
          <View style={{ width: cardWidth, borderRadius: 16, padding: 16, marginBottom: 20 }}>
            {/* Badge pill */}
            <View style={{ width: 90, height: 22, borderRadius: 12, marginBottom: 12 }} />
            {/* Title */}
            <View style={{ width: "80%", height: 18, borderRadius: 6, marginBottom: 8 }} />
            {/* Date */}
            <View style={{ width: "55%", height: 13, borderRadius: 4, marginBottom: 14 }} />
            {/* Fill bar labels */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
              <View style={{ width: 90, height: 12, borderRadius: 4 }} />
              <View style={{ width: 36, height: 12, borderRadius: 4 }} />
            </View>
            {/* Fill bar */}
            <View style={{ width: "100%", height: 6, borderRadius: 3, marginBottom: 12 }} />
            {/* Stats row */}
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
              <View style={{ width: 40, height: 13, borderRadius: 4 }} />
              <View style={{ width: 6, height: 13, borderRadius: 4 }} />
              <View style={{ width: 60, height: 13, borderRadius: 4 }} />
            </View>
            {/* Creator row */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 24, height: 24, borderRadius: 12 }} />
              <View style={{ width: 80, height: 13, borderRadius: 4 }} />
              <View style={{ width: 14, height: 14, borderRadius: 4 }} />
              <View style={{ width: 50, height: 13, borderRadius: 4 }} />
            </View>
          </View>

          {/* Second section label */}
          <View style={{ width: 110, height: 20, borderRadius: 6, marginBottom: 10 }} />

          {/* Regular game cards */}
          {[...Array(3)].map((_, i) => (
            <View key={i} style={{ width: cardWidth, borderRadius: 16, padding: 16, marginBottom: 10 }}>
              {/* Title */}
              <View style={{ width: "75%", height: 16, borderRadius: 6, marginBottom: 8 }} />
              {/* Date */}
              <View style={{ width: "50%", height: 13, borderRadius: 4, marginBottom: 14 }} />
              {/* Fill bar labels */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                <View style={{ width: 80, height: 12, borderRadius: 4 }} />
                <View style={{ width: 32, height: 12, borderRadius: 4 }} />
              </View>
              {/* Fill bar */}
              <View style={{ width: "100%", height: 6, borderRadius: 3, marginBottom: 12 }} />
              {/* Stats row */}
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                <View style={{ width: 36, height: 13, borderRadius: 4 }} />
                <View style={{ width: 6, height: 13, borderRadius: 4 }} />
                <View style={{ width: 56, height: 13, borderRadius: 4 }} />
              </View>
              {/* Creator row */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ width: 24, height: 24, borderRadius: 12 }} />
                <View style={{ width: 70, height: 13, borderRadius: 4 }} />
                <View style={{ width: 14, height: 14, borderRadius: 4 }} />
                <View style={{ width: 44, height: 13, borderRadius: 4 }} />
              </View>
            </View>
          ))}
        </View>
      </SkeletonPlaceholder>
    );
  }

  if (variant === "leaderboardScreen" || variant === "leaderboardWeeklyScreen") {
    const isWeekly = variant === "leaderboardWeeklyScreen";
    return (
      <SkeletonPlaceholder
        backgroundColor={baseColor}
        highlightColor={highlightColor}
        borderRadius={8}
      >
        <View style={{ paddingHorizontal: 10, paddingTop: 4 }}>
          {/* Weekly-only: timer card */}
          {isWeekly && (
            <View
              style={{
                marginHorizontal: 6,
                marginBottom: 12,
                height: 72,
                borderRadius: 12,
              }}
            />
          )}
          {/* Weekly-only: your stats card */}
          {isWeekly && (
            <View
              style={{
                marginHorizontal: 6,
                marginBottom: 16,
                height: 90,
                borderRadius: 12,
              }}
            />
          )}
          {/* Podium: silver / gold / bronze */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "flex-end",
              gap: 20,
              marginBottom: 28,
              paddingTop: isWeekly ? 0 : 12,
            }}
          >
            {/* 2nd */}
            <View style={{ alignItems: "center", gap: 8 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28 }} />
              <View style={{ width: 62, height: 12, borderRadius: 4 }} />
              <View style={{ width: 36, height: 10, borderRadius: 4 }} />
            </View>
            {/* 1st */}
            <View style={{ alignItems: "center", gap: 8 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32 }} />
              <View style={{ width: 70, height: 12, borderRadius: 4 }} />
              <View style={{ width: 36, height: 10, borderRadius: 4 }} />
            </View>
            {/* 3rd */}
            <View style={{ alignItems: "center", gap: 8 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28 }} />
              <View style={{ width: 62, height: 12, borderRadius: 4 }} />
              <View style={{ width: 36, height: 10, borderRadius: 4 }} />
            </View>
          </View>
          {/* Ranked rows */}
          {[...Array(5)].map((_, i) => (
            <View
              key={i}
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 12,
                gap: 10,
                marginBottom: 8,
                borderRadius: 12,
              }}
            >
              <View style={{ width: 24, height: 15, borderRadius: 4 }} />
              <View style={{ width: 36, height: 36, borderRadius: 18 }} />
              <View style={{ flex: 1 }}>
                <View style={{ width: "52%", height: 14, borderRadius: 4, marginBottom: 6 }} />
              </View>
              <View style={{ width: 28, height: 14, borderRadius: 4 }} />
            </View>
          ))}
        </View>
      </SkeletonPlaceholder>
    );
  }

  if (variant === "friendsListScreen") {
    // FriendsScreen: matches real friendCard exactly (avatar 46px, username, subtext, chevron)
    return (
      <SkeletonPlaceholder
        backgroundColor={baseColor}
        highlightColor={highlightColor}
        borderRadius={12}
        speed={1200}
      >
        <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
          {[...Array(5)].map((_, i) => (
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
              {/* Avatar — matches size={46} */}
              <View style={{ width: 46, height: 46, borderRadius: 23 }} />
              {/* Text block — matches marginLeft: 12 */}
              <View style={{ flex: 1, marginLeft: 12 }}>
                {/* Username — ~55% width, medium height */}
                <View style={{ width: "52%", height: 15, borderRadius: 5, marginBottom: 7 }} />
                {/* Subtext — ~40% width, smaller */}
                <View style={{ width: "38%", height: 12, borderRadius: 4 }} />
              </View>
              {/* Chevron placeholder — matches size={20} */}
              <View style={{ width: 20, height: 20, borderRadius: 4, opacity: 0.4 }} />
            </View>
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
