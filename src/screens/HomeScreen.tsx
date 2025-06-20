import React, {
  useState,
  useCallback,
  useLayoutEffect,
  useEffect,
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
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import { IconButton, useTheme } from "react-native-paper";
import { auth, db } from "../../firebaseConfig";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import ProfileModal from "../components/ProfileModal";
import JoinSessionModal from "../components/JoinSessionModal";
import colors from "../../assets/constants/colorOptions";

const HomeScreen = () => {
  const navigation = useNavigation();
  const theme = useTheme();

  const gradientColors = theme.dark
    ? (["#121212", "#1d1d1d", "#2b2b2d"] as const)
    : (["#fdfcf9", "#e0e7ff"] as const);

  const [userGames, setUserGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [profileVisible, setProfileVisible] = useState(false);
  const [firstName, setFirstName] = useState("");

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

      return () => unsubscribe();
    }, [])
  );

  useEffect(() => {
    const fetchFirstName = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setFirstName(userData.firstName || "");
        }
      } catch (err) {
        console.error("Error fetching user name:", err);
      }
    };

    fetchFirstName();
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: {
        backgroundColor: theme.colors.surface, // dynamically changes!
      },
      headerRight: () => (
        <IconButton
          icon="account-circle"
          size={24}
          onPress={() => setProfileVisible(true)}
          iconColor={theme.colors.onBackground}
          style={{ marginRight: 8 }}
        />
      ),
    });
  }, [navigation, theme]);

  const isNewUser = !loading && userGames.length === 0;
  const welcomeTitle = isNewUser
    ? `Welcome${firstName ? `, ${firstName}` : ""}!`
    : `Welcome back${firstName ? `, ${firstName}` : ""}!`;

  const welcomeSubtitle = isNewUser
    ? "Let's get started by joining or creating a square."
    : "Ready to play your next square?";

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1, padding: 20 }}>
        <View style={{ alignItems: "center", marginVertical: 10 }}>
          <Text
            style={{
              fontSize: 22,
              fontWeight: "bold",
              color: theme.colors.onBackground,
            }}
          >
            {welcomeTitle}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: theme.colors.onSurfaceVariant,
              marginTop: 4,
            }}
          >
            {welcomeSubtitle}
          </Text>
        </View>
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            marginTop: 15,
            marginBottom: 10,
            color: theme.colors.onBackground,
          }}
        >
          Quick Start
        </Text>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.primary }]}
          onPress={() => navigation.navigate("CreateSquareScreen")}
        >
          <MaterialIcons name="add-box" size={20} color="#fff" />
          <Text style={styles.buttonText}>Create Game</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.primary }]}
          onPress={() => setVisible(true)}
        >
          <MaterialIcons name="vpn-key" size={20} color="#fff" />
          <Text style={styles.buttonText}>Join By Code</Text>
        </TouchableOpacity>

        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            marginTop: 15,
            marginBottom: 10,
            color: theme.colors.onBackground,
          }}
        >
          Your Squares
        </Text>

        {loading ? (
          <Text style={{ color: theme.colors.onBackground }}>Loading...</Text>
        ) : userGames.length === 0 ? (
          <Text
            style={{
              textAlign: "center",
              fontSize: 14,
              color: theme.colors.onSurfaceVariant,
              marginTop: 10,
              fontStyle: "italic",
            }}
          >
            You haven’t joined or created any games yet.
          </Text>
        ) : (
          <FlatList
            data={userGames}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.gameCard,
                  {
                    backgroundColor: theme.colors.elevation.level2,
                    borderLeftColor: theme.colors.primary,
                  },
                ]}
                onPress={() =>
                  navigation.navigate("SquareScreen", {
                    gridId: item.id,
                    inputTitle: item.title,
                    username: item.username,
                    deadline: item.deadline,
                    eventId: item.eventId,
                    disableAnimation: true,
                  })
                }
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <View>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: theme.colors.onBackground,
                      }}
                    >
                      {item.title}
                    </Text>
                    <Text
                      style={{ fontSize: 14, color: theme.colors.onSurface }}
                    >
                      {item.playerIds?.length || 0} players •{" "}
                      {item.deadline?.toDate?.() > new Date()
                        ? `Ends ${item.deadline.toDate().toLocaleDateString()}`
                        : "Finalized"}
                    </Text>
                  </View>

                  <MaterialIcons
                    name="chevron-right"
                    size={24}
                    color={theme.colors.onSurfaceVariant}
                  />
                </View>
              </TouchableOpacity>
            )}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}

        <JoinSessionModal
          visible={visible}
          onDismiss={() => setVisible(false)}
        />
        <ProfileModal
          visible={profileVisible}
          onDismiss={() => setProfileVisible(false)}
          userGames={userGames}
        />

        <TouchableOpacity
          style={[
            styles.howToButton,
            { backgroundColor: theme.colors.primary },
          ]}
          onPress={() => navigation.navigate("HowToScreen")}
        >
          <Text style={styles.howToText}>How to Play</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </LinearGradient>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
    borderRadius: 16,
    padding: 16,
    marginBottom: 0,
    marginHorizontal: 4,
    borderWidth: 1,
    borderLeftWidth: 5,
    borderLeftColor: colors.primary,
    borderColor: "rgba(94, 96, 206, 0.4)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },

  howToButton: {
    marginTop: 10,
    alignSelf: "center",
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
