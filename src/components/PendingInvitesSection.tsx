import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "react-native-paper";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import Toast from "react-native-toast-message";
import { getPendingInvites, rejectInvite } from "../lib/gameInvites";
import { GameInviteWithSender } from "../types/gameInvites";
import { RootStackParamList } from "../utils/types";

const PendingInvitesSection: React.FC = () => {
  const theme = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [invites, setInvites] = useState<GameInviteWithSender[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const loadInvites = useCallback(async () => {
    try {
      const data = await getPendingInvites();
      setInvites(data);
    } catch (err) {
      console.error("Error loading invites:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadInvites();
    }, [loadInvites]),
  );

  const handleAccept = async (invite: GameInviteWithSender) => {
    setProcessingIds((prev) => new Set(prev).add(invite.id));

    try {
      // Navigate to JoinSquareScreen with inviteId - invite will be marked as accepted
      // only after the user completes joining (this allows pressing back to keep invite)
      navigation.navigate("JoinSquareScreen", {
        sessionId: invite.grid_id,
        inviteId: invite.id,
      });
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(invite.id);
        return newSet;
      });
    }
  };

  const handleReject = async (invite: GameInviteWithSender) => {
    setProcessingIds((prev) => new Set(prev).add(invite.id));

    try {
      const result = await rejectInvite(invite.id);

      if (result.success) {
        setInvites((prev) => prev.filter((i) => i.id !== invite.id));
        Toast.show({
          type: "info",
          text1: "Invite declined",
          position: "bottom",
          bottomOffset: 60,
        });
      } else {
        Toast.show({
          type: "error",
          text1: result.error || "Failed to decline invite",
          position: "bottom",
          bottomOffset: 60,
        });
      }
    } catch (err) {
      console.error("Error rejecting invite:", err);
      Toast.show({
        type: "error",
        text1: "Failed to decline invite",
        position: "bottom",
        bottomOffset: 60,
      });
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(invite.id);
        return newSet;
      });
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialIcons name="mail" size={20} color={theme.colors.primary} />
          <Text style={[styles.title, { color: theme.colors.onBackground }]}>
            Square Invites
          </Text>
          <View
            style={[
              styles.badge,
              {
                backgroundColor:
                  invites.length > 0
                    ? theme.colors.primary
                    : theme.colors.surfaceVariant,
              },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                {
                  color:
                    invites.length > 0 ? "#fff" : theme.colors.onSurfaceVariant,
                },
              ]}
            >
              {invites.length}
            </Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      ) : invites.length === 0 ? (
        <Text
          style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}
        >
          No pending invites
        </Text>
      ) : (
        <View style={styles.invitesList}>
          {invites.map((invite) => {
            const isProcessing = processingIds.has(invite.id);

            return (
              <View
                key={invite.id}
                style={[
                  styles.inviteCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.primary,
                    opacity: isProcessing ? 0.6 : 1,
                  },
                ]}
              >
                <View style={styles.inviteContent}>
                  <View style={styles.inviteInfo}>
                    <Text
                      style={[
                        styles.gameName,
                        { color: theme.colors.onBackground },
                      ]}
                      numberOfLines={1}
                    >
                      {invite.session_title || "Game"}
                    </Text>
                    <Text
                      style={[
                        styles.inviteFrom,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      From {invite.sender_username || "Someone"} •{" "}
                      {formatTimeAgo(invite.created_at)}
                    </Text>
                  </View>

                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[
                        styles.rejectBtn,
                        { borderColor: theme.colors.error },
                      ]}
                      onPress={() => handleReject(invite)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <ActivityIndicator
                          size="small"
                          color={theme.colors.error}
                        />
                      ) : (
                        <MaterialIcons
                          name="close"
                          size={20}
                          color={theme.colors.error}
                        />
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.acceptBtn,
                        { backgroundColor: theme.colors.primary },
                      ]}
                      onPress={() => handleAccept(invite)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <MaterialIcons name="check" size={20} color="#fff" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

export default PendingInvitesSection;

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    marginHorizontal: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Rubik_600SemiBold",
  },
  badge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Rubik_600SemiBold",
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Rubik_400Regular",
    marginHorizontal: 10,
    marginBottom: 8,
  },
  invitesList: {
    paddingHorizontal: 5,
    gap: 8,
  },
  inviteCard: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
  },
  inviteContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inviteInfo: {
    flex: 1,
    marginRight: 12,
  },
  gameName: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Rubik_600SemiBold",
    marginBottom: 4,
  },
  inviteFrom: {
    fontSize: 13,
    fontFamily: "Rubik_400Regular",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  rejectBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  acceptBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
