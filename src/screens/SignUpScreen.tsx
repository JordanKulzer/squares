import React, { useMemo, useRef, useState } from "react";
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  View,
  useColorScheme,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { TextInput as PaperInput, useTheme } from "react-native-paper";
import { FontAwesome } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../lib/supabase";
import colors from "../../assets/constants/colorOptions";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const mapSignupError = (message: string): string => {
  const m = message.toLowerCase();
  if (m.includes("user already registered") || m.includes("already in use")) {
    return "An account with this email already exists.";
  }
  if (m.includes("email")) {
    return "Invalid email address.";
  }
  if (m.includes("password")) {
    return "Password must be at least 6 characters.";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Too many attempts. Please wait and try again.";
  }
  if (m.includes("network") || m.includes("fetch")) {
    return "Connection issue. Check your network and try again.";
  }
  return "Sign up failed. Please try again.";
};

type UIState = "idle" | "loading" | "success";

interface FieldErrors {
  username: string;
  email: string;
  password: string;
}

const SignupScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({ username: "", email: "", password: "" });
  const [submitError, setSubmitError] = useState("");
  const [uiState, setUiState] = useState<UIState>("idle");

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const theme = useTheme();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const gradientColors = useMemo(
    () =>
      theme.dark
        ? (["#121212", "#1d1d1d", "#2b2b2d"] as [string, string, ...string[]])
        : (["#fdfcf9", "#e0e7ff"] as [string, string]),
    [theme.dark],
  );

  const setFieldError = (field: keyof FieldErrors, msg: string) => {
    setFieldErrors((prev) => ({ ...prev, [field]: msg }));
  };
  const clearFieldError = (field: keyof FieldErrors) => {
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const checkUsernameAvailable = async (u: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id")
        .eq("username", u)
        .maybeSingle();
      if (error) return false;
      return !data;
    } catch {
      return false;
    }
  };

  const validateFields = (): boolean => {
    let valid = true;
    const u = username.trim();
    const e = email.trim();

    // Username
    if (!u) {
      setFieldError("username", "Username is required.");
      valid = false;
    } else if (u.length < 3) {
      setFieldError("username", "Username must be at least 3 characters.");
      valid = false;
    } else if (u.length > 20) {
      setFieldError("username", "Username must be 20 characters or less.");
      valid = false;
    } else if (!/^[a-zA-Z0-9_]+$/.test(u)) {
      setFieldError("username", "Only letters, numbers, and underscores allowed.");
      valid = false;
    } else {
      clearFieldError("username");
    }

    // Email
    if (!e) {
      setFieldError("email", "Email is required.");
      valid = false;
    } else if (!EMAIL_RE.test(e)) {
      setFieldError("email", "Enter a valid email address.");
      valid = false;
    } else {
      clearFieldError("email");
    }

    // Password
    if (!password) {
      setFieldError("password", "Password is required.");
      valid = false;
    } else if (password.length < 6) {
      setFieldError("password", "Password must be at least 6 characters.");
      valid = false;
    } else {
      clearFieldError("password");
    }

    return valid;
  };

  const handleSignup = async () => {
    Keyboard.dismiss();
    setSubmitError("");
    if (!validateFields()) return;
    if (uiState === "loading") return;

    setUiState("loading");

    // Check username availability before hitting auth
    const available = await checkUsernameAvailable(username.trim());
    if (!available) {
      setFieldError("username", "Username is already taken. Please choose another.");
      setUiState("idle");
      return;
    }

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { username: username.trim() } },
      });

      if (signUpError) throw signUpError;

      setUiState("success");
    } catch (err: any) {
      console.error("[Signup] error:", err?.message || err);
      setSubmitError(mapSignupError(err?.message || ""));
      setUiState("idle");
    }
  };

  const isLoading = uiState === "loading";

  const inputTheme = (hasError: boolean) => ({
    colors: {
      primary: hasError ? theme.colors.error : colors.primary,
      text: isDark ? "#fff" : "#000",
      placeholder: isDark ? "#aaa" : "#666",
    },
  });

  // ─── Success state ────────────────────────────────────────────────────────
  if (uiState === "success") {
    return (
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <View style={styles.successContainer}>
          <Image
            source={require("../../assets/icons/My_Squares_new_logo_transparent1.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <FontAwesome
            name="check-circle"
            size={52}
            color={isDark ? "#99ff99" : "#006600"}
            style={{ marginBottom: 16 }}
          />
          <Text style={[styles.successTitle, { color: theme.colors.onBackground }]}>
            Account Created!
          </Text>
          <Text style={[styles.successBody, { color: theme.colors.onSurfaceVariant }]}>
            Welcome, <Text style={{ fontFamily: "Rubik_600SemiBold" }}>{username.trim()}</Text>!
            {"\n\n"}
            You're all set. Head back to log in.
          </Text>
          <TouchableOpacity
            style={[styles.button, { marginTop: 24 }]}
            onPress={() => navigation.navigate("Login")}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  // ─── Idle / Loading state ─────────────────────────────────────────────────
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
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
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
              Sign up to start playing!
            </Text>

            {/* Username */}
            <PaperInput
              label="Username"
              mode="outlined"
              value={username}
              onChangeText={(text) => { setUsername(text); clearFieldError("username"); setSubmitError(""); }}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              error={!!fieldErrors.username}
              style={[styles.input, { backgroundColor: "transparent" }]}
              theme={inputTheme(!!fieldErrors.username)}
              right={
                username ? (
                  <PaperInput.Icon icon="close" onPress={() => { setUsername(""); clearFieldError("username"); }} color={colors.primary} />
                ) : null
              }
            />
            {!!fieldErrors.username && (
              <Text style={[styles.inlineError, { color: theme.colors.error }]}>
                {fieldErrors.username}
              </Text>
            )}

            {/* Email */}
            <PaperInput
              ref={emailRef}
              label="Email"
              mode="outlined"
              value={email}
              onChangeText={(text) => { setEmail(text); clearFieldError("email"); setSubmitError(""); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              error={!!fieldErrors.email}
              style={[styles.input, { backgroundColor: "transparent" }]}
              theme={inputTheme(!!fieldErrors.email)}
              right={
                email ? (
                  <PaperInput.Icon icon="close" onPress={() => { setEmail(""); clearFieldError("email"); }} color={colors.primary} />
                ) : null
              }
            />
            {!!fieldErrors.email && (
              <Text style={[styles.inlineError, { color: theme.colors.error }]}>
                {fieldErrors.email}
              </Text>
            )}

            {/* Password */}
            <PaperInput
              ref={passwordRef}
              label="Password"
              mode="outlined"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={(text) => { setPassword(text); clearFieldError("password"); setSubmitError(""); }}
              returnKeyType="done"
              onSubmitEditing={handleSignup}
              error={!!fieldErrors.password}
              style={[styles.input, { backgroundColor: "transparent" }]}
              theme={inputTheme(!!fieldErrors.password)}
              right={
                password ? (
                  <PaperInput.Icon
                    icon={showPassword ? "eye-off" : "eye"}
                    onPress={() => setShowPassword(!showPassword)}
                    color={colors.primary}
                  />
                ) : null
              }
            />
            {!!fieldErrors.password && (
              <Text style={[styles.inlineError, { color: theme.colors.error }]}>
                {fieldErrors.password}
              </Text>
            )}

            {/* Submit-level error */}
            {!!submitError && (
              <View style={[styles.errorBox, { backgroundColor: isDark ? "#331111" : "#ffe6e6" }]}>
                <Text style={{ color: isDark ? "#ff6666" : "#cc0000", textAlign: "center" }}>
                  {submitError}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.button, isLoading && { opacity: 0.65 }]}
              onPress={handleSignup}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Create account"
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign Up</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <FontAwesome name="arrow-left" size={16} color={colors.primary} />
              <Text style={styles.backButtonText}>Back to Login</Text>
            </TouchableOpacity>
          </ScrollView>
        </TouchableWithoutFeedback>
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
  logo: {
    width: 250,
    height: 250,
    alignSelf: "center",
    marginBottom: -30,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
    fontFamily: "Rubik_600SemiBold",
  },
  input: {
    marginBottom: 4,
  },
  inlineError: {
    fontSize: 12,
    fontFamily: "Rubik_400Regular",
    marginBottom: 8,
    marginLeft: 4,
  },
  errorBox: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    marginTop: 4,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 16,
    marginTop: 8,
    minHeight: 50,
    justifyContent: "center",
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
    paddingVertical: 4,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 6,
    fontFamily: "Rubik_400Regular",
  },
  // Success
  successContainer: {
    flex: 1,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: {
    fontSize: 24,
    fontFamily: "Rubik_600SemiBold",
    marginBottom: 12,
    textAlign: "center",
  },
  successBody: {
    fontSize: 15,
    fontFamily: "Rubik_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
});

export default SignupScreen;
