import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { TextInput as PaperInput } from "react-native-paper";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebaseConfig";
import colors from "../../assets/constants/colorOptions";
import { FontAwesome } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      if (err.code === "auth/invalid-email") {
        setError("Invalid email address.");
      } else if (err.code === "auth/user-not-found") {
        setError("No account found with that email.");
      } else if (err.code === "auth/wrong-password") {
        setError("Incorrect password.");
      } else {
        setError("Login failed. Try again.");
      }
    }
  };

  return (
    <LinearGradient
      colors={["#fdfcf9", "#e0e7ff"]}
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
            source={require("../../assets/icons/new logo pt2.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={styles.title}>Welcome!</Text>

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
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          <TouchableOpacity style={styles.button} onPress={handleLogin}>
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate("ForgotPassword")}
            style={styles.forgotPasswordContainer}
          >
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
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
    marginTop: 50,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.primaryText || "#333",
    marginBottom: 10,
    fontFamily: "Poppins-SemiBold", //
  },
  logo: {
    width: 150,
    height: 150,
    alignSelf: "center",
    marginVertical: 15,
  },
  input: {
    marginBottom: 16,
    backgroundColor: colors.primaryBackground,
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

  forgotPasswordText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "500",
  },

  errorBox: {
    backgroundColor: "#ffe6e6",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    color: "#cc0000",
    textAlign: "center",
  },

  linkText: {
    textAlign: "center",
    color: colors.primary,
    fontWeight: "500",
    fontSize: 14,
    marginTop: 4, // was 10
  },
});

export default LoginScreen;
