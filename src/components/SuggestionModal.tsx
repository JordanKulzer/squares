import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ScrollView,
} from "react-native";
import { Portal, Button, TextInput, useTheme, Chip } from "react-native-paper";
import { supabase } from "../lib/supabase";
import Toast from "react-native-toast-message";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface SuggestionModalProps {
  visible: boolean;
  onDismiss: () => void;
}

type SuggestionRank = "minor" | "major" | "critical";

const rankLabel: Record<SuggestionRank, string> = {
  minor: "Minor",
  major: "Major",
  critical: "Critical",
};

const SuggestionModal: React.FC<SuggestionModalProps> = ({
  visible,
  onDismiss,
}) => {
  const theme = useTheme();
  const slideAnim = useRef(new Animated.Value(600)).current;
  const insets = useSafeAreaInsets();
  const { height: screenH } = Dimensions.get("window");

  const [suggestion, setSuggestion] = useState("");
  const [email, setEmail] = useState("");
  const [rank, setRank] = useState<SuggestionRank>("major");
  const [submitting, setSubmitting] = useState(false);

  const SHEET_HEIGHT = Math.min(screenH * 0.65, 640);
  const FOOTER_H = 64;
  const scrollBottomPad = FOOTER_H + insets.bottom + 14;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : 600,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [visible, slideAnim]);

  useEffect(() => {
    const fetchUserEmail = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) setEmail(user.email);
    };

    if (visible) fetchUserEmail();
  }, [visible]);

  const handleSubmit = async () => {
    const trimmed = suggestion.trim();
    if (!trimmed) {
      Toast.show({
        type: "error",
        text1: "Please enter a suggestion",
        position: "bottom",
        bottomOffset: 60,
      });
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase.from("suggestions").insert([
        {
          user_id: user?.id ?? null,
          email: email || null,
          suggestion: trimmed,
          rank,
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;

      Toast.show({
        type: "info",
        text1: "Thank you for your feedback!",
        text2: "We’ll review your suggestion soon.",
        position: "bottom",
        bottomOffset: 60,
      });

      setSuggestion("");
      setRank("major");
      onDismiss();
    } catch (err) {
      console.error("Error submitting suggestion:", err);
      Toast.show({
        type: "error",
        text1: "Failed to submit",
        text2: "Please try again later",
        position: "bottom",
        bottomOffset: 60,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const dividerColor = theme.dark ? "#333" : "#E6E6E6";

  const selectedChipStyle = (selected: boolean) => ({
    backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
    borderColor: selected ? theme.colors.primary : theme.colors.outline,
  });

  const selectedChipTextColor = (selected: boolean) =>
    selected ? "#fff" : theme.colors.onSurface;

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
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.dark ? "#333" : "#ddd",
            shadowColor: "#000",
            height: SHEET_HEIGHT,
          },
        ]}
        pointerEvents={visible ? "auto" : "none"}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <View style={{ flex: 1 }}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: scrollBottomPad },
              ]}
            >
              <Text style={[styles.title, { color: theme.colors.onSurface }]}>
                Send Us A Suggestion!
              </Text>

              <View
                style={{
                  height: 1,
                  backgroundColor: dividerColor,
                  marginBottom: 8,
                }}
              />

              <Text
                style={[
                  styles.subtitle,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                We’d love to hear your ideas for improving My Squares!
              </Text>

              <View style={styles.guidance}>
                <Text
                  style={[
                    styles.guidanceText,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  • What were you trying to do?
                </Text>
                <Text
                  style={[
                    styles.guidanceText,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  • What would make it better?
                </Text>
                <Text
                  style={[
                    styles.guidanceText,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  • What went wrong?
                </Text>
              </View>

              <TextInput
                label="Your suggestion"
                mode="outlined"
                value={suggestion}
                onChangeText={setSuggestion}
                multiline
                style={[styles.input, styles.textArea]}
                placeholder="Describe what feels missing or frustrating about the app…"
                outlineColor={theme.colors.outline}
                activeOutlineColor={theme.colors.primary}
              />

              <View
                style={{
                  height: 1,
                  backgroundColor: dividerColor,
                  marginTop: 8,
                }}
              />

              <View style={styles.rankSection}>
                <Text
                  style={[
                    styles.rankLabel,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  How important is this?
                </Text>

                <View style={styles.rankRow}>
                  {(["minor", "major", "critical"] as SuggestionRank[]).map(
                    (v) => {
                      const selected = rank === v;
                      return (
                        <Chip
                          key={v}
                          compact
                          mode="outlined"
                          selected={selected}
                          onPress={() => setRank(v)}
                          style={[styles.rankChip, selectedChipStyle(selected)]}
                          textStyle={{
                            color: selectedChipTextColor(selected),
                            fontWeight: "600",
                          }}
                        >
                          {rankLabel[v]}
                        </Chip>
                      );
                    }
                  )}
                </View>
              </View>
            </ScrollView>

            <View
              style={[
                styles.footerRow,
                {
                  borderTopColor: dividerColor,
                  paddingBottom: insets.bottom + 12,
                },
              ]}
            >
              <Button
                onPress={onDismiss}
                textColor={theme.colors.error}
                disabled={submitting}
                labelStyle={{ fontFamily: "Sora" }}
              >
                Cancel
              </Button>

              <Button
                mode="contained"
                onPress={handleSubmit}
                loading={submitting}
                disabled={submitting || !suggestion.trim()}
                buttonColor={theme.colors.primary}
                textColor="#fff"
                labelStyle={{ fontFamily: "Sora" }}
              >
                Submit
              </Button>
            </View>
          </View>
        </KeyboardAvoidingView>
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
    bottom: -10,
    left: 0,
    right: 0,
    //height: SHEET_HEIGHT, // tighter than 75% — less dead space
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    elevation: 10,
    borderTopWidth: 1.5,
    borderLeftWidth: 5,
    borderRightWidth: 1.5,
    borderBottomWidth: 0,
    borderTopColor: "rgba(94, 96, 206, 0.4)",
    borderRightColor: "rgba(94, 96, 206, 0.4)",
    borderLeftColor: "rgba(94, 96, 206, 0.9)",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 6,
  },
  content: {
    paddingBottom: 18,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 6,
    fontFamily: "SoraBold",
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 12,
    fontFamily: "Sora",
  },
  guidance: {
    marginBottom: 18,
  },
  guidanceText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Sora",
  },
  input: {
    marginBottom: 14,
  },
  scrollContent: {
    paddingBottom: 0,
  },

  textArea: {
    minHeight: 140,
    maxHeight: 220,
    marginBottom: 14,
  },
  rankSection: {
    paddingTop: 12,
    paddingBottom: 12,
  },
  rankLabel: {
    fontSize: 13,
    marginBottom: 10,
    fontFamily: "Sora",
  },
  rankRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: -4,
    marginTop: 4,
  },
  rankChip: {
    borderWidth: StyleSheet.hairlineWidth,
    marginHorizontal: 4,
    marginVertical: 4,
    paddingHorizontal: 12,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});

export default SuggestionModal;
