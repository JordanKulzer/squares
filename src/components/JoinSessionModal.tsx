import React, { useState, useEffect } from "react";
import {
  Text,
  StyleSheet,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  Modal,
  Portal,
  TextInput,
  Button,
  ActivityIndicator,
  useTheme,
} from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../utils/types";
import { supabase } from "../lib/supabase";
// import * as Sentry from "@sentry/react-native";

const JoinSessionModal = ({ visible, onDismiss }) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [sessionCode, setSessionCode] = useState("");
  const [loadingSession, setLoadingSession] = useState(false);
  const [error, setError] = useState("");
  const theme = useTheme();

  useEffect(() => {
    if (!visible) {
      setSessionCode("");
      setError("");
      setLoadingSession(false);
    }
  }, [visible]);

  const handleJoin = async () => {
    if (!sessionCode.trim()) return;

    setLoadingSession(true);
    try {
      const { data, error: fetchError } = await supabase
        .from("squares")
        .select("title, deadline, players")
        .eq("id", sessionCode.trim())
        .single();

      if (fetchError || !data) {
        setError("Session not found.: " + fetchError?.message);
        return;
      }

      const usedColors = data.players?.map((p) => p.color) || [];

      onDismiss();
      navigation.navigate("JoinSquareScreen", {
        gridId: sessionCode.trim(),
        inputTitle: data.title,
        deadline: data.deadline,
        usedColors,
      });
    } catch (err) {
      console.error("Join session error:", err);
      setError("Something went wrong.");
    } finally {
      setLoadingSession(false);
    }
  };

  const dividerColor = theme.dark ? "#333" : "#eee";

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.modal,
          {
            borderLeftColor: theme.colors.primary,
            backgroundColor: theme.colors.surface,
          },
        ]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>
            Join a Session
          </Text>
          <View
            style={{
              height: 1,
              backgroundColor: dividerColor,
              marginBottom: 20,
            }}
          />

          <TextInput
            label="Enter Session ID"
            mode="outlined"
            value={sessionCode}
            onChangeText={(text) => {
              setSessionCode(text);
              setError("");
            }}
            style={[styles.input, { backgroundColor: theme.colors.surface }]}
            theme={{ colors: { text: theme.colors.onSurface } }}
          />

          {error ? (
            <Text style={[styles.error, { color: theme.colors.error }]}>
              {error}
            </Text>
          ) : null}

          {loadingSession ? (
            <ActivityIndicator
              animating
              color={theme.colors.primary}
              style={styles.spinner}
            />
          ) : (
            <Button
              mode="contained"
              onPress={handleJoin}
              labelStyle={{ fontFamily: "Sora" }}
              style={styles.button}
            >
              Join
            </Button>
          )}

          <Button
            onPress={onDismiss}
            textColor={theme.colors.error}
            style={styles.closeButton}
            labelStyle={{ fontFamily: "Sora" }}
          >
            Cancel
          </Button>
          {/* <Button
            mode="text"
            onPress={() => {
              Sentry.captureException(
                new Error("Sentry test error from JoinSessionModal")
              );
            }}
            style={{ marginTop: 8 }}
            labelStyle={{ fontFamily: "Sora" }}
          >
            Send Test Error
          </Button> */}
        </KeyboardAvoidingView>
      </Modal>
    </Portal>
  );
};

export default JoinSessionModal;

const styles = StyleSheet.create({
  modal: {
    margin: 20,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1.5,
    borderLeftWidth: 5,
    borderColor: "rgba(94, 96, 206, 0.4)",
    elevation: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    fontFamily: "SoraBold",
  },
  input: {
    marginBottom: 16,
  },
  error: {
    textAlign: "center",
    marginBottom: 10,
  },
  spinner: {
    marginVertical: 10,
  },
  button: {
    marginTop: 8,
  },
  closeButton: {
    marginTop: 4,
  },
});
