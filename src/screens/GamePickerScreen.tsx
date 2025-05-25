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
import { useNavigation } from "@react-navigation/native";

const PRESEASON_START = new Date("2025-07-28T12:00:00");

const formatDate = (date) => date.toISOString().split("T")[0].replace(/-/g, "");

const getStartOfWeek = (offsetWeeks = 0) => {
  const base = new Date(PRESEASON_START);
  base.setDate(base.getDate() + offsetWeeks * 7);
  base.setHours(12, 0, 0, 0);
  return base;
};

const formatWeekLabel = (date) =>
  `Week of ${date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })}`;

const GamePickerScreen = () => {
  const navigation = useNavigation();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [weekStart, setWeekStart] = useState(getStartOfWeek(0));
  const [showWeekModal, setShowWeekModal] = useState(false);

  const fetchGamesForWeek = async (startDate) => {
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
    navigation.navigate("CreateSquareScreen", {
      team1: game.awayTeam,
      team2: game.homeTeam,
      deadline: game.date,
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

      {showWeekModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Jump to a Week</Text>
            <FlatList
              data={Array.from({ length: 22 }, (_, i) => i)}
              keyExtractor={(item) => item.toString()}
              renderItem={({ item }) => {
                const labelDate = getStartOfWeek(item);
                return (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => {
                      setShowWeekModal(false);
                      setWeekOffset(item);
                    }}
                  >
                    <Text style={styles.modalItemText}>
                      Week of{" "}
                      {labelDate.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setShowWeekModal(false)}
            >
              <Text style={{ color: "#fff" }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  modalContainer: {
    backgroundColor: "#fff",
    width: "80%",
    maxHeight: "70%",
    borderRadius: 10,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  modalItem: {
    paddingVertical: 12,
    borderBottomColor: "#ddd",
    borderBottomWidth: 1,
  },
  modalItemText: {
    fontSize: 16,
  },
  closeModalButton: {
    marginTop: 16,
    backgroundColor: "#007AFF",
    padding: 12,
    alignItems: "center",
    borderRadius: 8,
  },
});

export default GamePickerScreen;
