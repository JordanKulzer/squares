import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  TextInput,
  ScrollView,
} from "react-native";
import { Portal, Button, useTheme } from "react-native-paper";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import tinycolor from "tinycolor2";
import { supabase } from "../lib/supabase";

interface ColorPickerModalProps {
  visible: boolean;
  onDismiss: () => void;
  onColorSelect: (color: string) => void;
  initialColor?: string;
}

// Preset custom colors for quick selection
const presetColors = [
  // Reds
  "#FF0000", "#FF4444", "#CC0000",
  // Oranges
  "#FF6600", "#FF9933", "#FFCC00",
  // Yellows
  "#FFFF00", "#FFD700", "#FFA500",
  // Greens
  "#00FF00", "#33CC33", "#009900",
  // Cyans
  "#00FFFF", "#00CCCC", "#009999",
  // Blues
  "#0000FF", "#3366FF", "#0066CC",
  // Purples
  "#9900FF", "#CC33FF", "#6600CC",
  // Pinks
  "#FF00FF", "#FF66FF", "#CC0099",
  // Browns/Neutrals
  "#8B4513", "#333333", "#666666",
];

const ColorPickerModal: React.FC<ColorPickerModalProps> = ({
  visible,
  onDismiss,
  onColorSelect,
  initialColor = "#5e60ce",
}) => {
  const theme = useTheme();
  const translateY = useRef(new Animated.Value(600)).current;
  const [selectedColor, setSelectedColor] = useState(initialColor);
  const [hexInput, setHexInput] = useState(initialColor);
  const [savedColors, setSavedColors] = useState<string[]>([]);

  // Animate in/out
  useEffect(() => {
    if (visible) {
      setSelectedColor(initialColor);
      setHexInput(initialColor);
      loadSavedColors();
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: 600,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, initialColor]);

  const loadSavedColors = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("users")
        .select("custom_colors")
        .eq("id", user.id)
        .single();

      if (!error && data?.custom_colors) {
        setSavedColors(data.custom_colors);
      }
    } catch (err) {
      console.error("Error loading saved colors:", err);
    }
  };

  const saveColor = async (color: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Add new color to the beginning, remove duplicates, limit to 10
      const upperColor = color.toUpperCase();
      const newColors = [
        upperColor,
        ...savedColors.filter((c) => c.toUpperCase() !== upperColor),
      ].slice(0, 10);

      const { error } = await supabase
        .from("users")
        .update({ custom_colors: newColors })
        .eq("id", user.id);

      if (!error) {
        setSavedColors(newColors);
      }
    } catch (err) {
      console.error("Error saving color:", err);
    }
  };

  const handleHexChange = (text: string) => {
    // Ensure it starts with #
    let hex = text.startsWith("#") ? text : `#${text}`;
    setHexInput(hex);

    // Validate and set color if valid
    if (tinycolor(hex).isValid() && hex.length === 7) {
      setSelectedColor(hex.toUpperCase());
    }
  };

  const handleColorSelect = (color: string) => {
    setSelectedColor(color.toUpperCase());
    setHexInput(color.toUpperCase());
  };

  const handleConfirm = () => {
    // Save the custom color if it's not a preset
    const upperSelected = selectedColor.toUpperCase();
    const isPreset = presetColors.some((c) => c.toUpperCase() === upperSelected);
    if (!isPreset) {
      saveColor(selectedColor);
    }
    onColorSelect(selectedColor);
    onDismiss();
  };

  const isColorSelected = (color: string) => {
    return selectedColor.toUpperCase() === color.toUpperCase();
  };

  const surfaceColor = theme.colors.surface;
  const dividerColor = theme.dark ? "#333" : "#eee";

  return (
    <Portal>
      {visible && (
        <TouchableWithoutFeedback onPress={onDismiss}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>
      )}

      <Animated.View
        pointerEvents={visible ? "auto" : "none"}
        style={[
          styles.container,
          {
            transform: [{ translateY }],
            backgroundColor: surfaceColor,
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: theme.colors.onSurface }]}>
              Custom Color
            </Text>
            <Text
              style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
            >
              Choose any color you like
            </Text>
          </View>
          <TouchableOpacity onPress={onDismiss}>
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
          {/* Color Preview */}
          <View style={styles.previewContainer}>
            <View
              style={[styles.colorPreview, { backgroundColor: selectedColor }]}
            />
            <View style={styles.hexInputContainer}>
              <TextInput
                style={[
                  styles.hexInput,
                  {
                    color: theme.colors.onSurface,
                    borderColor: theme.colors.outline,
                    backgroundColor: theme.dark ? "#222" : "#f5f5f5",
                  },
                ]}
                value={hexInput}
                onChangeText={handleHexChange}
                placeholder="#000000"
                placeholderTextColor={theme.colors.onSurfaceVariant}
                autoCapitalize="characters"
                maxLength={7}
              />
            </View>
          </View>

          {/* Saved Colors */}
          {savedColors.length > 0 && (
            <>
              <Text
                style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}
              >
                Your Colors
              </Text>
              <View style={styles.savedPalette}>
                {savedColors.map((color, index) => (
                  <TouchableOpacity
                    key={`saved-${index}`}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: color },
                      isColorSelected(color) && styles.selectedSwatch,
                    ]}
                    onPress={() => handleColorSelect(color)}
                  >
                    {isColorSelected(color) && (
                      <MaterialIcons
                        name="check"
                        size={16}
                        color={tinycolor(color).isLight() ? "#000" : "#fff"}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Color Palette */}
          <Text
            style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}
          >
            Quick Select
          </Text>
          <View style={styles.palette}>
            {presetColors.map((color, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: color },
                  isColorSelected(color) && styles.selectedSwatch,
                ]}
                onPress={() => handleColorSelect(color)}
              >
                {isColorSelected(color) && (
                  <MaterialIcons
                    name="check"
                    size={16}
                    color={tinycolor(color).isLight() ? "#000" : "#fff"}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.buttonRow}>
          <Button
            mode="outlined"
            onPress={onDismiss}
            style={styles.cancelButton}
          >
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={handleConfirm}
            style={styles.confirmButton}
          >
            Select Color
          </Button>
        </View>
      </Animated.View>
    </Portal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
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
    maxHeight: "80%",
    borderWidth: 1.5,
    borderLeftWidth: 5,
    borderBottomWidth: 0,
    borderColor: "rgba(94, 96, 206, 0.4)",
    borderLeftColor: "#5E60CE",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "SoraBold",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
    fontFamily: "Sora",
  },
  divider: {
    height: 1,
    marginBottom: 20,
  },
  scrollView: {
    maxHeight: 350,
  },
  previewContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginBottom: 20,
  },
  colorPreview: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: "rgba(0,0,0,0.1)",
  },
  hexInputContainer: {
    flex: 1,
    maxWidth: 140,
  },
  hexInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontFamily: "Sora",
  },
  savedPalette: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  palette: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    marginBottom: 16,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedSwatch: {
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 10,
  },
  confirmButton: {
    flex: 1,
    borderRadius: 10,
  },
});

export default ColorPickerModal;
