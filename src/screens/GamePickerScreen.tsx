import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Dialog, Portal, Button, Provider, useTheme } from "react-native-paper";
import colors from "../../assets/constants/colorOptions";
import Icon from "react-native-vector-icons/MaterialIcons";

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
  const theme = useTheme();
  const isDarkMode = theme.dark;

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
            homeLogo: home.team.logo ?? null,
            awayTeam: away.team.displayName,
            awayLogo: away.team.logo ?? null,
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
    <Provider>
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.colors.elevation.level2,
              borderColor: isDarkMode ? "#444" : "#ddd",
            },
          ]}
        >
          <Text
            style={[styles.weekLabel, { color: theme.colors.onBackground }]}
          >
            {formatWeekLabel(weekStart)}
          </Text>
          <View style={styles.navButtons}>
            <TouchableOpacity
              onPress={() => weekOffset > 0 && setWeekOffset(weekOffset - 1)}
              disabled={weekOffset <= 0}
              style={[
                styles.navButton,
                weekOffset <= 0 && { backgroundColor: theme.colors.error }, // ✅ inline dynamic style
              ]}
            >
              <Text style={styles.navButtonText}>← Prev</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowWeekModal(true)}
              style={[
                styles.navButtonAlt,
                { backgroundColor: theme.colors.elevation.level1 },
              ]}
            >
              <View style={styles.altButtonContent}>
                <Icon
                  name="calendar-today"
                  size={18}
                  color={theme.colors.onSurface}
                  style={{ marginRight: 6 }}
                />

                <Text
                  style={[
                    styles.navButtonAltText,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  Select Week
                </Text>
              </View>
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
          <Text
            style={[
              styles.noGamesText,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            No NFL games scheduled for this week.
          </Text>
        ) : (
          <FlatList
            data={games}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.card, { backgroundColor: theme.colors.surface }]}
                onPress={() => handleSelectGame(item)}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  {item.awayLogo && (
                    <Image
                      source={{ uri: item.awayLogo }}
                      style={{ width: 24, height: 24, marginRight: 6 }}
                      resizeMode="contain"
                    />
                  )}
                  <Text
                    style={[styles.gameText, { color: theme.colors.onSurface }]}
                  >
                    {item.awayTeam}
                  </Text>

                  <Text
                    style={[
                      styles.gameText,
                      { color: theme.colors.onSurface },
                      { marginHorizontal: 6 },
                    ]}
                  >
                    @
                  </Text>

                  {item.homeLogo && (
                    <Image
                      source={{ uri: item.homeLogo }}
                      style={{ width: 24, height: 24, marginRight: 6 }}
                      resizeMode="contain"
                    />
                  )}
                  <Text
                    style={[styles.gameText, { color: theme.colors.onSurface }]}
                  >
                    {item.homeTeam}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.dateText,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Kickoff: {new Date(item.date).toLocaleString()}
                </Text>
                <Text
                  style={[
                    styles.statusText,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Status: {item.status}
                </Text>
              </TouchableOpacity>
            )}
          />
        )}
      </SafeAreaView>
      <Portal>
        <Dialog
          visible={showWeekModal}
          onDismiss={() => setShowWeekModal(false)}
          style={[
            styles.dialogContainer,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Dialog.Title
            style={[styles.dialogTitle, { color: theme.colors.onSurface }]}
          >
            Select Your Week
          </Dialog.Title>

          <Dialog.ScrollArea>
            <ScrollView style={styles.scrollArea}>
              {Array.from({ length: 20 }, (_, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.weekItem}
                  onPress={() => {
                    setWeekOffset(i);
                    setShowWeekModal(false);
                  }}
                >
                  <Text
                    style={[styles.weekText, { color: theme.colors.onSurface }]}
                  >
                    {formatWeekLabel(getStartOfWeek(i))}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Dialog.ScrollArea>

          <Dialog.Actions>
            <Button
              onPress={() => setShowWeekModal(false)}
              textColor={theme.colors.primary}
            >
              Cancel
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Provider>
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
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
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
  navButtonAlt: {
    backgroundColor: "#eee",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  navButtonAltText: {
    color: "#333",
    fontWeight: "600",
  },
  altButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  dialogContainer: {
    backgroundColor: "#fefefe",
    borderRadius: 16,
    elevation: 5,
    marginHorizontal: 20,
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#222",
    textAlign: "center",
  },
  scrollArea: {
    maxHeight: 320,
    paddingHorizontal: 16,
  },
  weekItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  weekText: {
    fontSize: 16,
    color: "#333",
  },
});

export default GamePickerScreen;
