import React, { useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
} from "react-native";
import {
  Portal,
  Text,
  Button,
  TextInput,
  useTheme,
} from "react-native-paper";
import Icon from "react-native-vector-icons/Ionicons";
import { Picker } from "@react-native-picker/picker";
import colors from "../../assets/constants/colorOptions";

const PerSquareSettingsModal = ({
  visible,
  onDismiss,
  maxSelections,
  pricePerSquare,
  setMaxSelections,
  setPricePerSquare,
  blockMode = false,
}) => {
  const unit = blockMode ? "Block" : "Square";
  const unitPlural = blockMode ? "Blocks" : "Squares";
  const defaultMax = blockMode ? "25" : "100";
  const maxTotal = blockMode ? 25 : 100;
  const theme = useTheme();
  const translateY = useRef(new Animated.Value(600)).current;

  const [max, setMax] = useState(String(maxSelections || defaultMax));
  const [price, setPrice] = useState(String(pricePerSquare || "0.00"));
  const [pricePickerVisible, setPricePickerVisible] = useState(false);
  const [tempPrice, setTempPrice] = useState(price);

  // Animate in/out
  useEffect(() => {
    if (visible) {
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
  }, [visible]);

  useEffect(() => {
    if (visible) {
      const priceStr = parseFloat(pricePerSquare || 0).toFixed(2);
      setPrice(priceStr);
      setMax(String(maxSelections || defaultMax));
      setTempPrice(priceStr);
    }
  }, [visible, maxSelections, pricePerSquare]);

  const handleModalConfirm = () => {
    setMaxSelections(max);
    setPricePerSquare(parseFloat(price) || 0);
    onDismiss();
  };

  const surfaceColor = theme.colors.surface;
  const dividerColor = theme.dark ? "#333" : "#eee";

  return (
    <>
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
            <Text
              style={[styles.headerTitle, { color: theme.colors.onBackground }]}
            >
              Per {unit} Settings
            </Text>
            <TouchableOpacity onPress={onDismiss}>
              <Text style={{ color: theme.colors.error, fontFamily: "Sora" }}>
                Close
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.divider, { backgroundColor: dividerColor }]} />

          <TextInput
            label={`1. Max ${unitPlural} Per Person`}
            keyboardType="numeric"
            mode="outlined"
            value={max}
            onChangeText={(text) => setMax(text)}
            style={styles.input}
          />

          <TouchableOpacity
            onPress={() => {
              setPricePickerVisible(true);
            }}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: theme.colors.outlineVariant,
              backgroundColor: theme.colors.elevation.level1,
              marginBottom: 16,
            }}
          >
            <Text
              style={{ fontFamily: "SoraBold", color: theme.colors.onSurface }}
            >
              {`2. Dollar Amount Per ${unit}`}
            </Text>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-end",
              }}
            >
              <Text
                style={{
                  fontFamily: "Sora",
                  marginTop: 4,
                  color: theme.colors.onSurfaceVariant,
                }}
              >
                ${parseFloat(price || "0").toFixed(2)}
              </Text>
              <Icon
                name="chevron-forward"
                size={20}
                color={theme.colors.onSurface}
                style={{ marginLeft: 12 }}
              />
            </View>
          </TouchableOpacity>

          <View style={styles.buttonRow}>
            <Button
              onPress={onDismiss}
              textColor={theme.colors.error}
              mode="text"
              labelStyle={{ fontFamily: "Sora" }}
            >
              Cancel
            </Button>
            <Button
              onPress={handleModalConfirm}
              textColor={"#fff"}
              mode="contained"
              labelStyle={{ fontFamily: "Sora" }}
              style={{ backgroundColor: theme.colors.primary }}
            >
              Confirm
            </Button>
          </View>

          <View style={styles.footnoteContainer}>
            <Text
              style={[
                styles.footnote,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {`1. Limit how many ${unitPlural.toLowerCase()} each player can select. The default value is ${defaultMax}`}
            </Text>
            <Text
              style={[
                styles.footnote,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {`2. Add a dollar value per ${unit.toLowerCase()} to track player totals.`}
            </Text>
          </View>
        </Animated.View>
      </Portal>

      {/* Price Picker Modal - keeping as centered modal since it's a sub-modal */}
      <Portal>
        {pricePickerVisible && (
          <TouchableWithoutFeedback onPress={() => setPricePickerVisible(false)}>
            <View style={styles.backdrop} />
          </TouchableWithoutFeedback>
        )}
        <Animated.View
          pointerEvents={pricePickerVisible ? "auto" : "none"}
          style={[
            styles.pickerContainer,
            {
              backgroundColor: theme.colors.surface,
              opacity: pricePickerVisible ? 1 : 0,
            },
          ]}
        >
          <Text
            style={{ fontFamily: "SoraBold", fontSize: 16, marginBottom: 8, color: theme.colors.onSurface }}
          >
            {`Select Price Per ${unit}`}
          </Text>
          <View
            style={{
              height: 1,
              backgroundColor:
                theme.colors.outlineVariant || (theme.dark ? "#333" : "#eee"),
              marginBottom: 20,
            }}
          />

          <View
            style={{
              borderRadius: 8,
              overflow: "hidden",
              backgroundColor: theme.colors.surface,
              marginBottom: 20,
            }}
          >
            <Picker
              key={tempPrice}
              selectedValue={tempPrice}
              onValueChange={(itemValue) => {
                const value = itemValue.toString();
                setTempPrice(value);
              }}
              style={{
                height: 150,
                color: theme.colors.onSurface,
              }}
              dropdownIconColor={theme.colors.onSurfaceVariant}
            >
              {Array.from({ length: 201 }, (_, i) => {
                const value = (i * 0.5).toFixed(2);
                const pickerTextColor = theme.dark
                  ? theme.colors.onSurface
                  : theme.colors.primary;

                return (
                  <Picker.Item
                    key={value}
                    label={`$${value}`}
                    value={value}
                    color={pickerTextColor}
                  />
                );
              })}
            </Picker>
          </View>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              marginTop: 16,
            }}
          >
            <Button
              onPress={() => setPricePickerVisible(false)}
              textColor={theme.colors.error}
            >
              Cancel
            </Button>
            <Button
              onPress={() => {
                setPrice(tempPrice);
                setPricePickerVisible(false);
              }}
              textColor={"#fff"}
              mode="contained"
              style={{
                backgroundColor: theme.colors.primary,
                marginLeft: 8,
              }}
            >
              Confirm
            </Button>
          </View>
        </Animated.View>
      </Portal>
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
    maxHeight: "70%",
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
  pickerContainer: {
    position: "absolute",
    top: "30%",
    left: 16,
    right: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1.5,
    borderLeftWidth: 5,
    borderColor: "rgba(94, 96, 206, 0.4)",
    borderLeftColor: "#5E60CE",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
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
  input: {
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  footnoteContainer: {
    marginTop: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ccc",
  },
  footnote: {
    fontSize: 12,
    fontFamily: "Sora",
    marginTop: 4,
  },
});

export default PerSquareSettingsModal;
