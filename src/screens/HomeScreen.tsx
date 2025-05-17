import React, { useState, useEffect } from "react";
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../../firebaseConfig"; // Import Firebase

const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const [userGames, setUserGames] = useState([]); // Store user's squares
  const [loading, setLoading] = useState(true); // Loading state

  // Fetch user squares
  const fetchUserSquares = async () => {
    const user = auth.currentUser;
    if (!user) {
      console.error("No authenticated user found.");
      return;
    }

    try {
      const userSquaresRef = query(
        collection(db, "squares"),
        where("playerIds", "array-contains", user.uid) // Fetch squares where user is a player
      );

      const querySnapshot = await getDocs(userSquaresRef);

      const squaresList = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        const userPlayer = data.players.find((p) => p.uid === user.uid);
        console.log("username: " + userPlayer?.username);

        return {
          id: doc.id,
          ...data,
          username: userPlayer?.username || "Unknown",
        };
      });

      setUserGames(squaresList); // Set the fetched squares to the state
    } catch (error) {
      console.error("Error fetching squares:", error);
    } finally {
      setLoading(false); // Set loading to false once data is fetched
    }
  };

  // Fetch squares when the component is mounted
  useEffect(() => {
    fetchUserSquares();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.greeting}>Welcome back, User!</Text>

      <Text style={styles.sectionTitle}>Quick Start</Text>

      {/* Navigation buttons */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("CreateSquareScreen")}
      >
        <Text style={styles.buttonText}>Create Game</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("JoinSquareScreen")}
      >
        <Text style={styles.buttonText}>Join by Code</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Your Games</Text>

      {/* Display user games (squares) */}
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
                navigation.navigate("SquareScreen", {
                  gridId: item.id,
                  inputTitle: item.title,
                  username: item.username,
                  team1: item.team1,
                  team2: item.team2,
                  deadline: item.deadline,
                  disableAnimation: true,
                })
              }
            >
              <Text style={styles.gameTitle}>{item.title}</Text>
              <Text style={styles.gameSubtitle}>
                {item.players.length} players
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
  greeting: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 15,
    marginBottom: 10,
  },
  button: {
    backgroundColor: "#457b9d",
    paddingVertical: 14,
    borderRadius: 10,
    marginVertical: 6,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
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
    backgroundColor: "#457b9d",
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
