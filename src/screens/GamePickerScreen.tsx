import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import {
  useRoute,
  RouteProp,
  useNavigation,
  NavigationProp,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

const PRESEASON_START = new Date("2025-07-28T12:00:00");

type RootStackParamList = {
  CreateSquareScreen: {
    team1?: string;
    team2?: string;
    deadline?: string;
    inputTitle?: string;
    username?: string;
    maxSelections?: string;
    selectedColor?: string;
    eventId?: string;
  };
};

type GamePickerScreenRouteProp = RouteProp<
  RootStackParamList,
  "CreateSquareScreen"
>;

type GamePickerScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "CreateSquareScreen"
>;

const formatDate = (date: Date) =>
  date.toISOString().split("T")[0].replace(/-/g, "");

const getStartOfWeek = (offsetWeeks = 0) => {
  const base = new Date(PRESEASON_START);
  base.setDate(base.getDate() + offsetWeeks * 7);
  base.setHours(12, 0, 0, 0);
  return base;
};

const formatWeekLabel = (date: Date) =>
  `Week of ${date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })}`;

const GamePickerScreen = () => {
  const navigation = useNavigation<GamePickerScreenNavigationProp>();
  const route = useRoute<GamePickerScreenRouteProp>();

  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [weekStart, setWeekStart] = useState(getStartOfWeek(0));
  const [showWeekModal, setShowWeekModal] = useState(false);
  const [deadline, setDeadline] = useState(new Date());

  const {
    inputTitle = "",
    username = "",
    selectedColor = null,
    maxSelections = "",
    deadline: incomingDeadline,
  } = route.params || {};

  useEffect(() => {
    if (incomingDeadline) setDeadline(new Date(incomingDeadline));
  }, [incomingDeadline]);

  const fetchGamesForWeek = async (startDate: Date) => {
    const allGames = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const formattedDate = formatDate(date);

      try {
        const res = await fetch(
          `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${formattedDate}`
        );
        const data = await res.json();
        const events = data.events || [];

        events.forEach((event) => {
          const comp = event.competitions[0];
          const home = comp.competitors.find((c) => c.homeAway === "home");
          const away = comp.competitors.find((c) => c.homeAway === "away");

          allGames.push({
            id: event.id,
            date: event.date,
            status: event.status.type.name,
            homeTeam: home.team.displayName,
            awayTeam: away.team.displayName,
          });
        });
      } catch (err) {
        console.warn("Failed to fetch games for", formattedDate);
      }
    }

    return allGames;
  };

  useEffect(() => {
    const loadGames = async () => {
      const start = getStartOfWeek(weekOffset);
      setWeekStart(start);
      setLoading(true);
      const weekGames = await fetchGamesForWeek(start);
      setGames(weekGames);
      setLoading(false);
    };

    loadGames();
  }, [weekOffset]);

  const handleSelectGame = (game) => {
    navigation.replace("CreateSquareScreen", {
      team1: game.awayTeam,
      team2: game.homeTeam,
      deadline: game.date,
      inputTitle,
      username,
      selectedColor,
      maxSelections,
      eventId: game.id,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.weekLabel}>{formatWeekLabel(weekStart)}</Text>
        <View style={styles.navButtons}>
          <TouchableOpacity
            onPress={() => weekOffset > 0 && setWeekOffset(weekOffset - 1)}
            disabled={weekOffset <= 0}
            style={[
              styles.navButton,
              weekOffset <= 0 && styles.navButtonDisabled,
            ]}
          >
            <Text style={styles.navButtonText}>← Prev</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowWeekModal(true)}
            style={[styles.navButton, { backgroundColor: "#555" }]}
          >
            <Text style={styles.navButtonText}>🗓️ Select Week</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setWeekOffset(weekOffset + 1)}
            style={styles.navButton}
          >
            <Text style={styles.navButtonText}>Next →</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 30 }} />
      ) : games.length === 0 ? (
        <Text style={styles.noGamesText}>
          No NFL games scheduled for this week.
        </Text>
      ) : (
        <FlatList
          data={games}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => handleSelectGame(item)}
            >
              <Text style={styles.gameText}>
                🏈 {item.awayTeam} @ {item.homeTeam}
              </Text>
              <Text style={styles.dateText}>
                Kickoff: {new Date(item.date).toLocaleString()}
              </Text>
              <Text style={styles.statusText}>Status: {item.status}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9f9" },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },
  weekLabel: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  navButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  navButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  navButtonDisabled: {
    backgroundColor: "#ccc",
  },
  navButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 10,
    elevation: 2,
  },
  gameText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },
  dateText: {
    color: "#444",
    marginBottom: 2,
  },
  statusText: {
    fontSize: 12,
    color: "#888",
  },
  noGamesText: {
    marginTop: 40,
    textAlign: "center",
    fontSize: 16,
    color: "#888",
  },
});

export default GamePickerScreen;
