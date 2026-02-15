import React, { useEffect, useState, useRef } from "react";
import {
  View,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Text,
  Animated,
} from "react-native";
import { Modal, Portal, useTheme } from "react-native-paper";
import Constants from "expo-constants";
import DatePicker from "react-native-date-picker";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { LinearGradient } from "expo-linear-gradient";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

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
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const isDark = theme.dark;

  useEffect(() => {
    if (visible) {
      setTempDate(date);
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
      ]).start();
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
        contentContainerStyle={styles.modalOuter}
      >
        <Animated.View
          style={[
            styles.modalContainer,
            {
              backgroundColor: isDark ? "#1a1a2e" : "#fff",
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Close button */}
          <TouchableOpacity
            onPress={onDismiss}
            style={styles.closeButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <MaterialIcons
              name="close"
              size={22}
              color={isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.35)"}
            />
          </TouchableOpacity>

          {/* Header */}
          <LinearGradient
            colors={isDark ? ["#2d1b69", "#1a1a2e"] : ["#6C63FF", "#4834DF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <View style={styles.headerIcon}>
              <MaterialIcons name="schedule" size={28} color="#fff" />
            </View>
            <Text style={styles.headerTitle}>Set Deadline</Text>
            <Text style={styles.headerSub}>
              Choose when selections lock
            </Text>
          </LinearGradient>

          {/* Body */}
          <View style={styles.body}>
            {/* Date selector */}
            <TouchableOpacity
              onPress={() => {
                setMode("date");
                setShowPicker(true);
              }}
              style={[
                styles.selectorCard,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.03)",
                },
              ]}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.selectorIcon,
                  {
                    backgroundColor: isDark
                      ? "rgba(108,99,255,0.2)"
                      : "rgba(108,99,255,0.1)",
                  },
                ]}
              >
                <MaterialIcons name="calendar-today" size={20} color="#6C63FF" />
              </View>
              <View style={styles.selectorTextContainer}>
                <Text
                  style={[
                    styles.selectorLabel,
                    {
                      color: isDark
                        ? "rgba(255,255,255,0.5)"
                        : "rgba(0,0,0,0.45)",
                    },
                  ]}
                >
                  Date
                </Text>
                <Text
                  style={[
                    styles.selectorValue,
                    { color: isDark ? "#fff" : "#1a1a2e" },
                  ]}
                >
                  {tempDate.toDateString()}
                </Text>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={22}
                color={isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.25)"}
              />
            </TouchableOpacity>

            {/* Time selector */}
            <TouchableOpacity
              onPress={() => {
                setMode("time");
                setShowPicker(true);
              }}
              style={[
                styles.selectorCard,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.03)",
                },
              ]}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.selectorIcon,
                  {
                    backgroundColor: isDark
                      ? "rgba(108,99,255,0.2)"
                      : "rgba(108,99,255,0.1)",
                  },
                ]}
              >
                <MaterialIcons name="access-time" size={20} color="#6C63FF" />
              </View>
              <View style={styles.selectorTextContainer}>
                <Text
                  style={[
                    styles.selectorLabel,
                    {
                      color: isDark
                        ? "rgba(255,255,255,0.5)"
                        : "rgba(0,0,0,0.45)",
                    },
                  ]}
                >
                  Time
                </Text>
                <Text
                  style={[
                    styles.selectorValue,
                    { color: isDark ? "#fff" : "#1a1a2e" },
                  ]}
                >
                  {tempDate.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={22}
                color={isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.25)"}
              />
            </TouchableOpacity>

            {/* Confirm button */}
            <TouchableOpacity
              onPress={handleModalConfirm}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#6C63FF", "#4834DF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.confirmButton}
              >
                <MaterialIcons name="check" size={20} color="#fff" />
                <Text style={styles.confirmButtonText}>Set Deadline</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
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
            themeVariant={isDark ? "dark" : "light"}
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
            themeVariant={isDark ? "dark" : "light"}
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
          theme={isDark ? "dark" : "light"}
        />
      )}
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalOuter: {
    margin: 16,
  },
  modalContainer: {
    borderRadius: 24,
    overflow: "hidden",
  },
  closeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.3,
  },
  headerSub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    marginTop: 4,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    gap: 12,
  },
  selectorCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    gap: 14,
  },
  selectorIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  selectorTextContainer: {
    flex: 1,
  },
  selectorLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
  },
  selectorValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  confirmButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: 14,
    gap: 8,
    marginTop: 4,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
});

export default DeadlinePickerModal;
