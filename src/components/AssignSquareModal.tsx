import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Animated,
} from "react-native";
import {
  Portal,
  Button,
  useTheme,
  RadioButton,
} from "react-native-paper";

interface Player {
  userId: string;
  username: string;
  color: string;
  displayType?: "color" | "icon" | "initial";
  displayValue?: string;
  isGuest?: boolean;
}

interface AssignSquareModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSelectPlayer: (player: Player) => void;
  players: Player[];
  currentUserId: string;
}

const AssignSquareModal: React.FC<AssignSquareModalProps> = ({
  visible,
  onDismiss,
  onSelectPlayer,
  players,
  currentUserId,
}) => {
  const theme = useTheme();
  const translateY = useRef(new Animated.Value(600)).current;
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  // Animate in/out
  useEffect(() => {
    if (visible) {
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: 600,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleStartAssigning = () => {
    const selectedPlayer = players.find((p) => p.userId === selectedPlayerId);
    if (selectedPlayer) {
      onSelectPlayer(selectedPlayer);
      setSelectedPlayerId(null);
      onDismiss();
    }
  };

  const handleDismiss = () => {
    setSelectedPlayerId(null);
    onDismiss();
  };

  const surfaceColor = theme.colors.surface;
  const dividerColor = theme.dark ? "#333" : "#eee";

  return (
    <Portal>
      {visible && (
        <TouchableWithoutFeedback onPress={handleDismiss}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>
      )}

      <Animated.View
        pointerEvents={visible ? "auto" : "none"}
        style={[
          styles.container,
          {
            transform: [{ translateY }],
            backgroundColor: surfaceColor,
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text
            style={[styles.headerTitle, { color: theme.colors.onBackground }]}
          >
            Assign Squares
          </Text>
          <TouchableOpacity onPress={handleDismiss}>
            <Text style={{ color: theme.colors.error, fontFamily: "Sora" }}>
              Close
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.divider, { backgroundColor: dividerColor }]} />

        <Text
          style={[
            styles.instructions,
            { color: theme.colors.onSurfaceVariant },
          ]}
        >
          Select a player, then tap empty squares on the grid to assign them.
        </Text>

        <Text
          style={[styles.sectionLabel, { color: theme.colors.onBackground }]}
        >
          Select Player
        </Text>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <RadioButton.Group
            onValueChange={(value) => setSelectedPlayerId(value)}
            value={selectedPlayerId || ""}
          >
            {players.map((player) => (
              <TouchableOpacity
                key={player.userId}
                onPress={() => setSelectedPlayerId(player.userId)}
                style={[
                  styles.playerRow,
                  {
                    backgroundColor:
                      selectedPlayerId === player.userId
                        ? theme.dark
                          ? "rgba(94, 96, 206, 0.2)"
                          : "rgba(94, 96, 206, 0.1)"
                        : "transparent",
                    borderColor:
                      selectedPlayerId === player.userId
                        ? theme.colors.primary
                        : theme.dark
                          ? "#333"
                          : "#eee",
                  },
                ]}
              >
                <View style={styles.playerInfo}>
                  <View
                    style={[styles.colorDot, { backgroundColor: player.color }]}
                  />
                  <View style={styles.playerTextContainer}>
                    <Text
                      style={[
                        styles.playerName,
                        { color: theme.colors.onBackground },
                      ]}
                    >
                      {player.username}
                      {player.userId === currentUserId && " (you)"}
                    </Text>
                    {player.isGuest && (
                      <Text
                        style={[
                          styles.guestBadge,
                          { color: theme.colors.onSurfaceVariant },
                        ]}
                      >
                        Guest
                      </Text>
                    )}
                  </View>
                </View>
                <RadioButton
                  value={player.userId}
                  color={theme.colors.primary}
                />
              </TouchableOpacity>
            ))}
          </RadioButton.Group>
        </ScrollView>

        {/* Button Row */}
        <View style={styles.buttonRow}>
          <Button
            onPress={handleDismiss}
            textColor={theme.colors.error}
            mode="text"
            labelStyle={{ fontFamily: "Sora" }}
          >
            Cancel
          </Button>
          <Button
            onPress={handleStartAssigning}
            disabled={!selectedPlayerId}
            textColor="#fff"
            mode="contained"
            labelStyle={{ fontFamily: "Sora" }}
            style={{
              backgroundColor: selectedPlayerId
                ? theme.colors.primary
                : theme.colors.surfaceDisabled,
            }}
          >
            Start Assigning
          </Button>
        </View>
      </Animated.View>
    </Portal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  container: {
    position: "absolute",
    bottom: -35,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 75,
    maxHeight: "70%",
    borderWidth: 1.5,
    borderLeftWidth: 5,
    borderBottomWidth: 0,
    borderColor: "rgba(94, 96, 206, 0.4)",
    borderLeftColor: "#5E60CE",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "SoraBold",
  },
  divider: {
    height: 1,
    marginBottom: 16,
  },
  instructions: {
    fontSize: 13,
    fontFamily: "Sora",
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: "SoraBold",
    marginBottom: 12,
  },
  scrollView: {
    maxHeight: 250,
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
  },
  playerInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
  },
  playerTextContainer: {
    flex: 1,
  },
  playerName: {
    fontSize: 15,
    fontFamily: "Sora",
    fontWeight: "600",
  },
  guestBadge: {
    fontSize: 12,
    fontFamily: "Sora",
    marginTop: 2,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 16,
  },
});

export default AssignSquareModal;
