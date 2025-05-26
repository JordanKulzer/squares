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
} from "firebase/firestore";
import { auth, db } from "../../firebaseConfig"; // Import Firebase
import HeaderSettingsMenu from "../components/HeaderSettingsMenu";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const [userGames, setUserGames] = useState([]); // Store user's squares
  const [loading, setLoading] = useState(true); // Loading state

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
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("JoinSquareScreen")}
      >
        <MaterialIcons name="vpn-key" size={20} color="#fff" />
        <Text style={styles.buttonText}>Join By Code</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Your Games</Text>

      {loading ? (
        <Text>Loading...</Text>
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
                  // team1: item.team1,
                  // team2: item.team2,
                  deadline: item.deadline,
                  disableAnimation: true,
                })
              }
            >
              <Text style={styles.gameTitle}>{item.title}</Text>
              <Text style={styles.gameSubtitle}>
                {item.players.length} players •{" "}
                {item.deadline?.toDate?.() > new Date()
                  ? `Ends ${item.deadline.toDate().toLocaleDateString()}`
                  : "Finalized"}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}

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
    backgroundColor: "#FDFCF9",
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
    color: "#5e60ce",
  },
  greetingSubtitle: {
    fontSize: 14,
    color: "#6c757d",
    marginTop: 4,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 15,
    marginBottom: 10,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#5e60ce",
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
    color: "#6c757d",
  },
  howToButton: {
    marginTop: 10,
    alignSelf: "center",
    backgroundColor: "#5e60ce",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  howToText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
