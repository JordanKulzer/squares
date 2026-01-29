import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import {
  Modal,
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
  const [max, setMax] = useState(String(maxSelections || defaultMax));
  const [price, setPrice] = useState(String(pricePerSquare || "0.00"));
  const [pricePickerVisible, setPricePickerVisible] = useState(false);
  const [tempPrice, setTempPrice] = useState(price);

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

  return (
    <>
      <Portal>
        <Modal
          visible={visible}
          onDismiss={onDismiss}
          contentContainerStyle={[
            styles.modalContainer,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
            Per {unit} Settings
          </Text>

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
        </Modal>
      </Portal>
      <Portal>
        <Modal
          visible={pricePickerVisible}
          onDismiss={() => setPricePickerVisible(false)}
          contentContainerStyle={{
            backgroundColor: theme.colors.surface,
            borderRadius: 16,
            borderWidth: 1.5,
            borderColor: theme.dark ? "#444" : "#ccc",
            borderLeftWidth: 5,
            borderLeftColor: theme.colors.primary,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 6,
            marginHorizontal: 16,
            paddingVertical: 20,
            paddingHorizontal: 16,
          }}
        >
          <Text
            style={{ fontFamily: "SoraBold", fontSize: 16, marginBottom: 8 }}
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
        </Modal>
      </Portal>
    </>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    borderLeftWidth: 5,
    borderColor: "rgba(94, 96, 206, 0.4)",
    borderLeftColor: colors.primary,
    backgroundColor: colors.primaryBackground,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    marginBottom: 14,
    fontFamily: "SoraBold",
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
