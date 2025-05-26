import React, {
  useState,
  useEffect,
  useCallback,
  useLayoutEffect,
} from "react";
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import {
  Modal,
  Portal,
  Provider,
  TextInput,
  Button,
  ActivityIndicator,
} from "react-native-paper";
import { auth, db } from "../../firebaseConfig"; // Import Firebase
import HeaderSettingsMenu from "../components/HeaderSettingsMenu";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import colors from "../../assets/constants/colorOptions";

const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const [userGames, setUserGames] = useState([]); // Store user's squares
  const [loading, setLoading] = useState(true); // Loading state
  const [visible, setVisible] = useState(false);
  const [sessionCode, setSessionCode] = useState("");
  const [loadingSession, setLoadingSession] = useState(false);
  const [error, setError] = useState("");

  // Fetch user squares
  useFocusEffect(
    useCallback(() => {
      const user = auth.currentUser;
      if (!user) return;

      const userSquaresRef = query(
        collection(db, "squares"),
        where("playerIds", "array-contains", user.uid)
      );

      const unsubscribe = onSnapshot(userSquaresRef, (querySnapshot) => {
        const squaresList = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          const userPlayer = data.players.find((p) => p.uid === user.uid);
          return {
            id: doc.id,
            ...data,
            username: userPlayer?.username || "Unknown",
          };
        });

        setUserGames(squaresList);
        setLoading(false);
      });

      return () => unsubscribe(); // clean up on blur
    }, [])
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => <HeaderSettingsMenu />,
    });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.greetingContainer}>
        <Text style={styles.greetingTitle}>Welcome Back!</Text>
        <Text style={styles.greetingSubtitle}>
          Ready to play your next square?
        </Text>
      </View>
      <Text style={styles.sectionTitle}>Quick Start</Text>

      {/* Navigation buttons */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("CreateSquareScreen")}
      >
        <MaterialIcons name="add-box" size={20} color="#fff" />
        <Text style={styles.buttonText}>Create Game</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={() => setVisible(true)}>
        <MaterialIcons name="vpn-key" size={20} color="#fff" />
        <Text style={styles.buttonText}>Join By Code</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Your Games</Text>

      {loading ? (
        <Text>Loading...</Text>
      ) : userGames.length === 0 ? (
        <Text style={styles.emptyMessage}>
          You haven’t joined or created any games yet.
        </Text>
      ) : (
        <FlatList
          data={userGames}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.gameCard}
              onPress={() =>
                navigation.navigate("FinalSquareScreen", {
                  gridId: item.id,
                  inputTitle: item.title,
                  username: item.username,
                  deadline: item.deadline,
                  disableAnimation: true,
                })
              }
            >
              <Text style={styles.gameTitle}>{item.title}</Text>
              <Text style={styles.gameSubtitle}>
                {item.playerIds?.length || 0} players •{" "}
                {item.deadline?.toDate?.() > new Date()
                  ? `Ends ${item.deadline.toDate().toLocaleDateString()}`
                  : "Finalized"}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}

      <Portal>
        <Modal
          visible={visible}
          onDismiss={() => setVisible(false)}
          contentContainerStyle={modalStyles.container}
        >
          <Text style={modalStyles.title}>Enter Session ID</Text>

          <TextInput
            label="Session ID"
            mode="outlined"
            value={sessionCode}
            onChangeText={(text) => {
              setSessionCode(text);
              setError("");
            }}
            style={{ marginBottom: 16, backgroundColor: "#f8f9fa" }}
          />

          {error ? <Text style={modalStyles.error}>{error}</Text> : null}

          {loadingSession ? (
            <ActivityIndicator animating color={colors.primary} />
          ) : (
            <Button
              mode="contained"
              onPress={async () => {
                if (!sessionCode) return;
                setLoadingSession(true);
                try {
                  const ref = doc(db, "squares", sessionCode.trim());
                  const snap = await getDoc(ref);

                  if (!snap.exists()) {
                    setError("Session not found.");
                    setLoadingSession(false);
                    return;
                  }

                  const data = snap.data();
                  const usedColors = data.players?.map((p) => p.color) || [];

                  setVisible(false);
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
              }}
              style={{ marginTop: 10, backgroundColor: "#5e60ce" }}
            >
              Join
            </Button>
          )}

          <Button
            onPress={() => setVisible(false)}
            style={{ marginTop: 10 }}
            compact
          >
            <Text style={{ color: "#5e60ce" }}>Cancel</Text>
          </Button>
        </Modal>
      </Portal>

      <TouchableOpacity
        style={styles.howToButton}
        onPress={() => navigation.navigate("HowToPlay")}
      >
        <Text style={styles.howToText}>How to Play</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 20,
  },
  greetingContainer: {
    alignItems: "center",
    marginBottom: 10,
    marginTop: 10,
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: colors.primaryText,
  },
  greetingSubtitle: {
    fontSize: 14,
    color: colors.secondaryText,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 15,
    marginBottom: 10,
    color: colors.primaryText,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    marginVertical: 6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    paddingLeft: 5,
  },
  gameCard: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  gameTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  gameSubtitle: {
    fontSize: 14,
    color: colors.secondaryText,
  },
  howToButton: {
    marginTop: 10,
    alignSelf: "center",
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  howToText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyMessage: {
    textAlign: "center",
    fontSize: 14,
    color: colors.secondaryText,
    marginTop: 10,
    fontStyle: "italic",
  },
});

const modalStyles = StyleSheet.create({
  container: {
    backgroundColor: "white",
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
    color: "red",
    marginBottom: 10,
    textAlign: "center",
  },
});
