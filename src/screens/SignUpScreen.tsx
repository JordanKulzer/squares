import React, { useState } from "react";
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
} from "react-native";
import { TextInput as PaperInput } from "react-native-paper";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebaseConfig";
import colors from "../../assets/constants/colorOptions";
import { FontAwesome } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

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
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <Image
              source={require("../../assets/icons/new logo pt2.png")}
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

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
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

            <Text style={styles.dividerText}>or create an account with</Text>

            <View style={styles.socialContainer}>
              <View style={styles.socialSpacer}>
                <TouchableOpacity
                  style={[styles.socialButton, styles.googleButton]}
                >
                  <FontAwesome name="google" size={20} color="#EA4335" />
                  <Text style={styles.socialButtonText}>Google</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.socialSpacer}>
                {Platform.OS === "ios" && (
                  <TouchableOpacity
                    style={[styles.socialButton, styles.appleButton]}
                  >
                    <Image
                      source={{
                        uri: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/512px-Apple_logo_black.svg.png",
                      }}
                      style={[styles.socialIcon, { tintColor: "#fff" }]}
                    />
                    <Text style={[styles.socialButtonText, { color: "#fff" }]}>
                      Apple
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.socialSpacer}>
                <TouchableOpacity
                  style={[styles.socialButton, styles.facebookButton]}
                >
                  <Image
                    source={{
                      uri: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Facebook_f_logo_%282019%29.svg/512px-Facebook_f_logo_%282019%29.svg.png",
                    }}
                    style={styles.socialIcon}
                  />
                  <Text style={[styles.socialButtonText, { color: "#fff" }]}>
                    Facebook
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
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
  },
  logo: {
    width: 150,
    height: 150,
    alignSelf: "center",
    marginVertical: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.primaryText || "#333",
    marginBottom: 10,
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
    marginTop: 4,
  },
  dividerText: {
    textAlign: "center",
    color: "#888",
    marginVertical: 24,
    fontSize: 14,
    fontWeight: "500",
  },
  socialContainer: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    gap: 12,
    marginBottom: 20,
  },
  socialSpacer: {
    marginBottom: 6,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    paddingVertical: 10,
    width: "100%",
  },
  socialIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
    resizeMode: "contain",
    alignSelf: "center",
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  googleButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  appleButton: {
    backgroundColor: "#000",
  },
  facebookButton: {
    backgroundColor: "#3b5998",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    // marginBottom: 12,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 6,
  },
});

export default SignupScreen;
