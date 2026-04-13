import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleProp, ViewStyle } from "react-native";

interface AnimatedIconButtonProps {
  isSelected: boolean;
  onPress: () => void;
  size: number;
  ringColor: string;
  backgroundColor: string;
  containerStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

const RING_GAP = 3;
const RING_WIDTH = 2.5;
const SELECT_DURATION = 175;
const PRESS_DURATION = 80;

const AnimatedIconButton: React.FC<AnimatedIconButtonProps> = ({
  isSelected,
  onPress,
  size,
  ringColor,
  backgroundColor,
  containerStyle,
  children,
}) => {
  const pressAnim = useRef(new Animated.Value(1.0)).current;
  const scaleAnim = useRef(new Animated.Value(isSelected ? 1.05 : 1.0)).current;
  const ringOpacity = useRef(new Animated.Value(isSelected ? 1 : 0)).current;
  const contentOpacity = useRef(
    new Animated.Value(isSelected ? 1 : 0.82)
  ).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: isSelected ? 1.05 : 1.0,
        duration: SELECT_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(ringOpacity, {
        toValue: isSelected ? 1 : 0,
        duration: SELECT_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: isSelected ? 1 : 0.82,
        duration: SELECT_DURATION,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isSelected]);

  const handlePressIn = () => {
    Animated.timing(pressAnim, {
      toValue: 0.97,
      duration: PRESS_DURATION,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(pressAnim, {
      toValue: 1.0,
      duration: PRESS_DURATION,
      useNativeDriver: true,
    }).start();
  };

  const radius = size / 2;
  const ringSize = size + RING_GAP * 2;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={containerStyle}
    >
      {/* Outer: press scale */}
      <Animated.View
        style={{
          width: size,
          height: size,
          transform: [{ scale: pressAnim }],
        }}
      >
        {/* Inner: selection scale */}
        <Animated.View
          style={{
            width: size,
            height: size,
            transform: [{ scale: scaleAnim }],
          }}
        >
          {/* Content circle: dim when unselected */}
          <Animated.View
            style={{
              width: size,
              height: size,
              borderRadius: radius,
              backgroundColor,
              alignItems: "center",
              justifyContent: "center",
              opacity: contentOpacity,
            }}
          >
            {children}
          </Animated.View>

          {/* Outer ring: extends beyond circle, opacity-controlled */}
          <Animated.View
            style={{
              position: "absolute",
              top: -RING_GAP,
              left: -RING_GAP,
              width: ringSize,
              height: ringSize,
              borderRadius: ringSize / 2,
              borderWidth: RING_WIDTH,
              borderColor: ringColor,
              opacity: ringOpacity,
            }}
          />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
};

export default AnimatedIconButton;
