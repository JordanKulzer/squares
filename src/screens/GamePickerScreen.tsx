import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Platform,
  Animated,
} from "react-native";
import {
  useRoute,
  useNavigation,
  RouteProp,
  StackActions,
} from "@react-navigation/native";
import {
  Dialog,
  Portal,
  Button,
  Provider,
  useTheme,
  Chip,
} from "react-native-paper";
import DateTimePicker from "@react-native-community/datetimepicker";
import Icon from "react-native-vector-icons/MaterialIcons";
import Icons from "react-native-vector-icons/Ionicons";

import colors from "../../assets/constants/colorOptions";
import { API_BASE_URL } from "../utils/apiConfig";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import DateSelectorModal from "../components/DateSelectorModal";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";

const gameTypeBehaviors = {
  NFL: { usesWeeks: true, startDate: new Date("2025-07-28T12:00:00") },
  NCAAF: { usesWeeks: true, startDate: new Date("2025-08-24T12:00:00") },
  // NBA: { usesWeeks: false },
  // MLB: { usesWeeks: false },
  // NHL: { usesWeeks: false },
};
const gameTypes = ["NFL", "NCAAF"] as const; // "NBA", "MLB", "NHL"];
type GameType = (typeof gameTypes)[number]; // "NFL" | "NCAAF"
const AnimatedChipBase = Animated.createAnimatedComponent(Chip);

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

const formatDateLabel = (date) =>
  date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

