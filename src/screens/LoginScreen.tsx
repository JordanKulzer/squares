import React, { useState } from "react";
import {
  View,
  TextInput,
  Button,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebaseConfig";

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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Image
        source={require("../../assets/icons/icon_outline3.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.title}>Welcome Back</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#444"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          if (text === "" && password === "") setError("");
        }}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#444"
        secureTextEntry
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          if (text === "" && email === "") setError("");
        }}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
        <Text style={styles.linkText}>Don't have an account? Sign up</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  input: {
    height: 50,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  button: {
    backgroundColor: "#457b9d",
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
    color: "#457b9d",
    fontWeight: "500",
    fontSize: 14,
  },
});

export default LoginScreen;
