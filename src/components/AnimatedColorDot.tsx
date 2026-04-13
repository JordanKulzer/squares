import React, { useEffect, useRef } from "react";
import { Animated, TouchableOpacity, View } from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

interface AnimatedColorDotProps {
  color: string;
  isSelected: boolean;
  onPress: () => void;
  size: number;
  ringColor: string;
  checkIconSize?: number;
  /** When true the dot is rendered as TAKEN_BY_OTHER: dimmed */
  disabled?: boolean;
  /** Called when the user taps a disabled (taken) dot */
  onPressDisabled?: () => void;
}

const RING_GAP = 3;
const RING_WIDTH = 2.5;
const DURATION = 175;

const AnimatedColorDot: React.FC<AnimatedColorDotProps> = ({
  color,
  isSelected,
  onPress,
  size,
  ringColor,
  checkIconSize = 20,
  disabled = false,
  onPressDisabled,
}) => {
  const scaleAnim = useRef(new Animated.Value(isSelected ? 1.05 : 1.0)).current;
  const ringOpacity = useRef(new Animated.Value(isSelected ? 1 : 0)).current;
  const dotOpacity = useRef(new Animated.Value(isSelected ? 1 : 0.82)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: isSelected ? 1.05 : 1.0,
        duration: DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(ringOpacity, {
        toValue: isSelected ? 1 : 0,
        duration: DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(dotOpacity, {
        toValue: isSelected ? 1 : 0.82,
        duration: DURATION,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isSelected]);

  const radius = size / 2;
  const ringSize = size + RING_GAP * 2;
  const ringRadius = ringSize / 2;

  if (disabled) {
    return (
      <TouchableOpacity
        onPress={onPressDisabled}
        activeOpacity={onPressDisabled ? 0.7 : 1}
      >
        <View style={{ width: size, height: size }}>
          {/* Dimmed color circle */}
          <View
            style={{
              width: size,
              height: size,
              borderRadius: radius,
              backgroundColor: color,
              opacity: 0.4,
            }}
          />
          {/* Lock icon — separate layer, full opacity so it's clearly visible */}
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialIcons
              name="lock"
              size={checkIconSize * 0.8}
              color="#fff"
              style={{
                textShadowColor: "rgba(0, 0, 0, 0.65)",
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 3,
              }}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Animated.View
        style={{
          width: size,
          height: size,
          transform: [{ scale: scaleAnim }],
        }}
      >
        {/* Outer ring — extends outside the circle bounds */}
        <Animated.View
          style={{
            position: "absolute",
            top: -RING_GAP,
            left: -RING_GAP,
            width: ringSize,
            height: ringSize,
            borderRadius: ringRadius,
            borderWidth: RING_WIDTH,
            borderColor: ringColor,
            opacity: ringOpacity,
          }}
        />
        {/* Color circle */}
        <Animated.View
          style={{
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor: color,
            alignItems: "center",
            justifyContent: "center",
            opacity: dotOpacity,
          }}
        >
          {isSelected && (
            <MaterialIcons
              name="check"
              size={checkIconSize}
              color="#fff"
              style={{
                textShadowColor: "rgba(0, 0, 0, 0.5)",
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 2,
              }}
            />
          )}
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default AnimatedColorDot;
