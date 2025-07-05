import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
  useColorScheme,
  TouchableOpacity,
} from "react-native";
import { TextInput as PaperInput, Button, useTheme } from "react-native-paper";
import { supabase } from "../lib/supabase";
import { LinearGradient } from "expo-linear-gradient";
import colors from "../../assets/constants/colorOptions";
import * as Linking from "expo-linking";

const ResetPasswordScreen = ({ navigation }) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState({ text: "", type: "" });

  const theme = useTheme();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const gradientColors = useMemo(() => {
    return theme.dark
      ? (["#121212", "#1d1d1d", "#2b2b2d"] as const)
      : (["#fdfcf9", "#e0e7ff"] as const);
  }, [theme.dark]);

  useEffect(() => {
    const checkForSession = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        const { queryParams } = Linking.parse(initialUrl);
        const { access_token, refresh_token } = queryParams;

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token: access_token as string,
            refresh_token: refresh_token as string,
          });

          if (error) {
            console.error(
              "Failed to set session from recovery link:",
              error.message
            );
          } else {
            console.log("Session restored from password reset link");
          }
        }
      }
    };

    checkForSession();
  }, []);

  const handleCancelUpdate = async () => {
    try {
      await supabase.auth.signOut();

      // Optional: Go to login after a delay
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    } catch (e) {
      console.error("Unexpected error:", e);
      setStatus({ text: "An unexpected error occurred.", type: "error" });
    }
  };

  const handlePasswordUpdate = async () => {
    if (!newPassword || !confirmPassword) {
      setStatus({ text: "Please fill out both fields.", type: "error" });
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus({ text: "Passwords do not match.", type: "error" });
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error("Password update error:", error);
        setStatus({ text: "Failed to reset password.", type: "error" });
      } else {
        setStatus({
          text: "Password updated! You can now log in.",
          type: "success",
        });
        await supabase.auth.signOut();

        // Optional: Go to login after a delay
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: "Login" }],
          });
        }, 2000);
      }
    } catch (e) {
      console.error("Unexpected error:", e);
      setStatus({ text: "An unexpected error occurred.", type: "error" });
    }
  };

  return (
    <LinearGradient
      colors={gradientColors}
      style={{ flex: 1 }}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
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
            Reset Your Password
          </Text>

          <PaperInput
            label="New Password"
            mode="outlined"
            secureTextEntry
            value={newPassword}
            onChangeText={(text) => {
              setNewPassword(text);
              setStatus({ text: "", type: "" });
            }}
            style={styles.input}
            theme={{ colors: { primary: colors.primary } }}
            right={
              newPassword ? (
                <PaperInput.Icon
                  icon="close"
                  onPress={() => setNewPassword("")}
                  color={colors.primary}
                />
              ) : null
            }
          />

          <PaperInput
            label="Confirm New Password"
            mode="outlined"
            secureTextEntry
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              setStatus({ text: "", type: "" });
            }}
            style={styles.input}
            theme={{ colors: { primary: colors.primary } }}
            right={
              confirmPassword ? (
                <PaperInput.Icon
                  icon="close"
                  onPress={() => setConfirmPassword("")}
                  color={colors.primary}
                />
              ) : null
            }
          />

          {status.text ? (
            <Text
              style={{
                textAlign: "center",
                color:
                  status.type === "success"
                    ? theme.colors.primary
                    : theme.colors.error,
                marginVertical: 10,
              }}
            >
              {status.text}
            </Text>
          ) : null}
          <TouchableOpacity
            onPress={handlePasswordUpdate}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Forgot password?</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleCancelUpdate}
            style={styles.resetPasswordContainer}
          >
            <Text
              style={{
                color: colors.primary,
                fontSize: 13,
                fontWeight: "500",
                fontFamily: "Sora",
              }}
            >
              Cancel
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    marginTop: 40,
  },
  logo: {
    width: 200,
    height: 200,
    alignSelf: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 10,
    fontFamily: "SoraBold",
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
    marginVertical: 16,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
    fontFamily: "Sora",
  },
  resetPasswordContainer: {
    alignSelf: "center",
    marginBottom: 12,
  },
});

export default ResetPasswordScreen;
