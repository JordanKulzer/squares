import React from "react";
import { View, Text } from "react-native";
import { useTheme } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import Icon from "react-native-vector-icons/MaterialIcons";
import tinycolor from "tinycolor2";
import { BADGE_EMOJI_MAP } from "../../assets/constants/iconOptions";

type UserAvatarProps = {
  username: string | null;
  email?: string | null;
  activeBadge?: string | null;
  profileIcon?: string | null;
  profileColor?: string | null;
  showRing?: boolean;
  size: number;
  backgroundColor?: string;
};

const RING_WIDTH = 3;

const getInitials = (name?: string | null, email?: string | null): string => {
  const source = name || email || "";
  if (!source) return "?";
  return source
    .split(/[_\s@.]/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const UserAvatar = ({
  username,
  email,
  activeBadge,
  profileIcon,
  profileColor,
  showRing,
  size,
  backgroundColor,
}: UserAvatarProps) => {
  const theme = useTheme();
  const badge = activeBadge ? BADGE_EMOJI_MAP[activeBadge] : null;

  // Priority: active badge > premium icon > initials
  const baseColor =
    profileColor && !badge
      ? profileColor
      : backgroundColor || theme.colors.primary;

  // Derive gradient stops from base color
  const gradientStart = tinycolor(baseColor).lighten(14).toHexString();
  const gradientEnd = tinycolor(baseColor).darken(10).toHexString();

  let content: React.ReactNode;
  if (badge) {
    content = <Text style={{ fontSize: size * 0.45 }}>{badge.emoji}</Text>;
  } else if (profileIcon) {
    content = <Icon name={profileIcon} size={size * 0.5} color="#fff" />;
  } else {
    content = (
      <Text
        style={{
          color: "#fff",
          fontSize: size * 0.35,
          fontFamily: "SoraBold",
          fontWeight: "700",
        }}
      >
        {getInitials(username, email)}
      </Text>
    );
  }

  const innerCircle = (
    <LinearGradient
      colors={[gradientStart, gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {content}
    </LinearGradient>
  );

  if (!showRing) return innerCircle;

  return (
    <LinearGradient
      colors={["#6C63FF", "#4834DF", "#a855f7"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderRadius: size / 2 + RING_WIDTH + 2,
        padding: RING_WIDTH,
      }}
    >
      {innerCircle}
    </LinearGradient>
  );
};

export default UserAvatar;
