import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Keyboard,
  StyleSheet,
  TouchableWithoutFeedback,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { doc, setDoc, arrayUnion } from "firebase/firestore";
import { auth, db } from "../../firebaseConfig";
import { Card, TextInput as PaperInput, useTheme } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import colors from "../../assets/constants/colorOptions";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import NotificationsModal from "../components/NotificationsModal";
import { scheduleDeadlineNotifications } from "../utils/scheduleDeadlineNotifications";

type JoinSquareParams = {
  gridId: string;
  inputTitle: string;
  deadline: string;
  usedColors?: string[];
};

const JoinSquareScreen = () => {
  const route = useRoute<RouteProp<{ params: JoinSquareParams }, "params">>();
  const navigation = useNavigation();
  const user = auth.currentUser;
  const theme = useTheme();

  const { gridId, inputTitle, deadline, usedColors = [] } = route.params;

  const [username, setUsername] = useState("");
  const [selectedColor, setSelectedColor] = useState(null);
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [notifySettings, setNotifySettings] = useState({
    deadlineReminders: false,
    quarterResults: false,
    playerJoined: false,
  });

  const gradientColors = theme.dark
    ? (["#121212", "#1d1d1d", "#2b2b2d"] as const)
    : (["#fdfcf9", "#e0e7ff"] as const);

  const availableColors = colors.colorOptions.filter(
    (color) => !usedColors.includes(color)
  );

  const joinSquare = async () => {
    if (!username) {
      alert("Please enter a username.");
      return;
    }

    if (!selectedColor) {
      alert("Please select a color.");
      return;
    }

    if (!user) {
      alert("User is not authenticated. Please log in.");
      return;
    }

    try {
      const squareRef = doc(db, "squares", gridId);
      await setDoc(
        squareRef,
        {
          players: arrayUnion({
            userId: user.uid,
            username,
            color: selectedColor,
            notifySettings,
          }),
          playerIds: arrayUnion(user.uid),
        },
        { merge: true }
      );

      if (notifySettings.deadlineReminders && deadline) {
        const deadlineDate = new Date(deadline);
        await scheduleDeadlineNotifications(deadlineDate);
      }

      navigation.navigate("SquareScreen", {
        gridId,
        inputTitle,
        username,
        deadline,
      });
    } catch (error) {
      console.error("Error joining grid:", error);
      alert("Something went wrong when trying to join.");
    }
  };

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }}>
              <ScrollView
                contentContainerStyle={{ flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
              >
                <Text
                  style={[styles.title, { color: theme.colors.onBackground }]}
                >
                  Joining {inputTitle}
                </Text>

                <Card
                  style={[
                    styles.card,
                    { backgroundColor: theme.colors.surface },
                  ]}
                >
                  <Card.Content>
                    <PaperInput
                      label="Your Username"
                      value={username}
                      onChangeText={setUsername}
                      mode="outlined"
                      style={styles.input}
                    />

                    <Text
                      style={[
                        styles.sectionHeader,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      Pick Your Color
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.colorScrollContainer}
                    >
                      <View style={styles.colorRowsContainer}>
                        {[0, 1].map((rowIndex) => (
                          <View key={rowIndex} style={styles.colorRow}>
                            {availableColors
                              .slice(
                                rowIndex *
                                  Math.ceil(availableColors.length / 2),
                                (rowIndex + 1) *
                                  Math.ceil(availableColors.length / 2)
                              )
                              .map((color) => (
                                <TouchableOpacity
                                  key={color}
                                  onPress={() => setSelectedColor(color)}
                                  style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 18,
                                    margin: 6,
                                    backgroundColor: color,
                                    borderColor:
                                      selectedColor === color
                                        ? theme.colors.onBackground
                                        : "#ccc",
                                    borderWidth:
                                      selectedColor === color ? 3 : 1,
                                  }}
                                />
                              ))}
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                    <TouchableOpacity
                      onPress={() => setNotifModalVisible(true)}
                      style={{
                        marginTop: 10,
                        padding: 12,
                        backgroundColor: theme.colors.elevation.level1,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: theme.colors.outlineVariant,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text
                        style={{
                          color: theme.colors.onSurface,
                          fontWeight: "500",
                        }}
                      >
                        Notification Preferences
                      </Text>
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={20}
                        color={theme.colors.onSurface}
                      />
                    </TouchableOpacity>
                  </Card.Content>
                </Card>
              </ScrollView>

              <View
                style={[
                  styles.buttonContainer,
                  {
                    backgroundColor: theme.colors.surface,
                    shadowColor: theme.dark ? "#000" : "#aaa",
                  },
                ]}
              >
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  style={[
                    styles.cancelButton,
                    { backgroundColor: theme.colors.error },
                  ]}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={joinSquare}
                  style={[
                    styles.saveButton,
                    { backgroundColor: theme.colors.primary },
                  ]}
                >
                  <Text style={styles.buttonText}>Join Square</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <NotificationsModal
        visible={notifModalVisible}
        onDismiss={() => setNotifModalVisible(false)}
        settings={notifySettings}
        onSave={(settings) => setNotifySettings(settings)}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 20,
    paddingHorizontal: 10,
  },
  card: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    borderLeftWidth: 5,
    borderLeftColor: colors.primary,
    borderWidth: 1.5,
    borderColor: "rgba(94, 96, 206, 0.4)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },

  input: {
    marginBottom: 15,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  colorScrollContainer: { paddingVertical: 10 },
  colorRowsContainer: { marginBottom: 10 },
  colorRow: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ccc",
    elevation: 8,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginRight: 10,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },

  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});

export default JoinSquareScreen;
