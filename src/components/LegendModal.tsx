import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Animated,
} from "react-native";
import { Portal, useTheme, IconButton } from "react-native-paper";
import Icon from "react-native-vector-icons/MaterialIcons";

interface LegendModalProps {
  visible: boolean;
  onDismiss: () => void;
  players?: Array<{ userId: string; username: string; color: string }>;
  userId?: string | null;
  playerUsernames?: Record<string, string>;
}

const LegendModal: React.FC<LegendModalProps> = ({
  visible,
  onDismiss,
  players = [],
  userId,
  playerUsernames = {},
}) => {
  const theme = useTheme();

  const translateY = React.useRef(new Animated.Value(300)).current;
  const openAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 8,
        }),
        Animated.timing(openAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 300,
          useNativeDriver: true,
          tension: 65,
          friction: 8,
        }),
        Animated.timing(openAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const legendItems: Array<{
    icon: string;
    label: string;
    color: string;
    description?: string;
    isPlayer?: boolean;
  }> = [
    {
      icon: "star",
      label: "Winning Square",
      color: "#FFD700",
    },
    {
      icon: "person",
      label: "Your squares",
      color: theme.colors.primary,
      description: "(blue border)",
    },
    ...players.map((player) => ({
      icon: "circle",
      label: `${playerUsernames[player.userId] || player.username}${
        userId === player.userId ? " (you)" : ""
      }`,
      color: player.color,
      isPlayer: true,
    })),
    {
      icon: "check-box-outline-blank",
      label: "Available squares",
      color: theme.colors.surfaceVariant,
    },
  ];

  return (
    <>
      <Portal>
        {visible && (
          <TouchableWithoutFeedback onPress={onDismiss}>
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0,0,0,0.6)",
              }}
            />
          </TouchableWithoutFeedback>
        )}

        {visible && (
          <Animated.View
            pointerEvents={visible ? "auto" : "none"}
            style={{
              transform: [
                { translateY },
                { scale: openAnim.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) },
              ],
              opacity: openAnim,
              backgroundColor: theme.colors.surface,
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              paddingBottom: 35,
              maxHeight: "60%",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -10 },
              shadowOpacity: 0.4,
              shadowRadius: 16,
              elevation: 24,
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 20,
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.outlineVariant,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontFamily: "Rubik_600SemiBold",
                  color: theme.colors.onSurface,
                }}
              >
                Grid Legend
              </Text>
              <IconButton
                icon="close"
                size={20}
                onPress={onDismiss}
                style={{ margin: 0 }}
              />
            </View>

            {/* Content */}
            <ScrollView
              style={{ paddingHorizontal: 20, paddingTop: 16 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Inline how-it-works blurb */}
              <View
                style={{
                  backgroundColor: theme.dark
                    ? "rgba(108,99,255,0.12)"
                    : "rgba(108,99,255,0.08)",
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 11,
                  marginBottom: 20,
                  borderLeftWidth: 3,
                  borderLeftColor: "rgba(108,99,255,0.5)",
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Rubik_600SemiBold",
                    color: theme.colors.onSurface,
                    marginBottom: 3,
                  }}
                >
                  How it works
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Rubik_400Regular",
                    color: theme.colors.onSurfaceVariant,
                    lineHeight: 19,
                  }}
                >
                  Pick squares. If your square matches the last digit of each
                  team's score, you win that quarter.
                </Text>
              </View>

              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Rubik_400Regular",
                  color: theme.colors.onSurfaceVariant,
                  marginBottom: 20,
                  lineHeight: 20,
                }}
              >
                Understanding the squares grid:
              </Text>

              {legendItems.map((item, index) => (
                <View
                  key={index}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 16,
                  }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: item.isPlayer ? 16 : 6,
                      backgroundColor: item.color,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                      borderWidth: item.icon === "person" ? 2 : 0,
                      borderColor: theme.colors.primary,
                    }}
                  >
                    {!item.isPlayer && (
                      <Icon
                        name={item.icon}
                        size={16}
                        color={
                          item.icon === "star"
                            ? "#000"
                            : item.icon === "person"
                              ? theme.colors.primary
                              : theme.colors.onSurface
                        }
                      />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontFamily: "Rubik_400Regular",
                        color: theme.colors.onSurface,
                      }}
                    >
                      {item.label}
                    </Text>
                    {item.description && (
                      <Text
                        style={{
                          fontSize: 12,
                          fontFamily: "Rubik_400Regular",
                          color: theme.colors.onSurfaceVariant,
                          marginTop: 2,
                        }}
                      >
                        {item.description}
                      </Text>
                    )}
                  </View>
                </View>
              ))}

              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Rubik_400Regular",
                  color: theme.colors.onSurfaceVariant,
                  marginTop: 8,
                  lineHeight: 18,
                }}
              >
                Tap any available square to claim it. Winning squares are marked
                with a star after each quarter ends.
              </Text>
            </ScrollView>
          </Animated.View>
        )}
      </Portal>
    </>
  );
};

export default LegendModal;
