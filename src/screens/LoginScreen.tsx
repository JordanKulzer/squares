import React, { useMemo, useState } from "react";
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
} from "react-native";
import { TextInput as PaperInput, useTheme } from "react-native-paper";
import colors from "../../assets/constants/colorOptions";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../lib/supabase";

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const theme = useTheme();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const handleLogin = async () => {
    setError("");
    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) {
        if (loginError.message.includes("Invalid login credentials")) {
          setError("Incorrect email or password.");
        } else {
          setError("Login failed. Try again.");
        }
      } else {
        navigation.replace("Main");
      }
    } catch (err) {
      setError("Unexpected error. Please try again.");
    }
  };

  const gradientColors = useMemo(() => {
    return theme.dark
      ? (["#121212", "#1d1d1d", "#2b2b2d"] as const)
      : (["#fdfcf9", "#e0e7ff"] as const);
  }, [theme.dark]);

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
            source={require("../../assets/icons/squares-logo.png")}
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
              if (text === "" && password === "") setError("");
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            theme={{ colors: { primary: colors.primary } }}
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
            secureTextEntry
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (text === "" && email === "") setError("");
            }}
            style={styles.input}
            theme={{ colors: { primary: colors.primary } }}
            right={
              password ? (
                <PaperInput.Icon
                  icon="close"
                  onPress={() => setPassword("")}
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
          <TouchableOpacity style={styles.button} onPress={handleLogin}>
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate("ForgotPassword")}
            style={styles.forgotPasswordContainer}
          >
            <Text
              style={{
                color: colors.primary,
                fontSize: 13,
                fontWeight: "500",
              }}
            >
              Forgot password?
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
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
    marginTop: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 10,
    fontFamily: "Poppins-SemiBold",
  },
  logo: {
    width: 200,
    height: 200,
    alignSelf: "center",
  },
  input: {
    marginBottom: 16,
    backgroundColor: "transparent",
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
  },
  forgotPasswordContainer: {
    alignSelf: "center",
    marginBottom: 12,
  },
  errorBox: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  linkText: {
    textAlign: "center",
    color: colors.primary,
    fontWeight: "500",
    fontSize: 14,
    marginTop: 4,
  },
});

export default LoginScreen;