const getStartOfWeek = (gameType, offsetWeeks = 0) => {
  const base = new Date(gameTypeBehaviors[gameType]?.startDate || new Date());
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
  const navigation = useNavigation<GamePickerScreenNavigationProp>();
  const route = useRoute<GamePickerScreenRouteProp>();

  const theme = useTheme();
  const isDarkMode = theme.dark;

  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [weekStart, setWeekStart] = useState(getStartOfWeek("NFL"));
  const [gameType, setGameType] = useState<GameType>("NFL");
  const [deadline, setDeadline] = useState(new Date());
  const [showWeekModal, setShowWeekModal] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const selectedSport = gameType.toLowerCase(); // derived, no state

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

  const fetchGamesForDate = async (date) => {
    const formattedDate = date.toISOString().split("T")[0];
    try {
      const path =
        gameType === "NFL"
          ? "/schedule"
          : gameType === "NCAAF"
          ? "/ncaaf/schedule"
          : null;

      if (!path) {
        return []; // For now, skip unsupported sports
      }
      console.log(path);

      const res = await fetch(
        `${API_BASE_URL}${path}?startDate=${formattedDate}`
      );
      return await res.json();
    } catch (err) {
      console.warn("Failed to fetch games:", err);
      return [];
    }
  };

  useEffect(() => {
    const loadGames = async () => {
      const dateToUse = gameTypeBehaviors[gameType]?.usesWeeks
        ? getStartOfWeek(gameType, weekOffset)
        : calendarDate;

      if (gameTypeBehaviors[gameType]?.usesWeeks) {
        setWeekStart(dateToUse);
      }

      setLoading(true);
      const weekGames = await fetchGamesForDate(dateToUse);

      const extractedGames = Array.isArray(weekGames)
        ? weekGames
        : Array.isArray(weekGames?.games)
        ? weekGames.games
        : [];

      setGames(extractedGames);
      setLoading(false);
    };

    loadGames();
  }, [weekOffset, gameType, calendarDate, selectedSport]);

  const handleSelectGame = (game) => {
    navigation.dispatch(StackActions.pop(1));
    navigation.navigate("CreateSquareScreen", {
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

  const incrementDate = (days: number) => {
    const newDate = new Date(calendarDate);
    newDate.setDate(newDate.getDate() + days);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (newDate >= today) {
      setCalendarDate(newDate);
    }
  };

  type AnimatedChipProps = {
    type: string;
    selectedKey: string;
    onPress: () => void;
  };

  const AnimatedChip: React.FC<AnimatedChipProps> = ({
    type,
    selectedKey,
    onPress,
  }) => {
    const theme = useTheme();
    const localScale = useRef(new Animated.Value(1)).current;
    const isSelected = selectedKey === type;

    const handlePress = () => {
      localScale.setValue(0.9);

      Animated.spring(localScale, {
        toValue: 1.02,
        friction: 2,
        tension: 160,
        useNativeDriver: true,
      }).start(() => {
        Animated.spring(localScale, {
          toValue: 1,
          friction: 5,
          tension: 120,
          useNativeDriver: true,
        }).start();
      });

      setTimeout(() => {
        if (!isSelected) onPress();
      }, 50);
    };

    return (
      <AnimatedChipBase
        onPress={handlePress}
        selected={isSelected}
        selectedColor={theme.colors.onPrimary}
        mode="outlined"
        icon={() =>
          isSelected ? (
            <Icon
              name="check"
              size={18}
              color={theme.colors.onPrimary}
              style={{ marginRight: 4 }}
            />
          ) : null
        }
        style={{
          marginRight: 8,
          height: 36,
          alignSelf: "center",
          minWidth: 175,
          transform: [{ scale: localScale }],
          backgroundColor: isSelected
            ? theme.colors.primary
            : theme.colors.surfaceVariant,
        }}
        textStyle={{
          color: isSelected
            ? theme.colors.onPrimary
            : theme.colors.onSurfaceVariant,
          fontWeight: "600",
        }}
      >
        {type}
      </AnimatedChipBase>
    );
  };

  const GameTypeSelector = ({ selected, onSelect }) => {
    const theme = useTheme();

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8 }}
        style={{ maxHeight: 48 }}
      >
        {gameTypes.map((type) => {
          const sportMap = {
            NFL: "nfl",
            NCAAF: "ncaaf",
          };

          return (
            <AnimatedChip
              key={type}
              type={type}
              selectedKey={selected}
              onPress={() => onSelect(type)}
            />
          );
        })}
      </ScrollView>
    );
  };

  const dividerColor = theme.dark ? "#333" : "#eee";

  const dialogCardStyle = {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(94, 96, 206, 0.4)",
    borderLeftWidth: 5,
    borderLeftColor: theme.colors.primary,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    marginHorizontal: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
  };

  return (
    <Provider>
      <LinearGradient
        colors={theme.dark ? ["#1e1e1e", "#121212"] : ["#fdfcf9", "#e0e7ff"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <GameTypeSelector selected={gameType} onSelect={setGameType} />

          <View
            style={[
              styles.header,
              {
                // backgroundColor: theme.colors.elevation.level2,
                // borderColor: isDarkMode ? "#444" : "#ddd",
              },
            ]}
          >
            {gameTypeBehaviors[gameType]?.usesWeeks ? (
              <>
                <Text
                  style={[
                    styles.weekLabel,
                    { color: theme.colors.onBackground },
                  ]}
                >
                  {" "}
                  {formatWeekLabel(weekStart)}
                </Text>
                <View style={styles.navButtons}>
                  <TouchableOpacity
                    onPress={() =>
                      weekOffset > 0 && setWeekOffset(weekOffset - 1)
                    }
                    disabled={weekOffset <= 0}
                    style={[
                      styles.navButton,
                      weekOffset <= 0 && {
                        backgroundColor: theme.colors.error,
                      },
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
              </>
            ) : (
              <>
                <Text
                  style={[
                    styles.weekLabel,
                    { color: theme.colors.onBackground },
                  ]}
                >
                  {" "}
                  {formatDateLabel(calendarDate)}
                </Text>
                <View style={styles.navButtons}>
                  <TouchableOpacity
                    onPress={() => incrementDate(-1)}
                    style={[
                      styles.navButton,
                      calendarDate.toDateString() ===
                        new Date().toDateString() && {
                        backgroundColor: theme.colors.error,
                      },
                    ]}
                  >
                    <Text style={styles.navButtonText}>← Prev</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setShowCalendar(true)}
                    style={[
                      styles.navButtonAlt,
                      { backgroundColor: theme.colors.elevation.level1 },
                    ]}
                  >
                    <View style={styles.altButtonContent}>
                      <Icon
                        name="event"
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
                        Select Date
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => incrementDate(1)}
                    style={[styles.navButton, { paddingHorizontal: 12 }]}
                  >
                    <Text style={styles.navButtonText}>Next →</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          {
            // gameType === "NBA" || gameType === "MLB" || gameType === "NHL" ? (
            //   <Text
            //     style={[
            //       styles.noGamesText,
            //       { color: theme.colors.onSurfaceVariant },
            //     ]}
            //   >
            //     Support for {gameType} is coming soon.
            //   </Text>
            // ) :
            loading ? (
              <ActivityIndicator size="large" style={{ marginTop: 30 }} />
            ) : games.length === 0 ? (
              <Text
                style={[
                  styles.noGamesText,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                No {gameType} games scheduled.
              </Text>
            ) : (
              <View style={{ flex: 1 }}>
                <FlatList
                  data={games}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={{ paddingBottom: 20 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        dialogCardStyle,
                        { backgroundColor: theme.colors.surface },
                      ]}
                      onPress={() => handleSelectGame(item)}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              marginBottom: 6,
                            }}
                          >
                            <Text
                              style={[
                                styles.gameText,
                                { color: theme.colors.onSurface },
                              ]}
                            >
                              {item.awayTeam}
                            </Text>
                            <Text
                              style={[
                                styles.gameText,
                                {
                                  color: theme.colors.onSurface,
                                  marginHorizontal: 6,
                                },
                              ]}
                            >
                              @
                            </Text>
                            <Text
                              style={[
                                styles.gameText,
                                { color: theme.colors.onSurface },
                              ]}
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
                        </View>

                        <MaterialIcons
                          name="chevron-right"
                          size={24}
                          color={theme.colors.onSurfaceVariant}
                        />
                      </View>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )
          }
        </SafeAreaView>
      </LinearGradient>

      {showCalendar && (
        <DateSelectorModal
          visible={showCalendar}
          date={calendarDate}
          onDismiss={() => setShowCalendar(false)}
          onConfirm={(newDate) => setCalendarDate(newDate)}
        />
      )}

      <Portal>
        <Dialog
          visible={showWeekModal}
          onDismiss={() => setShowWeekModal(false)}
          style={[dialogCardStyle, { backgroundColor: theme.colors.surface }]}
        >
          <Dialog.Title
            style={[styles.dialogTitle, { color: theme.colors.onSurface }]}
          >
            Select Your Week
          </Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView style={styles.scrollArea}>
              {Array.from({ length: 20 }, (_, i) => (
                <React.Fragment key={i}>
                  <TouchableOpacity
                    style={styles.weekItem}
                    onPress={() => {
                      setWeekOffset(i);
                      setShowWeekModal(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.weekText,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      {formatWeekLabel(getStartOfWeek(gameType, i))}
                    </Text>
                    <Icons
                      name="chevron-forward"
                      size={20}
                      color={theme.colors.onSurface}
                      style={{ paddingRight: 15 }}
                    />
                  </TouchableOpacity>
                  <View
                    style={{
                      height: 1,
                      backgroundColor: dividerColor,
                    }}
                  />
                </React.Fragment>
              ))}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button
              onPress={() => setShowWeekModal(false)}
              textColor={theme.colors.error}
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
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    // borderBottomWidth: 1,
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
    paddingHorizontal: 8,
    paddingTop: 4,
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
    borderRadius: 16,
    elevation: 5,
    marginHorizontal: 20,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  scrollArea: {
    maxHeight: 320,
  },
  weekItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  weekText: {
    marginVertical: 20,
    // paddingVertical: 12,
  },
});

export default GamePickerScreen;
