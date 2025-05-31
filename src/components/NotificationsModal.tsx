import { doc, getDoc, updateDoc } from "firebase/firestore";
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Modal, Portal, Button } from "react-native-paper";
import { db } from "../../firebaseConfig";

const NotificationSettingsModal = ({ visible, onDismiss, userId }) => {
  const [isSaving, setIsSaving] = useState(false);

  const [notifSettings, setNotifSettings] = useState({
    quarterResults: true,
    quarterWin: true,
    playerJoined: false,
  });

  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const docSnap = await getDoc(doc(db, "users", userId));
        if (docSnap.exists() && docSnap.data().notificationPreferences) {
          setNotifSettings(docSnap.data().notificationPreferences);
        }
      } catch (error) {
        console.error("Failed to load notification preferences:", error);
      }
    };

    loadPrefs();
  }, [userId]);

  const handleToggle = (key) => {
    setNotifSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateDoc(doc(db, "users", userId), {
        notificationPreferences: notifSettings,
      });
      onDismiss();
    } catch (err) {
      console.error("Error saving notification settings:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
      >
        <Text style={styles.modalTitle}>Notification Settings</Text>
        <Text style={styles.modalSubtitle}>Choose which alerts to receive</Text>

        {[
          { key: "quarterResults", label: "Quarter Results" },
          { key: "quarterWin", label: "When I Win a Quarter" },
          {
            key: "playerJoined",
            label: "Someone Joins My Session (Managers only)",
          },
        ].map((item) => (
          <View key={item.key} style={styles.settingItem}>
            <Text style={styles.settingLabel}>{item.label}</Text>
            <Button
              mode={notifSettings[item.key] ? "contained" : "outlined"}
              onPress={() => handleToggle(item.key)}
              compact
            >
              {notifSettings[item.key] ? "On" : "Off"}
            </Button>
          </View>
        ))}

        <View style={styles.modalButtonRow}>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button
            onPress={handleSave}
            mode="contained"
            loading={isSaving}
            disabled={isSaving}
          >
            Save
          </Button>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 12,
    marginHorizontal: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 15,
    color: "#666",
    marginBottom: 20,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  settingLabel: {
    fontSize: 16,
    width: "75%",
  },
  modalButtonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 20,
    gap: 12,
  },
});

export default NotificationSettingsModal;
