import React, {
  useState,
  useCallback,
  useLayoutEffect,
  useEffect,
  useRef,
} from "react";
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { IconButton, useTheme } from "react-native-paper";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import ProfileModal from "../components/ProfileModal";
import JoinSessionModal from "../components/JoinSessionModal";
import colors from "../../assets/constants/colorOptions";
import { Animated } from "react-native";
import { RootStackParamList } from "../utils/types";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { supabase } from "../lib/supabase";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const HomeScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const theme = useTheme();
  const animations = useRef<Animated.Value[]>([]).current;

  const translateYAnims = useRef<Animated.Value[]>([]).current;
  const opacityAnims = useRef<Animated.Value[]>([]).current;
  const insets = useSafeAreaInsets();

  const gradientColors = theme.dark
    ? (["#121212", "#1d1d1d", "#2b2b2d"] as const)
    : (["#fdfcf9", "#e0e7ff"] as const);

  const [userGames, setUserGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [profileVisible, setProfileVisible] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [selectionCounts, setSelectionCounts] = useState<
    Record<string, number>
  >({});
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useFocusEffect(
    useCallback(() => {
      const fetchUserSquares = async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from("squares")
          .select("*")
          .contains("player_ids", [user.id]);

        if (error) {
          console.error("Error fetching squares:", error);
          return;
        }

        const squaresList = data.map((item) => {
          const userPlayer = item.players?.find((p) => p.uid === user.id);
          return {
            id: item.id,
            ...item,
            eventId: item.event_id,
            username: userPlayer?.username || "Unknown",
          };
        });

        setUserGames(squaresList);
        const counts: Record<string, number> = {};
        squaresList.forEach((square) => {
          const squareId = square.id;
          const squareSelections = square.selections || [];

          const userCount = squareSelections.filter(
            (sel) => sel.userId === user.id
          ).length;

          counts[squareId] = userCount;
        });

        setSelectionCounts(counts);

        animations.length = 0;
        translateYAnims.length = 0;
        opacityAnims.length = 0;

        squaresList.forEach((_, index) => {
          animations[index] = new Animated.Value(0);
          translateYAnims[index] = new Animated.Value(30);
          opacityAnims[index] = new Animated.Value(0);
        });

        Animated.stagger(
          80,
          squaresList.map((_, index) =>
            Animated.parallel([
              Animated.timing(translateYAnims[index], {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
              }),
              Animated.timing(opacityAnims[index], {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
              }),
            ])
          )
        ).start();

        setLoading(false);
      };

      fetchUserSquares();
    }, [])
  );

  const fetchFirstName = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("users")
        .select("first_name")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user name:", error);
        return;
      }

      setFirstName(data?.first_name || "");
    } catch (err) {
      console.error("Unexpected error:", err);
    }
  };

  useEffect(() => {
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

  const plural = (n: number, s: string) => `${n} ${s}${n === 1 ? "" : "s"}`;

  const formatCountdown = (deadlineLike?: string | Date) => {
    if (!deadlineLike) return "Ended";
    const d = new Date(deadlineLike);
    const diff = d.getTime() - now.getTime();

    if (isNaN(d.getTime())) return "Ended";
    if (diff <= 0) {
      return `Ended on ${d.toLocaleDateString()}`;
    }

    let ms = diff;
    const days = Math.floor(ms / (24 * 60 * 60 * 1000));
    ms -= days * 24 * 60 * 60 * 1000;
    const hours = Math.floor(ms / (60 * 60 * 1000));
    ms -= hours * 60 * 60 * 1000;
    const mins = Math.floor(ms / (60 * 1000));

    const parts: string[] = [];
    if (days > 0) parts.push(plural(days, "day"));
    if (hours > 0 || days > 0) parts.push(plural(hours, "hr"));
    parts.push(plural(mins, "min"));

    return `Ends in ${parts.join(" ")}`;
  };

  const isNewUser = !loading && userGames.length === 0;
  const welcomeTitle = isNewUser
    ? `Welcome${firstName ? `, ${firstName}` : ""}!`
    : `Welcome Back${firstName ? `, ${firstName}` : ""}!`;

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
      <View style={{ flex: 1 }}>
        <View style={{ alignItems: "center", marginVertical: 10 }}>
          <Text
            style={{
              fontSize: 22,
              fontWeight: "bold",
              fontFamily: "SoraBold",
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
              fontFamily: "Sora",
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
            marginHorizontal: 10,
            fontFamily: "Sora",
            color: theme.colors.onBackground,
          }}
        >
          Quick Start
        </Text>
        <View style={{ paddingHorizontal: 5 }}>
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
        </View>
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            marginTop: 15,
            marginBottom: 10,
            marginHorizontal: 10,
            fontFamily: "Sora",
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
          <ScrollView
            style={{ paddingHorizontal: 5 }}
            contentContainerStyle={{ paddingBottom: 100 }}
          >
            {userGames.map((item, index) => {
              return (
                <Animated.View
                  key={item.id}
                  style={{
                    opacity: opacityAnims[index] || new Animated.Value(1),
                    transform: [
                      {
                        translateY:
                          translateYAnims[index] || new Animated.Value(0),
                      },
                    ],
                  }}
                >
                  <TouchableOpacity
                    style={[
                      styles.gameCard,
                      {
                        backgroundColor: theme.colors.surface,
                        borderLeftColor: theme.colors.primary,
                      },
                    ]}
                    onPress={() => {
                      navigation.navigate("SquareScreen", {
                        gridId: item.id,
                        inputTitle: item.title,
                        username: item.username,
                        deadline: item.deadline,
                        eventId: item.eventId,
                        disableAnimation: true,
                        pricePerSquare: item.price_per_square || 0,
                      });
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <View>
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <Text
                            numberOfLines={1}
                            ellipsizeMode="tail"
                            style={{
                              fontSize: 16,
                              fontWeight: "600",
                              color: theme.colors.onBackground,
                              fontFamily: "SoraBold",
                              flexShrink: 1,
                              marginRight: 8,
                            }}
                          >
                            {item.title}
                          </Text>
                          <Text> {formatCountdown(item.deadline)}</Text>
                        </View>

                        <Text
                          style={{
                            fontSize: 14,
                            color: theme.colors.onSurface,
                            fontFamily: "Sora",
                          }}
                        >
                          {item.player_ids?.length || 0} players •{" "}
                          {selectionCounts[item.id] || 0} selected
                        </Text>
                      </View>

                      <MaterialIcons
                        name="chevron-right"
                        size={24}
                        color={theme.colors.onSurfaceVariant}
                      />
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </ScrollView>
        )}

        <JoinSessionModal
          visible={visible}
          onDismiss={() => setVisible(false)}
        />
        <ProfileModal
          visible={profileVisible}
          onDismiss={() => setProfileVisible(false)}
          userGames={userGames}
          onNameChange={() => {
            fetchFirstName();
          }}
        />
        {/* <TouchableOpacity
          onPress={() => navigation.navigate("ResetPasswordScreen")}
        >
          <Text>Test Reset Password Screen</Text>
        </TouchableOpacity> */}

        <TouchableOpacity
          style={[
            styles.howToButton,
            {
              backgroundColor: theme.colors.primary,
              position: "absolute",
              bottom: insets.bottom + 12,
              alignSelf: "center",
            },
          ]}
          onPress={() => navigation.navigate("HowToScreen")}
        >
          <Text style={styles.howToText}>How to Play</Text>
        </TouchableOpacity>
      </View>
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
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    paddingLeft: 5,
    fontFamily: "Sora",
  },
  gameCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 0,
    borderWidth: 1,
    borderLeftWidth: 5,
    borderLeftColor: colors.primary,
    borderColor: "rgba(94, 96, 206, 0.4)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  howToButton: {
    marginTop: 15,
    alignSelf: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  howToText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Sora",
  },
});
