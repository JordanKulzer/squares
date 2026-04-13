import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Animated,
} from "react-native";
import {
  Portal,
  Button,
  useTheme,
  TextInput as PaperInput,
} from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import colors from "../../assets/constants/colorOptions";
import { iconOptions } from "../../assets/constants/iconOptions";
import tinycolor from "tinycolor2";
import { usePremium } from "../contexts/PremiumContext";
import { usePremiumGate } from "../hooks/usePremiumGate";
import AnimatedColorDot from "./AnimatedColorDot";
import AnimatedIconButton from "./AnimatedIconButton";
import PremiumBadge from "./PremiumBadge";
import PremiumUpgradeModal from "./PremiumUpgradeModal";
import ColorPickerModal from "./ColorPickerModal";
import Toast from "react-native-toast-message";
import {
  ColorOwnership,
  PlayerColorInfo,
  getColorOwnership,
  isColorSelectable,
} from "../utils/colorOwnership";

// Simple unique ID generator (no external dependency)
const generateGuestId = () =>
  `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

interface AddGuestPlayerModalProps {
  visible: boolean;
  onDismiss: () => void;
  onAddPlayer: (player: {
    userId: string;
    username: string;
    color: string;
    displayType: "color" | "icon" | "initial";
    displayValue?: string;
    isGuest: boolean;
    addedBy: string;
  }) => void;
  currentUserId: string;
  /** Replaces the old string[] usedColors — carries userId so ownership can be classified */
  playerColors?: PlayerColorInfo[];
}

const AddGuestPlayerModal: React.FC<AddGuestPlayerModalProps> = ({
  visible,
  onDismiss,
  onAddPlayer,
  currentUserId,
  playerColors = [],
}) => {
  const theme = useTheme();
  const { isPremium } = usePremium();
  const translateY = useRef(new Animated.Value(600)).current;
  const openAnim = useRef(new Animated.Value(0)).current;

  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [displayType, setDisplayType] = useState<"color" | "icon" | "initial">(
    "color",
  );
  const [displayValue, setDisplayValue] = useState("");
  const premiumGate = usePremiumGate();
  const [showColorPickerModal, setShowColorPickerModal] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  // Handle mount/unmount with animation
  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(openAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 600,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(openAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShouldRender(false);
      });
    }
  }, [visible]);

  const resetForm = () => {
    setName("");
    setSelectedColor(null);
    setDisplayType("color");
    setDisplayValue("");
  };

  const handleAdd = () => {
    if (!name.trim() || !selectedColor) return;

    const guestPlayer = {
      userId: generateGuestId(),
      username: name.trim(),
      color: selectedColor,
      displayType,
      displayValue: displayType !== "color" ? displayValue : undefined,
      isGuest: true,
      addedBy: currentUserId,
    };

    onAddPlayer(guestPlayer);
    resetForm();
    onDismiss();
  };

  const isFormValid =
    name.trim() &&
    selectedColor &&
    (displayType === "color" ||
      (displayType === "icon" && displayValue) ||
      (displayType === "initial" && displayValue.trim()));

  const surfaceColor = theme.colors.surface;
  const dividerColor = theme.dark ? "#333" : "#eee";

  if (!shouldRender && !premiumGate.visible && !showColorPickerModal) return null;

  return (
    <>
      {shouldRender && (
        <Portal>
          {visible && (
            <TouchableWithoutFeedback
              onPress={() => {
                resetForm();
                onDismiss();
              }}
            >
              <View style={styles.backdrop} />
            </TouchableWithoutFeedback>
          )}

          <Animated.View
            pointerEvents={visible ? "auto" : "none"}
            style={[
              styles.container,
              {
                transform: [
                  { translateY },
                  { scale: openAnim.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) },
                ],
                opacity: openAnim,
                backgroundColor: surfaceColor,
              },
            ]}
          >
          {/* Header */}
          <View style={styles.header}>
            <Text
              style={[styles.headerTitle, { color: theme.colors.onBackground }]}
            >
              Add Guest Player
            </Text>
            <TouchableOpacity
              onPress={() => {
                resetForm();
                onDismiss();
              }}
            >
              <Text style={{ color: theme.colors.error, fontFamily: "Sora" }}>
                Close
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.divider, { backgroundColor: dividerColor }]} />

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            {/* Name Input */}
            <View style={styles.section}>
              <Text
                style={[styles.label, { color: theme.colors.onBackground }]}
              >
                Name *
              </Text>
              <PaperInput
                mode="outlined"
                value={name}
                onChangeText={setName}
                placeholder="Enter player name"
                style={[styles.input, { backgroundColor: theme.colors.surface }]}
                maxLength={30}
              />
            </View>

            {/* Color Selection */}
            <View style={styles.section}>
              <Text
                style={[styles.label, { color: theme.colors.onBackground }]}
              >
                Color *
              </Text>
              <View style={styles.colorGrid}>
                {colors.colorOptions.map((color) => {
                  // Guests have no userId, so OWNED_BY_USER never fires here.
                  // Any color claimed by any player is TAKEN_BY_OTHER for a guest.
                  const ownership = getColorOwnership(
                    color,
                    null,
                    playerColors,
                    colors.colorOptions,
                  );
                  const taken = ownership === ColorOwnership.TAKEN_BY_OTHER;
                  const owner = taken
                    ? playerColors.find((p) => p.color === color)
                    : null;
                  return (
                    <AnimatedColorDot
                      key={color}
                      color={color}
                      isSelected={selectedColor === color}
                      onPress={() => {
                        if (isColorSelectable(ownership)) setSelectedColor(color);
                      }}
                      onPressDisabled={() => {
                        Toast.show({
                          type: "info",
                          text1: `Taken by ${owner?.username || "another player"}`,
                          position: "bottom",
                          bottomOffset: 60,
                          visibilityTime: 2000,
                        });
                      }}
                      size={40}
                      ringColor={theme.colors.primary}
                      checkIconSize={18}
                      disabled={taken}
                    />
                  );
                })}
                {/* Custom Color Button (Premium) */}
                <TouchableOpacity
                  onPress={() => {
                    if (isPremium) {
                      setShowColorPickerModal(true);
                    } else {
                      premiumGate.open("custom_color");
                    }
                  }}
                  style={[
                    styles.colorButton,
                    {
                      backgroundColor: theme.dark ? "#333" : "#e8e8e8",
                      borderWidth: 2,
                      borderColor: theme.colors.primary,
                      borderStyle: "dashed",
                    },
                  ]}
                >
                  <MaterialIcons
                    name="colorize"
                    size={18}
                    color={theme.colors.primary}
                  />
                  {!isPremium && <PremiumBadge size={10} />}
                </TouchableOpacity>
              </View>
            </View>

            {/* Display Style */}
            <View style={styles.section}>
              <Text
                style={[styles.label, { color: theme.colors.onBackground }]}
              >
                Display Style
              </Text>
              <View style={styles.displayTypeRow}>
                {(["color", "icon", "initial"] as const).map((type) => {
                  const isLocked = type !== "color" && !isPremium;
                  return (
                    <TouchableOpacity
                      key={type}
                      onPress={() => {
                        if (isLocked) {
                          premiumGate.open(type);
                          return;
                        }
                        setDisplayType(type);
                        if (type === "icon") setDisplayValue("sports-football");
                        else if (type === "initial") setDisplayValue("");
                        else setDisplayValue("");
                      }}
                      style={[
                        styles.displayTypeButton,
                        {
                          backgroundColor:
                            displayType === type
                              ? theme.colors.primary
                              : theme.dark
                                ? "#333"
                                : "#e8e8e8",
                          opacity: isLocked ? 0.4 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.displayTypeText,
                          {
                            color:
                              displayType === type
                                ? "#fff"
                                : theme.colors.onBackground,
                            fontWeight: displayType === type ? "700" : "600",
                          },
                        ]}
                      >
                        {type === "color"
                          ? "Color"
                          : type === "icon"
                            ? "Icon"
                            : "Initial"}
                      </Text>
                      {isLocked && <PremiumBadge size={13} />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {displayType === "icon" && (
                <View style={styles.iconGrid}>
                  {iconOptions.map((icon) => {
                    const isLocked = icon.isPremium && !isPremium;
                    return (
                      <AnimatedIconButton
                        key={icon.name}
                        isSelected={displayValue === icon.name}
                        onPress={() => {
                          if (isLocked) {
                            premiumGate.open("icon");
                          } else {
                            setDisplayValue(icon.name);
                          }
                        }}
                        size={40}
                        ringColor={theme.colors.primary}
                        backgroundColor={
                          selectedColor
                            ? tinycolor(selectedColor).setAlpha(0.2).toRgbString()
                            : theme.dark ? "#333" : "#e8e8e8"
                        }
                        containerStyle={isLocked ? { opacity: 0.5 } : undefined}
                      >
                        <MaterialIcons
                          name={icon.name as any}
                          size={20}
                          color={selectedColor || theme.colors.onBackground}
                        />
                        {isLocked && <PremiumBadge size={10} />}
                      </AnimatedIconButton>
                    );
                  })}
                </View>
              )}

              {displayType === "initial" && (
                <View style={styles.initialRow}>
                  <PaperInput
                    mode="outlined"
                    label="Initial (1 letter)"
                    value={displayValue}
                    onChangeText={(text) => setDisplayValue(text.slice(0, 1).toUpperCase())}
                    maxLength={1}
                    style={[
                      styles.initialInput,
                      { backgroundColor: theme.dark ? "#1e1e1e" : "#fff" },
                    ]}
                    autoCapitalize="characters"
                  />
                  <View style={{ alignItems: "center" }}>
                    <Text
                      style={{
                        fontSize: 11,
                        color: theme.colors.onSurfaceVariant,
                        marginBottom: 4,
                      }}
                    >
                      Preview
                    </Text>
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 8,
                        justifyContent: "center",
                        alignItems: "center",
                        backgroundColor: selectedColor || (theme.dark ? "#444" : "#ccc"),
                      }}
                    >
                      {displayValue ? (
                        <Text
                          style={{
                            fontSize: 20,
                            fontWeight: "700",
                            color: "#fff",
                            textAlign: "center",
                          }}
                        >
                          {displayValue}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Add Button */}
          <Button
            mode="contained"
            onPress={handleAdd}
            disabled={!isFormValid}
            style={styles.addButton}
            contentStyle={styles.addButtonContent}
          >
            Add Player
          </Button>
        </Animated.View>
      </Portal>
      )}

      <PremiumUpgradeModal
        visible={premiumGate.visible}
        onDismiss={premiumGate.close}
        feature="premium icons and display styles"
        source={premiumGate.source ?? undefined}
      />

      <ColorPickerModal
        visible={showColorPickerModal}
        onDismiss={() => setShowColorPickerModal(false)}
        onColorSelect={(color: string) => {
          setSelectedColor(color);
          setShowColorPickerModal(false);
        }}
        initialColor={selectedColor || undefined}
      />
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  container: {
    position: "absolute",
    bottom: -35,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 75,
    maxHeight: "85%",
    borderWidth: 1.5,
    borderLeftWidth: 5,
    borderBottomWidth: 0,
    borderColor: "rgba(94, 96, 206, 0.4)",
    borderLeftColor: "#5E60CE",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "SoraBold",
  },
  divider: {
    height: 1,
    marginBottom: 20,
  },
  scrollView: {
    maxHeight: 400,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    marginBottom: 4,
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  colorButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  checkIcon: {
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  displayTypeRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  displayTypeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  displayTypeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingVertical: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  initialRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  initialInput: {
    flex: 1,
  },
  addButton: {
    marginTop: 16,
  },
  addButtonContent: {
    paddingVertical: 4,
  },
});

export default AddGuestPlayerModal;
