import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ScrollView,
  TouchableWithoutFeedback,
} from "react-native";
import { Portal, Chip, Button, useTheme } from "react-native-paper";

const NotificationSettingsModal = ({
  visible,
  onDismiss,
  settings,
  onSave,
}) => {
  const theme = useTheme();
  const [localSettings, setLocalSettings] = useState(settings || {});
  const [isSaving, setIsSaving] = useState(false);
  const slideAnim = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    setLocalSettings(
      settings || {
        deadlineReminders: false,
        quarterResults: false,
        playerJoined: false,
      }
    );
  }, [settings]);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : 600,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  const handleToggle = (key) => {
    setLocalSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = () => {
    setIsSaving(true);
    try {
      onSave(localSettings);
      onDismiss();
    } catch (err) {
      console.error("Error saving notification settings:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const surfaceColor = theme.colors.surface;
  const onSurfaceColor = theme.colors.onSurface;
  const outlineColor = theme.colors.outlineVariant;

  return (
    <Portal>
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View
          style={[
            styles.backdrop,
            {
              opacity: visible ? 1 : 0,
              pointerEvents: visible ? "auto" : "none",
            },
          ]}
        />
      </TouchableWithoutFeedback>

      {/* Animated Bottom Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            transform: [{ translateY: slideAnim }],
            backgroundColor: surfaceColor,
            shadowColor: theme.colors.backdrop,
            borderTopColor: theme.dark ? "#333" : "#ddd",
          },
        ]}
        pointerEvents={visible ? "auto" : "none"}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={[styles.title, { color: onSurfaceColor }]}>
            Notification Settings
          </Text>

          <Text
            style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
          >
            Choose which alerts to receive
          </Text>

          {[
            { key: "quarterResults", label: "Quarter Results" },
            { key: "deadlineReminders", label: "Deadline Reminders" },
            {
              key: "playerJoined",
              label: "Someone Joins My Session (Managers only)",
            },
          ].map((item) => (
            <View
              key={item.key}
              style={[styles.settingRow, { borderColor: outlineColor }]}
            >
              <Text style={[styles.settingLabel, { color: onSurfaceColor }]}>
                {item.label}
              </Text>
              <Chip
                mode="outlined"
                selected={localSettings[item.key]}
                onPress={() => handleToggle(item.key)}
                style={{
                  backgroundColor: localSettings[item.key]
                    ? theme.colors.primary
                    : theme.dark
                    ? "#2a2a2a"
                    : "#f0f0f0",
                  borderColor: theme.colors.outlineVariant,
                }}
                textStyle={{
                  color: localSettings[item.key]
                    ? "#FFF"
                    : theme.colors.onSurface,
                  fontWeight: "600",
                }}
              >
                {localSettings[item.key] ? "On" : "Off"}
              </Chip>
            </View>
          ))}

          <View style={styles.footerRow}>
            <Button
              onPress={onDismiss}
              textColor={theme.colors.onSurfaceVariant}
            >
              Cancel
            </Button>

            <Button
              mode="contained"
              onPress={handleSave}
              loading={isSaving}
              disabled={isSaving}
              textColor={"#fff"}
            >
              Save
            </Button>
          </View>
        </ScrollView>
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
  sheet: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    maxHeight: 480,
    borderTopWidth: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
    elevation: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingLabel: {
    fontSize: 15,
    flex: 1,
    marginRight: 10,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 24,
    gap: 12,
  },
});

export default NotificationSettingsModal;
