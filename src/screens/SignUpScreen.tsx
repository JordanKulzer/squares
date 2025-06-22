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
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import colors from "../../assets/constants/colorOptions";
import { FontAwesome } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const SignupScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [error, setError] = useState("");

  const theme = useTheme();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const gradientColors = useMemo(() => {
    return theme.dark
      ? ["#121212", "#1d1d1d", "#2b2b2d"]
      : ["#fdfcf9", "#e0e7ff"];
  }, [theme.dark]);

  const handleSignup = async () => {
    if (!firstName || !email || !password) {
      setError("Please fill out all fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password is too short. It must be at least 6 characters.");
      return;
    }

    setError("");
    try {
      const userCredential = await auth().createUserWithEmailAndPassword(
        email,
        password
      );
      const user = userCredential.user;

      await firestore().collection("users").doc(user.uid).set({
        firstName: firstName,
        email: email,
        createdAt: new Date(),
      });

      navigation.replace("Main");
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("Email already in use.");
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email address.");
      } else if (err.code === "auth/weak-password") {
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
              source={require("../../assets/icons/squares-logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />

            <Text style={[styles.title, { color: theme.colors.onBackground }]}>
              Sign up to start playing!
            </Text>

            <PaperInput
              label="First Name"
              mode="outlined"
              value={firstName}
              onChangeText={setFirstName}
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
                firstName ? (
                  <PaperInput.Icon
                    icon="close"
                    onPress={() => setFirstName("")}
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
              secureTextEntry
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
    marginTop: 40,
  },
  logo: {
    width: 200,
    height: 200,
    alignSelf: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
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
  },
});

export default SignupScreen;
