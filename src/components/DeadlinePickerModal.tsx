// src/components/DeadlinePickerModal.tsx
import React, { useState } from "react";
import { View, StyleSheet, Platform, Pressable } from "react-native";
import { Modal, Portal, Text, Button, useTheme } from "react-native-paper";
import DateTimePickerModal from "react-native-modal-datetime-picker";

interface Props {
  visible: boolean;
  onDismiss: () => void;
  date: Date;
  onConfirm: (date: Date) => void;
}

const DeadlinePickerModal = ({
  visible,
  onDismiss,
  date,
  onConfirm,
}: Props) => {
  const theme = useTheme();
  const [tempDate, setTempDate] = useState(date);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleDatePicked = (pickedDate: Date) => {
    setShowDatePicker(false);
    setTempDate(
      (prev) =>
        new Date(pickedDate.setHours(prev.getHours(), prev.getMinutes()))
    );
  };

  const handleTimePicked = (pickedTime: Date) => {
    setShowTimePicker(false);
    setTempDate(
      (prev) =>
        new Date(prev.setHours(pickedTime.getHours(), pickedTime.getMinutes()))
    );
  };

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
          Select Deadline
        </Text>

        <View style={styles.inputRow}>
          <Pressable
            onPress={() => setShowDatePicker(true)}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 8,
              borderColor: theme.colors.outline,
              borderWidth: 1,
              backgroundColor: theme.colors.elevation.level1,
            }}
          >
            <Text style={{ color: theme.colors.onSurface }}>
              {tempDate.toDateString()}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setShowTimePicker(true)}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 8,
              borderColor: theme.colors.outline,
              borderWidth: 1,
              backgroundColor: theme.colors.elevation.level1,
            }}
          >
            <Text style={{ color: theme.colors.onSurface }}>
              {tempDate.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </Pressable>
        </View>

        <View style={styles.buttonRow}>
          <Button onPress={onDismiss} mode="text">
            Cancel
          </Button>
          <Button
            onPress={() => {
              onConfirm(tempDate);
              onDismiss();
            }}
            mode="contained"
          >
            Confirm
          </Button>
        </View>

        <DateTimePickerModal
          isVisible={showDatePicker}
          mode="date"
          date={tempDate}
          onConfirm={handleDatePicked}
          onCancel={() => setShowDatePicker(false)}
          themeVariant={theme.dark ? "dark" : "light"}
        />

        <DateTimePickerModal
          isVisible={showTimePicker}
          mode="time"
          date={tempDate}
          onConfirm={handleTimePicked}
          onCancel={() => setShowTimePicker(false)}
          themeVariant={theme.dark ? "dark" : "light"}
        />
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 20,
    padding: 20,
    borderRadius: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    gap: 12,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
});

export default DeadlinePickerModal;
