import React from "react";
import { View, StyleSheet } from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

interface PremiumBadgeProps {
  size?: number;
}

const PremiumBadge: React.FC<PremiumBadgeProps> = ({ size = 12 }) => {
  return (
    <View style={[styles.badge, { width: size + 6, height: size + 6 }]}>
      <MaterialIcons name="lock" size={size} color="#FFD700" />
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default PremiumBadge;
