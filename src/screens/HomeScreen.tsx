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
  Animated,
} from "react-native";
import ReanimatedSwipeable, {
  SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import {
  IconButton,
  useTheme,
  Portal,
  Modal,
  Button,
} from "react-native-paper";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import JoinSessionModal from "../components/JoinSessionModal";
import SkeletonLoader from "../components/SkeletonLoader";
import { getPendingRequests } from "../lib/friends";
import { getInviteCount } from "../lib/gameInvites";
import colors from "../../assets/constants/colorOptions";
import { RootStackParamList } from "../utils/types";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { supabase } from "../lib/supabase";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import {
  cancelDeadlineNotifications,
  sendPlayerLeftNotification,
  sendSquareDeletedNotification,
} from "../utils/notifications";
import AdBanner from "../components/AdBanner";
// import PendingInvitesSection from "../components/PendingInvitesSection";

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
  const [username, setUsername] = useState("");
  const [hasNotifications, setHasNotifications] = useState(false);
  const [selectionCounts, setSelectionCounts] = useState<
    Record<string, number>
  >({});
  const [now, setNow] = useState(new Date());
  const [editMode, setEditMode] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    item: any;
    isOwner: boolean;
  }>({ visible: false, item: null, isOwner: false });
  const swipeableRefs = useRef<Record<string, SwipeableMethods | null>>({});

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
        setUserId(user.id);

        const { data, error } = await supabase
          .from("squares")
          .select(
            "id, title, deadline, price_per_square, event_id, league, players, selections, player_ids, game_completed, created_by",
          )
          .contains("player_ids", [user.id]);

        if (error) {
          console.error("Error fetching squares:", error);
          return;
        }

        const squaresList = data
          .map((item) => {
            const userPlayer = item.players?.find((p) => p.userId === user.id);
            return {
              id: item.id,
              ...item,
              eventId: item.event_id,
              username: userPlayer?.username || "Unknown",
            };
          })
          .sort((a, b) => {
            const da = a.deadline ? new Date(a.deadline).getTime() : Infinity;
            const db = b.deadline ? new Date(b.deadline).getTime() : Infinity;
            return db - da;
          });

        setUserGames(squaresList);
        const counts: Record<string, number> = {};
        squaresList.forEach((square) => {
          const squareId = square.id;
          const squareSelections = square.selections || [];

          const userCount = squareSelections.filter(
            (sel) => sel.userId === user.id,
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
            ]),
          ),
        ).start();

        setLoading(false);
      };

      fetchUserSquares();

      const checkNotifications = async () => {
        try {
          const [requests, inviteCount] = await Promise.all([
            getPendingRequests(),
            getInviteCount(),
          ]);
          setHasNotifications(requests.length > 0 || inviteCount > 0);
        } catch {
          // silently fail
        }
      };
      checkNotifications();
    }, []),
  );

  const fetchUsername = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("users")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching username:", error);
        return;
      }

      setUsername(data?.username || "");
    } catch (err) {
      console.error("Unexpected error:", err);
    }
  };

  useEffect(() => {
    fetchUsername();
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: {
        backgroundColor: theme.colors.surface,
      },
      headerRight: () => (
        <View style={{ marginRight: 8 }}>
          <IconButton
            icon="account-circle"
            size={24}
            onPress={() => navigation.navigate("ProfileScreen")}
            iconColor={theme.colors.onBackground}
          />
          {hasNotifications && (
            <View
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: theme.colors.error,
                borderWidth: 1.5,
                borderColor: theme.colors.surface,
              }}
            />
          )}
        </View>
      ),
    });
  }, [navigation, theme, hasNotifications]);

  const plural = (n: number, s: string) => `${n} ${s}${n === 1 ? "" : "s"}`;

  const formatCountdown = (
    deadlineLike?: string | Date,
    gameCompleted?: boolean,
  ) => {
    if (!deadlineLike) return "Ended";
    const d = new Date(deadlineLike);
    const diff = d.getTime() - now.getTime();

    if (isNaN(d.getTime())) return "Ended";
    if (diff <= 0) {
      // Deadline has passed
      if (gameCompleted) {
        return "Game Completed";
      }
      return "Game in Progress";
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

    return `Deadline in ${parts.join(" ")}`;
  };

  const isNewUser = !loading && userGames.length === 0;
  const welcomeTitle = isNewUser
    ? `Welcome${username ? `, ${username}` : ""}!`
    : `Welcome Back${username ? `, ${username}` : ""}!`;

  const welcomeSubtitle = isNewUser
    ? "Let's get started by joining or creating a square."
    : "Ready to play your next square?";

  const closeAllReanimatedSwipeables = () => {
    Object.values(swipeableRefs.current).forEach((ref) => ref?.close());
  };

  const handleLeaveSquare = async (item: any) => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("squares")
        .select("player_ids, players, selections, title")
        .eq("id", item.id)
        .single();

      if (error || !data) {
        Toast.show({
          type: "error",
          text1: "Session not found",
          position: "bottom",
          bottomOffset: 60,
        });
        return;
      }

      const updatedPlayerIds = (data.player_ids || []).filter(
        (id: string) => id !== userId,
      );
      const updatedPlayers = (data.players || []).filter(
        (p: any) => p.userId !== userId,
      );
      const updatedSelections = (data.selections || []).filter(
        (sel: any) => sel.userId !== userId,
      );

      await supabase
        .from("squares")
        .update({
          players: updatedPlayers,
          player_ids: updatedPlayerIds,
          selections: updatedSelections,
        })
        .eq("id", item.id);

      if (updatedPlayers.length === 0) {
        await supabase.from("squares").delete().eq("id", item.id);
      } else {
        const currentPlayer = item.players?.find(
          (p: any) => p.userId === userId,
        );
        await sendPlayerLeftNotification(
          item.id,
          currentPlayer?.username || "Unknown",
          data.title || item.title,
        );
      }

      await cancelDeadlineNotifications();

      setUserGames((prev) => prev.filter((g: any) => g.id !== item.id));

      Toast.show({
        type: "info",
        text1: `Left ${item.title}`,
        position: "bottom",
        bottomOffset: 60,
      });
    } catch (err) {
      console.error("Error leaving square:", err);
      Toast.show({
        type: "error",
        text1: "Failed to leave session",
        position: "bottom",
        bottomOffset: 60,
      });
    }
  };

  const handleDeleteSquare = async (item: any) => {
    try {
      await sendSquareDeletedNotification(
        item.id,
        item.title,
        item.players || [],
      );

      await supabase.from("squares").delete().eq("id", item.id);

      await cancelDeadlineNotifications();

      setUserGames((prev) => prev.filter((g: any) => g.id !== item.id));

      Toast.show({
        type: "success",
        text1: `Deleted ${item.title}`,
        position: "bottom",
        bottomOffset: 60,
      });
    } catch (err) {
      console.error("Error deleting square:", err);
      Toast.show({
        type: "error",
        text1: "Failed to delete session",
        position: "bottom",
        bottomOffset: 60,
      });
    }
  };

  const renderRightActions = (item: any, isOwner: boolean) => {
    return (
      <TouchableOpacity
        style={[
          styles.swipeAction,
          { backgroundColor: isOwner ? "#f44336" : "#FF9800" },
        ]}
        onPress={() => {
          closeAllReanimatedSwipeables();
          setConfirmModal({ visible: true, item, isOwner });
        }}
      >
        <MaterialIcons
          name={isOwner ? "delete" : "exit-to-app"}
          size={24}
          color="#fff"
        />
        <Text style={styles.swipeActionText}>
          {isOwner ? "Delete" : "Leave"}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <View style={{ flex: 1 }}>
        <View
          style={{
            alignItems: "center",
            justifyContent: "center",
            marginVertical: 10,
          }}
        >
          <Text
            style={{
              fontSize: 22,
              letterSpacing: 1,
              fontFamily: "Anton_400Regular",
              color: theme.colors.primary,
              textTransform: "uppercase",
              textAlign: "center",
            }}
          >
            {welcomeTitle}
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: theme.colors.onSurfaceVariant,
              marginTop: 4,
              fontFamily: "Rubik_600SemiBold",
              textAlign: "center",
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
            fontFamily: "Rubik_600SemiBold",
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

        {/* Pending Game Invites */}
        {/* <PendingInvitesSection /> */}

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 15,
            marginBottom: 10,
            marginHorizontal: 10,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              fontFamily: "Rubik_600SemiBold",
              color: theme.colors.onBackground,
            }}
          >
            Your Squares
          </Text>
          {userGames.length > 0 && (
            <TouchableOpacity onPress={() => setEditMode(!editMode)}>
              <Text
                style={{
                  color: theme.colors.primary,
                  fontSize: 14,
                  fontFamily: "Rubik_500Medium",
                }}
              >
                {editMode ? "Done" : "Edit"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <SkeletonLoader variant="homeScreen" />
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
            contentContainerStyle={{ paddingBottom: 160 }}
          >
            {userGames.map((item, index) => {
              const deadline = item.deadline
                ? new Date(item.deadline).getTime()
                : null;
              const nowMs = Date.now();
              const isGameCompleted = item.game_completed;
              const isPast = deadline && deadline < nowMs;
              const isOwner = item.created_by === userId;

              let borderColor = theme.colors.primary; // default: future
              if (deadline) {
                if (isGameCompleted) {
                  borderColor = "#4CAF50"; // green for completed
                } else if (isPast) {
                  borderColor = "#FF9800"; // orange for in progress
                } else if (deadline - nowMs < 24 * 60 * 60 * 1000) {
                  borderColor = "#f5c542"; // yellow for about to end
                }
              }
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
                  <ReanimatedSwipeable
                    ref={(ref) => {
                      swipeableRefs.current[item.id] = ref;
                    }}
                    renderRightActions={() => renderRightActions(item, isOwner)}
                    overshootRight={false}
                    friction={2}
                  >
                    <TouchableOpacity
                      style={[
                        styles.gameCard,
                        {
                          backgroundColor: theme.colors.surface,
                          borderLeftColor: borderColor,
                          borderColor: borderColor,
                        },
                      ]}
                      onPress={() => {
                        if (editMode) {
                          setConfirmModal({ visible: true, item, isOwner });
                        } else {
                          navigation.navigate("SquareScreen", {
                            gridId: item.id,
                            inputTitle: item.title,
                            username: item.username,
                            deadline: item.deadline,
                            eventId: item.eventId,
                            disableAnimation: true,
                            pricePerSquare: item.price_per_square || 0,
                            league: item.league || "NFL",
                          });
                        }
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        {editMode && (
                          <MaterialIcons
                            name="remove-circle"
                            size={24}
                            color={isOwner ? "#f44336" : "#FF9800"}
                            style={{ marginRight: 12 }}
                          />
                        )}
                        <View style={{ flex: 1 }}>
                          <View
                            style={{
                              flexDirection: "row",
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
                            <Text
                              style={{
                                fontSize: 14,
                                color: theme.colors.onSurface,
                                fontFamily: "Rubik_500Medium",
                              }}
                            >
                              {item.players?.length || 0} players •{" "}
                              {selectionCounts[item.id] || 0} selected
                            </Text>
                          </View>
                          <Text
                            style={{
                              fontSize: 14,
                              color: theme.colors.onSurface,
                              fontFamily: "Rubik_500Medium",
                            }}
                          >
                            {" "}
                            {formatCountdown(
                              item.deadline,
                              item.game_completed,
                            )}
                          </Text>
                        </View>

                        {!editMode && (
                          <MaterialIcons
                            name="chevron-right"
                            size={24}
                            color={theme.colors.onSurfaceVariant}
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  </ReanimatedSwipeable>
                </Animated.View>
              );
            })}
          </ScrollView>
        )}

        <JoinSessionModal
          visible={visible}
          onDismiss={() => setVisible(false)}
        />

        {/* Banner Ad */}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            alignItems: "center",
            backgroundColor: theme.colors.surface,
            paddingBottom: insets.bottom,
          }}
        >
          <AdBanner />
        </View>

        {/* Confirmation Modal for Leave/Delete */}
        <Portal>
          <Modal
            visible={confirmModal.visible}
            onDismiss={() =>
              setConfirmModal({ visible: false, item: null, isOwner: false })
            }
            contentContainerStyle={{ backgroundColor: "transparent" }}
          >
            <View
              style={[
                styles.dialogCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.dark ? "#444" : "#ccc",
                },
              ]}
            >
              <Text
                style={[styles.modalTitle, { color: theme.colors.onSurface }]}
              >
                {confirmModal.isOwner ? "Delete Session" : "Leave Session"}
              </Text>
              <View
                style={{
                  height: 1,
                  backgroundColor: theme.dark ? "#333" : "#eee",
                  marginBottom: 20,
                }}
              />
              <Text
                style={[
                  styles.modalSubtitle,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {confirmModal.isOwner
                  ? `Are you sure you want to permanently delete "${confirmModal.item?.title}"? This cannot be undone.`
                  : `Are you sure you want to leave "${confirmModal.item?.title}"? Your squares will be removed.`}
              </Text>
              <View style={styles.modalButtonRow}>
                <Button
                  onPress={() =>
                    setConfirmModal({
                      visible: false,
                      item: null,
                      isOwner: false,
                    })
                  }
                >
                  Cancel
                </Button>
                <Button
                  onPress={async () => {
                    const item = confirmModal.item;
                    const isOwner = confirmModal.isOwner;
                    setConfirmModal({
                      visible: false,
                      item: null,
                      isOwner: false,
                    });
                    if (isOwner) {
                      await handleDeleteSquare(item);
                    } else {
                      await handleLeaveSquare(item);
                    }
                  }}
                  mode="text"
                  textColor={theme.colors.error}
                  labelStyle={{ fontSize: 16 }}
                >
                  {confirmModal.isOwner ? "Delete" : "Leave"}
                </Button>
              </View>
            </View>
          </Modal>
        </Portal>
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
    fontSize: 18,
    fontWeight: "600",
    paddingLeft: 5,
    fontFamily: "Rubik_600SemiBold",
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
  swipeAction: {
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    height: "100%",
    borderRadius: 16,
    marginLeft: 8,
  },
  swipeActionText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Rubik_500Medium",
    marginTop: 4,
  },
  dialogCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderLeftWidth: 5,
    borderLeftColor: colors.primary,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    marginHorizontal: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
    fontFamily: "Rubik_600SemiBold",
  },
  modalSubtitle: {
    fontSize: 15,
    marginBottom: 20,
    fontFamily: "Rubik_400Regular",
  },
  modalButtonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
});
