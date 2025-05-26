import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { TextInput as PaperInput } from "react-native-paper";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebaseConfig";
import colors from "../../assets/constants/colorOptions";

const SignupScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSignup = async () => {
    setError("");
    try {
      await createUserWithEmailAndPassword(auth, email, password);
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
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Image
            source={require("../../assets/icons/icon_outline3.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={styles.title}>Create Account</Text>

          <PaperInput
            label="Email"
            mode="outlined"
            value={email}
            onChangeText={setEmail}
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
            onChangeText={setPassword}
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

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={styles.button} onPress={handleSignup}>
            <Text style={styles.buttonText}>Sign Up</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.linkText}>Already have an account? Log in</Text>
          </TouchableOpacity>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#fdfcf9",
  },
  logo: {
    width: 100,
    height: 100,
    alignSelf: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 24,
    color: colors.primary,
  },
  input: {
    marginBottom: 16,
    backgroundColor: colors.secondaryBackground,
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
  error: {
    color: "red",
    textAlign: "center",
    marginBottom: 12,
  },
  linkText: {
    textAlign: "center",
    color: colors.primary,
    fontWeight: "500",
    fontSize: 14,
  },
});

export default SignupScreen;
