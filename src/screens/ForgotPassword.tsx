import React, { useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useColorScheme,
  ActivityIndicator,
} from "react-native";
import { TextInput as PaperInput, useTheme } from "react-native-paper";
import { supabase } from "../lib/supabase";
import colors from "../../assets/constants/colorOptions";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesome } from "@expo/vector-icons";

// Basic email regex — catches clearly invalid inputs before hitting the network.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Seconds the user must wait before resending.
const RESEND_COOLDOWN = 30;

type UIState = "idle" | "loading" | "success";

const mapSupabaseError = (message: string): string => {
  const m = message.toLowerCase();
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (m.includes("invalid") || m.includes("not found") || m.includes("user")) {
    // Supabase does not distinguish "no account" from success for security reasons.
    // Return a neutral message — never reveal whether an account exists.
    return "If that email is registered, a reset link is on its way.";
  }
  if (m.includes("network") || m.includes("fetch") || m.includes("connect")) {
    return "Connection issue. Check your network and try again.";
  }
  return "Something went wrong. Please try again.";
};

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState(""); // inline input error
  const [submitError, setSubmitError] = useState(""); // below-button error
  const [uiState, setUiState] = useState<UIState>("idle");

  // Resend cooldown
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const theme = useTheme();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const gradientColors = useMemo(
    () =>
      theme.dark
        ? (["#121212", "#1d1d1d", "#2b2b2d"] as const)
        : (["#fdfcf9", "#e0e7ff"] as const),
    [theme.dark],
  );

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const validate = (): boolean => {
    const trimmed = email.trim();
    if (!trimmed) {
      setFieldError("Email is required.");
      return false;
    }
    if (!EMAIL_RE.test(trimmed)) {
      setFieldError("Enter a valid email address.");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    setFieldError("");
    setSubmitError("");

    if (!validate()) return;
    if (uiState === "loading") return;

    const trimmedEmail = email.trim().toLowerCase();
    setUiState("loading");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: "squaresgame://reset-password",
      });

      if (error) {
        console.error("[ForgotPassword] Supabase error:", error.message);

        // Rate-limit is the only error worth surfacing distinctly.
        const mapped = mapSupabaseError(error.message);

        // If the mapped message is the neutral "if registered" copy, treat as
        // a soft success (Supabase returns an error for unknown emails but we
        // do not want to leak that information to the user).
        if (mapped.startsWith("If that email")) {
          setUiState("success");
          startCooldown();
        } else {
          setSubmitError(mapped);
          setUiState("idle");
        }
        return;
      }

      // Genuine success
      console.log("[ForgotPassword] Reset email sent to:", trimmedEmail);
      setUiState("success");
      startCooldown();
    } catch (e: any) {
      console.error("[ForgotPassword] Unexpected error:", e);
      const msg =
        e?.message?.toLowerCase().includes("network") ||
        e?.message?.toLowerCase().includes("fetch")
          ? "Connection issue. Check your network and try again."
          : "Something went wrong. Please try again.";
      setSubmitError(msg);
      setUiState("idle");
    }
  };

  const handleResend = () => {
    if (cooldown > 0) return;
    setUiState("idle");
    setSubmitError("");
    // Keep email populated so user doesn't have to retype.
    handleSubmit();
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Image
            source={require("../../assets/icons/My_Squares_new_logo_transparent1.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={[styles.title, { color: theme.colors.onBackground }]}>
            Forgot Your Password?
          </Text>

          {uiState === "success" ? (
            /* ── Success state ─────────────────────────────────────────── */
            <View style={[styles.successBox, { backgroundColor: isDark ? "#113311" : "#d6f5d6" }]}>
              <FontAwesome
                name="envelope"
                size={28}
                color={isDark ? "#99ff99" : "#006600"}
                style={{ marginBottom: 10 }}
              />
              <Text style={[styles.successTitle, { color: isDark ? "#99ff99" : "#006600" }]}>
                Check your email
              </Text>
              <Text style={[styles.successBody, { color: isDark ? "#88cc88" : "#228822" }]}>
                We sent a password reset link to{" "}
                <Text style={{ fontFamily: "Rubik_600SemiBold" }}>{email.trim().toLowerCase()}</Text>.
                {"\n\n"}
                If it doesn't arrive within a minute, check your spam folder.
              </Text>

              {/* Resend */}
              <TouchableOpacity
                onPress={handleResend}
                disabled={cooldown > 0}
                style={[styles.resendButton, cooldown > 0 && { opacity: 0.45 }]}
              >
                <Text style={[styles.resendText, { color: isDark ? "#99ff99" : "#006600" }]}>
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}
                </Text>
              </TouchableOpacity>

              {/* Back to login */}
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <FontAwesome name="arrow-left" size={14} color={colors.primary} />
                <Text style={styles.backButtonText}>Back to Login</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* ── Idle / Loading state ──────────────────────────────────── */
            <>
              <PaperInput
                label="Email"
                mode="outlined"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setFieldError("");
                  setSubmitError("");
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                error={!!fieldError}
                style={[styles.input, { backgroundColor: "transparent" }]}
                theme={{
                  colors: {
                    primary: fieldError ? theme.colors.error : colors.primary,
                    text: isDark ? "#fff" : "#000",
                    placeholder: isDark ? "#aaa" : "#666",
                  },
                }}
              />

              {/* Inline field error */}
              {!!fieldError && (
                <Text style={[styles.inlineError, { color: theme.colors.error }]}>
                  {fieldError}
                </Text>
              )}

              {/* Submit-level error */}
              {!!submitError && (
                <View
                  style={[
                    styles.messageBox,
                    { backgroundColor: isDark ? "#331111" : "#ffe6e6" },
                  ]}
                >
                  <Text style={{ color: isDark ? "#ff6666" : "#cc0000", textAlign: "center" }}>
                    {submitError}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.button, uiState === "loading" && { opacity: 0.65 }]}
                onPress={handleSubmit}
                disabled={uiState === "loading"}
              >
                {uiState === "loading" ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Send Reset Link</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <FontAwesome name="arrow-left" size={16} color={colors.primary} />
                <Text style={styles.backButtonText}>Back to Login</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    marginTop: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
    fontFamily: "Rubik_600SemiBold",
  },
  logo: {
    width: 250,
    height: 250,
    alignSelf: "center",
    marginBottom: -30,
  },
  input: {
    marginBottom: 4,
  },
  inlineError: {
    fontSize: 12,
    fontFamily: "Rubik_400Regular",
    marginBottom: 12,
    marginLeft: 4,
  },
  messageBox: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 16,
    marginTop: 4,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
    fontFamily: "Rubik_500Medium",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 6,
    fontFamily: "Rubik_400Regular",
  },
  // Success state
  successBox: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  successTitle: {
    fontSize: 20,
    fontFamily: "Rubik_600SemiBold",
    marginBottom: 10,
    textAlign: "center",
  },
  successBody: {
    fontSize: 14,
    fontFamily: "Rubik_400Regular",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  resendButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  resendText: {
    fontSize: 14,
    fontFamily: "Rubik_500Medium",
  },
});

export default ForgotPasswordScreen;
