import React, { useEffect, useState } from "react";
import { View, StyleSheet, Platform, Pressable } from "react-native";
import { Modal, Portal, Text, Button, useTheme } from "react-native-paper";
import Constants from "expo-constants";
import DatePicker from "react-native-date-picker";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import colors from "../../assets/constants/colorOptions";

interface Props {
  visible: boolean;
  onDismiss: () => void;
  date: Date;
  onConfirm: (date: Date) => void;
}

const isExpoGo = Constants.appOwnership === "expo";

const DeadlinePickerModal = ({
  visible,
  onDismiss,
  date,
  onConfirm,
}: Props) => {
  const theme = useTheme();
  const [tempDate, setTempDate] = useState(date);
  const [mode, setMode] = useState<"date" | "time">("date");
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (visible) {
      setTempDate(date);
    }
  }, [visible, date]);

  const handleConfirm = (selected: Date) => {
    setShowPicker(false);
    setTempDate((prev) =>
      mode === "date"
        ? new Date(selected.setHours(prev.getHours(), prev.getMinutes()))
        : new Date(prev.setHours(selected.getHours(), selected.getMinutes()))
    );
  };

  const handleModalConfirm = () => {
    onConfirm(tempDate);
    onDismiss();
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
            onPress={() => {
              setMode("date");
              setShowPicker(true);
            }}
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

          <Pressable
            onPress={() => {
              setMode("time");
              setShowPicker(true);
            }}
            style={[
              styles.inputBox,
              {
                borderColor: theme.colors.outline,
                backgroundColor: theme.colors.elevation.level1,
              },
            ]}
          >
            <Text style={{ fontFamily: "Sora", color: theme.colors.onSurface }}>
              {tempDate.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </Pressable>
        </View>

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
          >
            Confirm
          </Button>
        </View>
      </Modal>

      {isExpoGo ? (
        <>
          <DateTimePickerModal
            isVisible={showPicker && mode === "date"}
            mode="date"
            date={tempDate}
            onConfirm={(pickedDate) => {
              setShowPicker(false);
              setTempDate(
                (prev) =>
                  new Date(
                    pickedDate.setHours(prev.getHours(), prev.getMinutes())
                  )
              );
            }}
            onCancel={() => setShowPicker(false)}
            themeVariant={theme.dark ? "dark" : "light"}
            display={Platform.OS === "ios" ? "inline" : "default"}
          />

          <DateTimePickerModal
            isVisible={showPicker && mode === "time"}
            mode="time"
            date={tempDate}
            onConfirm={(pickedTime) => {
              setShowPicker(false);
              setTempDate(
                (prev) =>
                  new Date(
                    prev.setHours(
                      pickedTime.getHours(),
                      pickedTime.getMinutes()
                    )
                  )
              );
            }}
            onCancel={() => setShowPicker(false)}
            themeVariant={theme.dark ? "dark" : "light"}
            display={Platform.OS === "ios" ? "spinner" : "default"}
          />
        </>
      ) : (
        <DatePicker
          modal
          open={showPicker}
          mode={mode}
          date={tempDate}
          onConfirm={handleConfirm}
          onCancel={() => setShowPicker(false)}
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
  inputRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    gap: 12,
  },
  inputBox: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
});

export default DeadlinePickerModal;
