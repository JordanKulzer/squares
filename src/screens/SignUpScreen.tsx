import React, { useMemo, useState } from "react";
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
} from "react-native";
import { TextInput as PaperInput, useTheme } from "react-native-paper";
import { FontAwesome } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../lib/supabase";
import colors from "../../assets/constants/colorOptions";

const SignupScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [checkingUsername, setCheckingUsername] = useState(false);

  const theme = useTheme();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const gradientColors = useMemo(
    () =>
      theme.dark
        ? (["#121212", "#1d1d1d", "#2b2b2d"] as [string, string, ...string[]])
        : (["#fdfcf9", "#e0e7ff"] as [string, string]),
    [theme.dark]
  );

  const checkUsernameAvailable = async (usernameToCheck: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('username', usernameToCheck)
        .maybeSingle();

      if (error) {
        console.error('Error checking username:', error);
        return false;
      }

      return !data; // Available if no user found
    } catch (err) {
      console.error('checkUsernameAvailable error:', err);
      return false;
    }
  };

  const handleSignup = async () => {
    if (!username || !email || !password) {
      setError("Please fill out all fields.");
      return;
    }

    // Validate username format
    if (username.length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }

    if (username.length > 20) {
      setError("Username must be 20 characters or less.");
      return;
    }

    // Only allow alphanumeric and underscores
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError("Username can only contain letters, numbers, and underscores.");
      return;
    }

    if (password.length < 6) {
      setError("Password is too short. It must be at least 6 characters.");
      return;
    }

    // Check if username is available
    setCheckingUsername(true);
    const isAvailable = await checkUsernameAvailable(username);
    setCheckingUsername(false);

    if (!isAvailable) {
      setError("Username is already taken. Please choose another.");
      return;
    }

    setError("");
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { username },
        },
      });

      if (signUpError) throw signUpError;

      // User record is now created automatically by database trigger
      console.log("User signed up successfully:", data?.user?.id);
    } catch (err: any) {
      console.error("Signup error:", err?.message || err);

      if (err.message?.includes("User already registered")) {
        setError("Email already in use or invalid.");
      } else if (err.message?.includes("email")) {
        setError("Email already in use or invalid.");
      } else if (err.message?.includes("password")) {
        setError("Password must be at least 6 characters.");
      } else {
        setError("Signup failed. Try again.");
      }
    }
  };

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

            <PaperInput
              label="Username"
              mode="outlined"
              value={username}
              onChangeText={setUsername}
              keyboardType="default"
              autoCapitalize="none"
              style={[styles.input, { backgroundColor: "transparent" }]}
              theme={{
                colors: {
                  primary: colors.primary,
                  text: isDark ? "#fff" : "#000",
                  placeholder: isDark ? "#aaa" : "#666",
                },
              }}
              right={
                username ? (
                  <PaperInput.Icon
                    icon="close"
                    onPress={() => setUsername("")}
                    color={colors.primary}
                  />
                ) : null
              }
            />

            <PaperInput
              label="Email"
              mode="outlined"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[styles.input, { backgroundColor: "transparent" }]}
              theme={{
                colors: {
                  primary: colors.primary,
                  text: isDark ? "#fff" : "#000",
                  placeholder: isDark ? "#aaa" : "#666",
                },
              }}
              right={
                email ? (
                  <PaperInput.Icon
                    icon="close"
                    onPress={() => setEmail("")}
                    color={colors.primary}
                  />
                ) : null
              }
            />

            <PaperInput
              label="Password"
              mode="outlined"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              style={[styles.input, { backgroundColor: "transparent" }]}
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

            {error ? (
              <View
                style={[
                  styles.errorBox,
                  { backgroundColor: isDark ? "#331111" : "#ffe6e6" },
                ]}
              >
                <Text
                  style={{
                    color: isDark ? "#ff6666" : "#cc0000",
                    textAlign: "center",
                  }}
                >
                  {error}
                </Text>
              </View>
            ) : null}

            <TouchableOpacity style={styles.button} onPress={handleSignup}>
              <Text style={styles.buttonText}>Sign Up</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
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
    marginBottom: 10,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 16,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
    fontFamily: "Rubik_500Medium",
  },
  errorBox: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 6,
    fontFamily: "Rubik_400Regular",
  },
});

export default SignupScreen;
