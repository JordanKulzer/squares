// components/DateSelectorModal.tsx
import React, { useEffect, useState } from "react";
import { View, StyleSheet, Platform, Pressable } from "react-native";
import { Modal, Portal, Text, Button, useTheme } from "react-native-paper";
import DatePicker from "react-native-date-picker";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import Constants from "expo-constants";
import colors from "../../assets/constants/colorOptions";

interface Props {
  visible: boolean;
  onDismiss: () => void;
  date: Date;
  onConfirm: (date: Date) => void;
}

const isExpoGo = Constants.appOwnership === "expo";

const DateSelectorModal = ({ visible, onDismiss, date, onConfirm }: Props) => {
  const theme = useTheme();
  const [tempDate, setTempDate] = useState(date);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (visible) setTempDate(date);
  }, [visible, date]);

  const handleModalConfirm = () => {
    onConfirm(tempDate);
    onDismiss();
  };
  console.log("Theme primary color:", theme.colors.primary);

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.modal,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>
          Select Game Date
        </Text>

        <Pressable
          onPress={() => setShowPicker(true)}
          style={[
            styles.inputBox,
            {
              borderColor: theme.colors.outline,
              backgroundColor: theme.colors.elevation.level1,
            },
          ]}
        >
          <Text style={{ fontFamily: "Sora", color: theme.colors.onSurface }}>
            {tempDate.toDateString()}
          </Text>
        </Pressable>

        <View style={styles.buttonRow}>
          <Button
            onPress={onDismiss}
            labelStyle={{ fontFamily: "Sora" }}
            textColor={theme.colors.error}
          >
            Cancel
          </Button>
          <Button
            onPress={handleModalConfirm}
            textColor="#fff"
            mode="contained"
            buttonColor={colors.primary}
            labelStyle={{ fontFamily: "Sora" }}
          >
            Confirm
          </Button>
        </View>
      </Modal>

      {isExpoGo ? (
        <DateTimePickerModal
          isVisible={showPicker}
          mode="date"
          date={tempDate}
          onConfirm={(picked) => {
            setShowPicker(false);
            setTempDate(picked);
          }}
          onCancel={() => setShowPicker(false)}
          minimumDate={new Date()}
          display={Platform.OS === "ios" ? "inline" : "default"}
          themeVariant={theme.dark ? "dark" : "light"}
        />
      ) : (
        <DatePicker
          modal
          open={showPicker}
          mode="date"
          date={tempDate}
          onConfirm={(picked) => {
            setShowPicker(false);
            setTempDate(picked);
          }}
          onCancel={() => setShowPicker(false)}
          minimumDate={new Date()}
          theme={theme.dark ? "dark" : "light"}
        />
      )}
    </Portal>
  );
};

const styles = StyleSheet.create({
  modal: {
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
  title: {
    fontSize: 18,
    marginBottom: 16,
    fontFamily: "SoraBold",
  },
  inputBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
});

export default DateSelectorModal;
