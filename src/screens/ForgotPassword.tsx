import React, { useState, useMemo } from "react";
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
import { supabase } from "../lib/supabase";

import colors from "../../assets/constants/colorOptions";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesome } from "@expo/vector-icons";

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });

  const theme = useTheme();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const gradientColors = useMemo(() => {
    return theme.dark
      ? (["#121212", "#1d1d1d", "#2b2b2d"] as const)
      : (["#fdfcf9", "#e0e7ff"] as const);
  }, [theme.dark]);

  const handleResetPassword = async () => {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setMessage({ text: "Please enter your email.", type: "error" });
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        trimmedEmail,
        {
          redirectTo: "squaresgame://reset-password",
        }
      );

      if (error) {
        console.error("Supabase error:", error.message);
        setMessage({ text: error.message, type: "error" });
      } else {
        setMessage({
          text: "Password reset email sent. Check your inbox.",
          type: "success",
        });
      }
    } catch (e) {
      console.error("Reset error:", e);
      setMessage({ text: "Unexpected error occurred.", type: "error" });
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
            Forgot Your Password?
          </Text>

          <PaperInput
            label="Email"
            mode="outlined"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setMessage({ text: "", type: "" });
            }}
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
          />

          {message.text ? (
            <View
              style={[
                styles.messageBox,
                {
                  backgroundColor:
                    message.type === "success"
                      ? isDark
                        ? "#113311"
                        : "#d6f5d6"
                      : isDark
                      ? "#331111"
                      : "#ffe6e6",
                },
              ]}
            >
              <Text
                style={{
                  color:
                    message.type === "success"
                      ? isDark
                        ? "#99ff99"
                        : "#006600"
                      : isDark
                      ? "#ff6666"
                      : "#cc0000",
                  textAlign: "center",
                }}
              >
                {message.text}
              </Text>
            </View>
          ) : null}

          <TouchableOpacity style={styles.button} onPress={handleResetPassword}>
            <Text style={styles.buttonText}>Send Email To Reset Password</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <FontAwesome name="arrow-left" size={16} color={colors.primary} />
            <Text style={styles.backButtonText}>Back to Login</Text>
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
    marginBottom: 20,
    fontFamily: "SoraBold",
  },
  logo: {
    width: 200,
    height: 200,
    alignSelf: "center",
  },
  input: {
    marginBottom: 16,
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
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
    fontFamily: "Sora",
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
    fontFamily: "Sora",
  },
});

export default ForgotPasswordScreen;
