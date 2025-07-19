import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Pressable,
} from "react-native";
import DatePicker from "react-native-date-picker";
import {
  Modal,
  Portal,
  Button,
  useTheme,
  TextInput as PaperInput,
} from "react-native-paper";
import { supabase } from "../lib/supabase";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { sendGameUpdateNotification } from "../utils/notifications";

const EditGameModal = ({
  visible,
  onDismiss,
  gridId,
  currentTeam1,
  currentTeam2,
  currentScores,
  triggerRefresh,
  currentDeadline,
  currentTitle,
}: {
  visible: boolean;
  onDismiss: () => void;
  gridId: string;
  currentTeam1: string;
  currentTeam2: string;
  currentScores: {
    quarter: string;
    home: number | null;
    away: number | null;
  }[];
  triggerRefresh: () => void;
  currentDeadline: string | null;
  currentTitle: string;
}) => {
  const theme = useTheme();
  const [team1, setTeam1] = useState(currentTeam1);
  const [team2, setTeam2] = useState(currentTeam2);
  const [quarterScores, setQuarterScores] = useState(
    currentScores ?? [
      { quarter: "1Q", home: null, away: null },
      { quarter: "2Q", home: null, away: null },
      { quarter: "3Q", home: null, away: null },
      { quarter: "4Q", home: null, away: null },
    ]
  );
  const [deadline, setDeadline] = useState<Date>(
    currentDeadline ? new Date(currentDeadline) : new Date()
  );
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<"date" | "time">("date");
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [title, setTitle] = useState(currentTitle);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    setTeam1(currentTeam1);
    setTeam2(currentTeam2);
    setTitle(currentTitle);
    setDeadline(new Date(currentDeadline));
    const isValidScores =
      Array.isArray(currentScores) && currentScores.length === 4;

    setQuarterScores(
      isValidScores
        ? currentScores
        : [
            { quarter: "1Q", home: null, away: null },
            { quarter: "2Q", home: null, away: null },
            { quarter: "3Q", home: null, away: null },
            { quarter: "4Q", home: null, away: null },
          ]
    );
  }, [currentTeam1, currentTeam2, currentScores, currentDeadline]);

  const handleScoreChange = (
    index: number,
    field: "home" | "away",
    value: string
  ) => {
    const updated = [...quarterScores];
    updated[index][field] = value === "" ? null : parseInt(value, 10);
    setQuarterScores(updated);
  };

  const handleSave = async () => {
    const sanitizedScores = quarterScores.map((q) => {
      const homeValid = typeof q.home === "number" && !isNaN(q.home);
      const awayValid = typeof q.away === "number" && !isNaN(q.away);

      return {
        quarter: q.quarter,
        home: homeValid ? q.home : null,
        away: awayValid ? q.away : null,
      };
    });

    const hasChanges =
      title !== currentTitle ||
      team1 !== currentTeam1 ||
      team2 !== currentTeam2 ||
      JSON.stringify(sanitizedScores) !== JSON.stringify(currentScores) ||
      deadline.toISOString() !== currentDeadline;
    if (!hasChanges) {
      onDismiss();
      return;
    }

    const { error } = await supabase
      .from("squares")
      .update({
        title,
        team1,
        team2,
        quarter_scores: sanitizedScores,
        deadline: deadline.toISOString(),
      })
      .eq("id", gridId);

    if (error) {
      console.warn("Error saving game info:", error);
      return;
    }

    await sendGameUpdateNotification(gridId);
    triggerRefresh();
    onDismiss();
  };

  const dividerColor = theme.dark ? "#333" : "#eee";

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={{
          backgroundColor: theme.colors.surface,
          marginHorizontal: 24,
          padding: 20,
          borderRadius: 16,
          borderWidth: 1.5,
          borderLeftWidth: 5,
          borderLeftColor: theme.colors.primary,
          borderColor: "rgba(94, 96, 206, 0.4)",
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                marginBottom: 12,
                color: theme.colors.onSurface,
                fontFamily: "SoraBold",
              }}
            >
              Edit Game Information
            </Text>

            <View
              style={{
                height: 1,
                backgroundColor: dividerColor,
                marginBottom: 20,
              }}
            />
            <PaperInput
              label="Game Title"
              value={title}
              onChangeText={setTitle}
              mode="outlined"
              style={{ marginBottom: 12 }}
              theme={{ colors: { onSurface: theme.colors.onSurface } }}
            />

            <PaperInput
              label="Home Team"
              value={team1}
              onChangeText={setTeam1}
              mode="outlined"
              style={{ marginBottom: 12 }}
              theme={{ colors: { onSurface: theme.colors.onSurface } }}
            />
            <PaperInput
              label="Away Team"
              value={team2}
              onChangeText={setTeam2}
              mode="outlined"
              style={{ marginBottom: 20 }}
              theme={{ colors: { onSurface: theme.colors.onSurface } }}
            />
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                marginBottom: 12,
                color: theme.colors.onSurface,
                fontFamily: "SoraBold",
              }}
            >
              Edit Scores
            </Text>

            {Array.isArray(quarterScores) &&
              quarterScores.map((q, i) => (
                <View key={i} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <PaperInput
                      label={`${team1 || "Home Team"} ${q.quarter}`}
                      keyboardType="numeric"
                      value={q.home?.toString() ?? ""}
                      onChangeText={(v) => handleScoreChange(i, "home", v)}
                      mode="outlined"
                      style={{ flex: 1, marginRight: 8 }}
                      theme={{ colors: { onSurface: theme.colors.onSurface } }}
                    />
                    <PaperInput
                      label={`${team2 || "Away Team"} ${q.quarter}`}
                      keyboardType="numeric"
                      value={q.away?.toString() ?? ""}
                      onChangeText={(v) => handleScoreChange(i, "away", v)}
                      mode="outlined"
                      style={{ flex: 1 }}
                      theme={{ colors: { onSurface: theme.colors.onSurface } }}
                    />
                  </View>
                </View>
              ))}
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                marginBottom: 12,
                color: theme.colors.onSurface,
                fontFamily: "SoraBold",
              }}
            >
              Change Deadline
            </Text>

            <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
              <Pressable
                onPress={() => {
                  setPickerMode("date");
                  setShowDeadlinePicker(true);
                }}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: theme.dark ? "rgba(94, 96, 206, 0.4)" : "#ccc",
                  backgroundColor: theme.colors.elevation.level1,
                }}
              >
                <Text
                  style={{ fontFamily: "Sora", color: theme.colors.onSurface }}
                >
                  {deadline.toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setPickerMode("time");
                  setShowDeadlinePicker(true);
                }}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: theme.dark ? "rgba(94, 96, 206, 0.4)" : "#ccc",
                  backgroundColor: theme.colors.elevation.level1,
                }}
              >
                <Text
                  style={{ fontFamily: "Sora", color: theme.colors.onSurface }}
                >
                  {deadline.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </Pressable>
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              <Button
                mode="text"
                onPress={onDismiss}
                textColor={theme.colors.error}
              >
                Cancel
              </Button>
              <Button mode="contained" onPress={handleSave}>
                Save
              </Button>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
        {isKeyboardVisible && (
          <View
            pointerEvents="box-none"
            style={{
              position: "absolute",
              bottom: Platform.OS === "ios" ? 275 : 100,
              right: 0,
              top: 40,
              borderRadius: 24,
              paddingVertical: 6,
              paddingHorizontal: 16,
              shadowColor: "#000",
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 5,
            }}
          >
            <Button
              icon="keyboard-off-outline"
              mode="contained-tonal"
              compact
              onPress={Keyboard.dismiss}
              style={{
                borderRadius: 20,
                paddingHorizontal: 12,
                alignSelf: "flex-end",
              }}
              labelStyle={{
                fontFamily: "Sora",
                fontWeight: "600",
                textTransform: "none",
                fontSize: 13,
                color: theme.colors.primary,
              }}
            >
              Hide Keyboard
            </Button>
          </View>
        )}
      </Modal>
      {Platform.OS === "ios" ? (
        <DateTimePickerModal
          isVisible={showDeadlinePicker}
          mode={pickerMode}
          date={deadline}
          onConfirm={(pickedDate) => {
            setShowDeadlinePicker(false);
            setDeadline((prev) => {
              if (pickerMode === "date") {
                return new Date(
                  pickedDate.getFullYear(),
                  pickedDate.getMonth(),
                  pickedDate.getDate(),
                  prev.getHours(),
                  prev.getMinutes()
                );
              } else {
                return new Date(
                  prev.getFullYear(),
                  prev.getMonth(),
                  prev.getDate(),
                  pickedDate.getHours(),
                  pickedDate.getMinutes()
                );
              }
            });
          }}
          onCancel={() => setShowDeadlinePicker(false)}
          themeVariant={theme.dark ? "dark" : "light"}
          display={Platform.OS === "ios" ? "spinner" : "default"}
        />
      ) : (
        <DatePicker
          modal
          open={showDeadlinePicker}
          mode={pickerMode}
          date={deadline}
          onConfirm={(pickedDate) => {
            setShowDeadlinePicker(false);
            setDeadline((prev) => {
              if (pickerMode === "date") {
                return new Date(
                  pickedDate.getFullYear(),
                  pickedDate.getMonth(),
                  pickedDate.getDate(),
                  prev.getHours(),
                  prev.getMinutes()
                );
              } else {
                return new Date(
                  prev.getFullYear(),
                  prev.getMonth(),
                  prev.getDate(),
                  pickedDate.getHours(),
                  pickedDate.getMinutes()
                );
              }
            });
          }}
          onCancel={() => setShowDeadlinePicker(false)}
          theme={theme.dark ? "dark" : "light"}
        />
      )}
    </Portal>
  );
};

export default EditGameModal;
