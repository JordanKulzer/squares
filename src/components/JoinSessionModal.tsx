import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  Modal,
  Portal,
  TextInput,
  Button,
  ActivityIndicator,
  useTheme,
} from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import firestore from "@react-native-firebase/firestore";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../utils/types";

const JoinSessionModal = ({ visible, onDismiss }) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [sessionCode, setSessionCode] = useState("");
  const [loadingSession, setLoadingSession] = useState(false);
  const [error, setError] = useState("");
  const theme = useTheme();

  const handleJoin = async () => {
    if (!sessionCode) return;
    setLoadingSession(true);
    try {
      const docRef = firestore().collection("squares").doc(sessionCode.trim());
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        setError("Session not found.");
        setLoadingSession(false);
        return;
      }

      const data = docSnap.data();
      const usedColors = data.players?.map((p) => p.color) || [];

      onDismiss();
      setSessionCode("");
      navigation.navigate("JoinSquareScreen", {
        gridId: sessionCode.trim(),
        inputTitle: data.title,
        deadline: data.deadline,
        usedColors,
      });
    } catch (err) {
      console.error(err);
      setError("Something went wrong.");
    } finally {
      setLoadingSession(false);
    }
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.container,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>
          Enter Session ID
        </Text>

        <TextInput
          label="Session ID"
          mode="outlined"
          value={sessionCode}
          onChangeText={(text) => {
            setSessionCode(text);
            setError("");
          }}
          style={{
            marginBottom: 16,
            backgroundColor: theme.colors.surface,
          }}
          theme={{ colors: { text: theme.colors.onSurface } }}
        />

        {error ? (
          <Text style={[styles.error, { color: theme.colors.error }]}>
            {error}
          </Text>
        ) : null}

        {loadingSession ? (
          <ActivityIndicator animating color={theme.colors.primary} />
        ) : (
          <Button
            mode="contained"
            onPress={handleJoin}
            style={{ marginTop: 10 }}
          >
            Join
          </Button>
        )}

        <Button
          onPress={onDismiss}
          style={{ marginTop: 10 }}
          textColor={theme.colors.primary}
        >
          Cancel
        </Button>
      </Modal>
    </Portal>
  );
};

export default JoinSessionModal;

const styles = StyleSheet.create({
  container: {
    padding: 20,
    margin: 20,
    borderRadius: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
    textAlign: "center",
  },
  error: {
    marginBottom: 10,
    textAlign: "center",
  },
});
