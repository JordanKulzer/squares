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
import { NotificationSettings } from "../utils/notificationTypes";

interface NotificationSettingsModalProps {
  visible: boolean;
  onDismiss: () => void;
  settings: NotificationSettings;
  onSave: (settings: NotificationSettings) => void;
  userId?: string;
}

const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  visible,
  onDismiss,
  settings,
  onSave,
}) => {
  const theme = useTheme();
  const [localSettings, setLocalSettings] = useState<NotificationSettings>({
    deadlineReminders: false,
    quarterResults: false,
    playerJoined: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const originalSettings = useRef<NotificationSettings | null>(null);
  const slideAnim = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (settings) {
      setLocalSettings(
        settings || {
          deadlineReminders: false,
          quarterResults: false,
          playerJoined: false,
        }
      );
    }
  }, [settings]);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : 600,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  useEffect(() => {
    if (visible && settings) {
      originalSettings.current = settings;
      setLocalSettings(settings);
    }
  }, [visible, settings]);

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
  const dividerColor = theme.dark ? "#333" : "#eee";

  return (
    <Portal>
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

      <Animated.View
        style={[
          styles.sheet,
          {
            transform: [{ translateY: slideAnim }],
            backgroundColor: surfaceColor,
            shadowColor: theme.colors.backdrop,
            borderLeftColor: theme.colors.primary,
            borderTopColor: theme.dark ? "#333" : "#ddd",
          },
        ]}
        pointerEvents={visible ? "auto" : "none"}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={[styles.title, { color: onSurfaceColor }]}>
            Notification Settings
          </Text>
          <View
            style={{
              height: 1,
              backgroundColor: dividerColor,
              marginBottom: 20,
            }}
          />
          <Text
            style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
          >
            Choose which alerts to receive
          </Text>

          {[
            { key: "quarterResults", label: "Quarter Results" },

            {
              key: "deadlineReminders",
              label:
                "Deadline Reminders (30 min, 5 min, and when deadline ends)",
            },
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
                  fontFamily: "Sora",
                }}
              >
                {localSettings[item.key] ? "On" : "Off"}
              </Chip>
            </View>
          ))}

          <View style={styles.footerRow}>
            <Button
              onPress={() => {
                if (originalSettings.current) {
                  setLocalSettings(originalSettings.current); // reset unsaved changes
                }
                onDismiss();
              }}
              textColor={theme.colors.error}
              labelStyle={{ fontFamily: "Sora" }}
            >
              Cancel
            </Button>

            <Button
              mode="contained"
              onPress={handleSave}
              loading={isSaving}
              disabled={isSaving}
              textColor={"#fff"}
              labelStyle={{ fontFamily: "Sora" }}
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
    bottom: -40,
    left: 0,
    right: 0,
    maxHeight: 525,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 75,
    elevation: 10,
    borderTopWidth: 1.5,
    borderLeftWidth: 5,
    borderRightWidth: 1.5,
    borderBottomWidth: 0,
    borderTopColor: "rgba(94, 96, 206, 0.4)",
    borderRightColor: "rgba(94, 96, 206, 0.4)",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 6,
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
    fontFamily: "SoraBold",
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
    fontFamily: "Sora",
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
    fontFamily: "Sora",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 24,
    gap: 12,
  },
});

export default NotificationSettingsModal;
