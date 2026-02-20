import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput as RNTextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useTheme } from "react-native-paper";
import Icon from "react-native-vector-icons/MaterialIcons";
import Toast from "react-native-toast-message";
import { supabase } from "../lib/supabase";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SkeletonLoader from "../components/SkeletonLoader";

type Comment = {
  id: string;
  user_id: string;
  username: string;
  content: string;
  created_at: string;
};

const CommentsScreen = ({ route }) => {
  const { gridId, title, isOwner } = route.params;
  const theme = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState("Unknown");
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<RNTextInput>(null);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data } = await supabase
          .from("users")
          .select("username")
          .eq("id", user.id)
          .single();
        if (data?.username) setUsername(data.username);
      }
    };
    getUser();
  }, []);

  const fetchComments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("square_comments")
        .select("id, user_id, username, content, created_at")
        .eq("square_id", gridId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setComments(data || []);
    } catch (err) {
      console.error("Error fetching comments:", err);
    } finally {
      setLoading(false);
    }
  }, [gridId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Auto-focus the input when loading finishes
  useEffect(() => {
    if (!loading) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [loading]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`comments-${gridId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "square_comments",
          filter: `square_id=eq.${gridId}`,
        },
        () => {
          fetchComments();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gridId, fetchComments]);

  const handleSend = async () => {
    const trimmed = commentText.trim();
    if (!trimmed || !userId) return;

    setSending(true);
    try {
      const { error } = await supabase.from("square_comments").insert({
        square_id: gridId,
        user_id: userId,
        username,
        content: trimmed,
      });
      if (error) throw error;
      setCommentText("");
      await fetchComments();
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err) {
      console.error("Error adding comment:", err);
      Toast.show({
        type: "error",
        text1: "Failed to send comment",
        position: "bottom",
      });
    } finally {
      setSending(false);
    }
  };

  const handleDelete = (commentId: string, commentUserId: string) => {
    if (userId !== commentUserId && !isOwner) return;

    Alert.alert("Delete Comment", "Are you sure you want to delete this comment?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const { error } = await supabase
              .from("square_comments")
              .delete()
              .eq("id", commentId);
            if (error) throw error;
            setComments((prev) => prev.filter((c) => c.id !== commentId));
          } catch (err) {
            console.error("Error deleting comment:", err);
            Toast.show({
              type: "error",
              text1: "Failed to delete comment",
              position: "bottom",
            });
          }
        },
      },
    ]);
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    const timeStr = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    if (isToday) return timeStr;
    const dateLabel = d.toLocaleDateString([], { month: "short", day: "numeric" });
    return `${dateLabel} ${timeStr}`;
  };

  const gradientColors = theme.dark
    ? (["#0a0a0a", "#1a1a1a", "#252525"] as const)
    : (["#f8f9fa", "#ffffff"] as const);

  const renderComment = ({ item }: { item: Comment }) => {
    const isMe = item.user_id === userId;
    const canDelete = isMe || isOwner;

    return (
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isMe
              ? theme.dark
                ? "rgba(94, 96, 206, 0.2)"
                : "rgba(94, 96, 206, 0.1)"
              : theme.colors.elevation.level2,
            alignSelf: isMe ? "flex-end" : "flex-start",
            borderBottomRightRadius: isMe ? 4 : 16,
            borderBottomLeftRadius: isMe ? 16 : 4,
          },
        ]}
      >
        <Text
          style={[
            styles.username,
            { color: isMe ? theme.colors.onSurfaceVariant : theme.colors.primary },
          ]}
        >
          {item.username}
        </Text>
        <Text style={[styles.content, { color: theme.colors.onSurface }]}>
          {item.content}
        </Text>
        <View style={styles.metaRow}>
          <Text
            style={[styles.time, { color: theme.colors.onSurfaceVariant }]}
          >
            {formatTime(item.created_at)}
          </Text>
          {canDelete && (
            <TouchableOpacity
              onPress={() => handleDelete(item.id, item.user_id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon
                name="delete-outline"
                size={16}
                color={theme.colors.onSurfaceVariant}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={headerHeight}
      >
        {loading ? (
          <View style={{ padding: 16 }}>
            <SkeletonLoader variant="friendsList" />
          </View>
        ) : comments.length === 0 ? (
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.emptyState}>
              <Icon
                name="chat-bubble-outline"
                size={48}
                color={theme.colors.onSurfaceVariant}
              />
              <Text
                style={[
                  styles.emptyText,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                No comments yet
              </Text>
              <Text
                style={[
                  styles.emptySubtext,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Be the first to say something!
              </Text>
            </View>
          </TouchableWithoutFeedback>
        ) : (
          <FlatList
            ref={flatListRef}
            data={comments}
            keyExtractor={(item) => item.id}
            renderItem={renderComment}
            contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: false })
            }
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
          />
        )}

        {/* Input bar */}
        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: theme.colors.surface,
              borderTopColor: theme.dark ? "#333" : "#e0e0e0",
              paddingBottom: 8 + insets.bottom,
            },
          ]}
        >
          <RNTextInput
            ref={inputRef}
            placeholder="Write a comment..."
            value={commentText}
            onChangeText={setCommentText}
            style={[
              styles.input,
              {
                color: theme.colors.onSurface,
                backgroundColor: theme.dark ? "#222" : "#f5f5f5",
              },
            ]}
            placeholderTextColor={theme.colors.onSurfaceVariant}
            multiline
            maxLength={500}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={sending || !commentText.trim()}
            style={[
              styles.sendBtn,
              {
                backgroundColor:
                  sending || !commentText.trim()
                    ? theme.dark
                      ? "#333"
                      : "#ddd"
                    : theme.colors.primary,
              },
            ]}
          >
            <Icon
              name="send"
              size={20}
              color={sending || !commentText.trim() ? "#999" : "#fff"}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

export default CommentsScreen;

const styles = StyleSheet.create({
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Rubik_500Medium",
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: "Rubik_400Regular",
    marginTop: 4,
  },
  bubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  username: {
    fontSize: 12,
    fontFamily: "Rubik_600SemiBold",
    marginBottom: 2,
  },
  content: {
    fontSize: 14,
    fontFamily: "Rubik_400Regular",
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    gap: 8,
  },
  time: {
    fontSize: 11,
    fontFamily: "Rubik_400Regular",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
    fontFamily: "Rubik_400Regular",
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
