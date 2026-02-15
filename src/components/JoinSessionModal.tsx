import React, { useState, useEffect, useRef } from "react";
import {
  Text,
  StyleSheet,
  View,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from "react-native";
import { Modal, Portal, TextInput, useTheme } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../utils/types";
import { supabase } from "../lib/supabase";
import { LinearGradient } from "expo-linear-gradient";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

const JoinSessionModal = ({ visible, onDismiss }) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [sessionCode, setSessionCode] = useState("");
  const [loadingSession, setLoadingSession] = useState(false);
  const [error, setError] = useState("");
  const theme = useTheme();
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
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
    } else {
      setSessionCode("");
      setError("");
      setLoadingSession(false);
    }
  }, [visible]);

  const handleJoin = async () => {
    const trimmedCode = sessionCode.trim();

    if (!trimmedCode) {
      setError("Please enter a session code");
      return;
    }

    setLoadingSession(true);
    try {
      const { data, error: fetchError } = await supabase
        .from("squares")
        .select("title, deadline, players")
        .eq("id", trimmedCode)
        .single();

      if (fetchError || !data) {
        if (fetchError?.code === "PGRST116") {
          setError("Session not found. Please check the code and try again.");
        } else if (
          fetchError?.message?.includes("invalid input syntax for type uuid")
        ) {
          setError("Invalid session code format. Please check and try again.");
        } else {
          setError(
            "Unable to find that session. Please verify the session code.",
          );
        }
        return;
      }

      const usedColors = data.players?.map((p) => p.color) || [];

      onDismiss();
      navigation.navigate("JoinSquareScreen", {
        gridId: trimmedCode,
        inputTitle: data.title,
        deadline: data.deadline,
        usedColors,
      });
    } catch (err) {
      console.error("Join session error:", err);
      setError("An error occurred while joining. Please try again.");
    } finally {
      setLoadingSession(false);
    }
  };

  const isDark = theme.dark;

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
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
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
                <MaterialIcons name="group-add" size={28} color="#fff" />
              </View>
              <Text style={styles.headerTitle}>Join a Session</Text>
              <Text style={styles.headerSub}>
                Enter the session code to join
              </Text>
            </LinearGradient>

            {/* Body */}
            <View style={styles.body}>
              <TextInput
                label="Session Code"
                mode="outlined"
                value={sessionCode}
                onChangeText={(text) => {
                  setSessionCode(text);
                  setError("");
                }}
                autoCapitalize="none"
                autoCorrect={false}
                style={[
                  styles.input,
                  { backgroundColor: isDark ? "#1a1a2e" : "#fff" },
                ]}
                outlineStyle={{ borderRadius: 12 }}
                left={<TextInput.Icon icon="key-variant" />}
              />

              {error ? (
                <View style={styles.errorRow}>
                  <MaterialIcons
                    name="error-outline"
                    size={16}
                    color="#ef5350"
                  />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                onPress={handleJoin}
                disabled={loadingSession}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={
                    loadingSession ? ["#999", "#888"] : ["#6C63FF", "#4834DF"]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.joinButton}
                >
                  {loadingSession ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <MaterialIcons name="login" size={20} color="#fff" />
                      <Text style={styles.joinButtonText}>Join Session</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Invite hint */}
              <View style={styles.hintRow}>
                <MaterialIcons
                  name="mail-outline"
                  size={15}
                  color={isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.35)"}
                />
                <Text
                  style={[
                    styles.hintText,
                    {
                      color: isDark
                        ? "rgba(255,255,255,0.4)"
                        : "rgba(0,0,0,0.35)",
                    },
                  ]}
                >
                  Have an invite?{" "}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    onDismiss();
                    navigation.navigate("ProfileScreen" as any);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                >
                  <Text style={styles.hintLink}>Check your Profile</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </Modal>
    </Portal>
  );
};

export default JoinSessionModal;

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
  },
  input: {
    marginBottom: 12,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  errorText: {
    color: "#ef5350",
    fontSize: 13,
    flex: 1,
  },
  joinButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: 14,
    gap: 8,
    marginTop: 4,
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    gap: 4,
  },
  hintText: {
    fontSize: 13,
  },
  hintLink: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6C63FF",
  },
});
