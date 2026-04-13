import React, { useMemo, useRef, useState } from "react";
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
  TextInput,
} from "react-native";
import { TextInput as PaperInput, useTheme } from "react-native-paper";
import colors from "../../assets/constants/colorOptions";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../lib/supabase";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const mapLoginError = (message: string): string => {
  const m = message.toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid credentials")) {
    return "Incorrect email or password.";
  }
  if (m.includes("email not confirmed")) {
    return "Please confirm your email before signing in.";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Too many attempts. Please wait and try again.";
  }
  if (m.includes("network") || m.includes("fetch")) {
    return "Connection issue. Check your network and try again.";
  }
  return "Login failed. Please try again.";
};

type UIState = "idle" | "loading";

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [uiState, setUiState] = useState<UIState>("idle");

  const passwordRef = useRef<TextInput>(null);

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

  const validateFields = (): boolean => {
    let valid = true;
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setEmailError("Email is required.");
      valid = false;
    } else if (!EMAIL_RE.test(trimmedEmail)) {
      setEmailError("Enter a valid email address.");
      valid = false;
    } else {
      setEmailError("");
    }

    return valid;
  };

  const handleLogin = async () => {
    setSubmitError("");
    if (!validateFields()) return;
    if (uiState === "loading") return;

    setUiState("loading");
    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (loginError) {
        setSubmitError(mapLoginError(loginError.message));
        setUiState("idle");
        return;
      }

      if (data.user) {
        try {
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("deleted_at")
            .eq("id", data.user.id)
            .maybeSingle();

          if (!userError && userData?.deleted_at) {
            await supabase.auth.signOut();
            setSubmitError(
              "This account has been deleted. Contact support if this is a mistake.",
            );
            setUiState("idle");
            return;
          }
        } catch {
          // RLS may block this check — allow login to proceed
        }
      }
      // Success: App.tsx auth listener handles navigation
    } catch (err: any) {
      const msg =
        err?.message?.toLowerCase().includes("network") ||
        err?.message?.toLowerCase().includes("fetch")
          ? "Connection issue. Check your network and try again."
          : "Unexpected error. Please try again.";
      setSubmitError(msg);
      setUiState("idle");
    }
  };

  const isLoading = uiState === "loading";

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
            Welcome!
          </Text>

          <PaperInput
            label="Email"
            mode="outlined"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (emailError) setEmailError("");
              if (submitError) setSubmitError("");
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            error={!!emailError}
            style={styles.input}
            theme={{
              colors: {
                primary: emailError ? theme.colors.error : colors.primary,
                text: isDark ? "#fff" : "#000",
                placeholder: isDark ? "#aaa" : "#666",
              },
            }}
            right={
              email ? (
                <PaperInput.Icon
                  icon="close"
                  onPress={() => { setEmail(""); setEmailError(""); }}
                  color={colors.primary}
                />
              ) : null
            }
          />
          {!!emailError && (
            <Text style={[styles.inlineError, { color: theme.colors.error }]}>
              {emailError}
            </Text>
          )}

          <PaperInput
            ref={passwordRef}
            label="Password"
            mode="outlined"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (submitError) setSubmitError("");
            }}
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            style={styles.input}
            theme={{
              colors: {
                primary: colors.primary,
                text: isDark ? "#fff" : "#000",
                placeholder: isDark ? "#aaa" : "#666",
              },
            }}
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

          {!!submitError && (
            <View
              style={[
                styles.errorBox,
                { backgroundColor: isDark ? "#331111" : "#ffe6e6" },
              ]}
            >
              <Text style={{ color: isDark ? "#ff6666" : "#cc0000", textAlign: "center" }}>
                {submitError}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, isLoading && { opacity: 0.65 }]}
            onPress={handleLogin}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel="Log in"
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Login</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate("ForgotPassword")}
            style={styles.forgotPasswordContainer}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "500", fontFamily: "Rubik_400Regular" }}>
              Forgot password?
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate("Signup")}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.linkText}>Don't have an account? Sign up</Text>
          </TouchableOpacity>
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
    marginBottom: 10,
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
    backgroundColor: "transparent",
  },
  inlineError: {
    fontSize: 12,
    fontFamily: "Rubik_400Regular",
    marginBottom: 10,
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
    marginTop: 4,
    minHeight: 50,
    justifyContent: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
    fontFamily: "Rubik_500Medium",
  },
  forgotPasswordContainer: {
    alignSelf: "center",
    marginBottom: 12,
    paddingVertical: 4,
  },
  linkText: {
    textAlign: "center",
    color: colors.primary,
    fontWeight: "500",
    fontSize: 14,
    marginTop: 4,
    fontFamily: "Rubik_400Regular",
  },
});

export default LoginScreen;
