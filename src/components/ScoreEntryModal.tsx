import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Alert,
} from "react-native";
import { Portal, Button, useTheme } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";

interface QuarterScore {
  team1: string;
  team2: string;
}

interface ScoreEntryModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSave: (scores: {
    quarters: QuarterScore[];
    overtimes: QuarterScore[];
  }) => void;
  team1Name: string;
  team2Name: string;
  initialScores?: {
    quarters: QuarterScore[];
    overtimes: QuarterScore[];
  };
  onEndGame?: () => void;
  onReopenGame?: () => void;
  gameCompleted?: boolean;
  saveButtonLabel?: string;
}

const ScoreEntryModal: React.FC<ScoreEntryModalProps> = ({
  visible,
  onDismiss,
  onSave,
  team1Name,
  team2Name,
  initialScores,
  onEndGame,
  onReopenGame,
  gameCompleted,
  saveButtonLabel = "Save Scores",
}) => {
  const theme = useTheme();
  const translateY = useRef(new Animated.Value(600)).current;

  const [quarters, setQuarters] = useState<QuarterScore[]>([
    { team1: "", team2: "" },
    { team1: "", team2: "" },
    { team1: "", team2: "" },
    { team1: "", team2: "" },
  ]);

  const [overtimes, setOvertimes] = useState<QuarterScore[]>([]);
  const wasVisibleRef = useRef(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
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
      }).start(() => {
        setShouldRender(false);
      });
    }
  }, [visible]);

  useEffect(() => {
    if (visible && !wasVisibleRef.current) {
      if (initialScores) {
        setQuarters(
          initialScores.quarters.length > 0
            ? initialScores.quarters.map((q) => ({
                team1: q.team1,
                team2: q.team2,
              }))
            : [
                { team1: "", team2: "" },
                { team1: "", team2: "" },
                { team1: "", team2: "" },
                { team1: "", team2: "" },
              ],
        );
        setOvertimes(
          (initialScores.overtimes || []).map((ot) => ({
            team1: ot.team1,
            team2: ot.team2,
          })),
        );
      }
    }
    wasVisibleRef.current = visible;
  }, [visible, initialScores]);

  const updateQuarterScore = (
    index: number,
    team: "team1" | "team2",
    value: string,
  ) => {
    const numericValue = value.replace(/[^0-9]/g, "");
    const newQuarters = [...quarters];
    newQuarters[index] = { ...newQuarters[index], [team]: numericValue };
    setQuarters(newQuarters);
  };

  const updateOvertimeScore = (
    index: number,
    team: "team1" | "team2",
    value: string,
  ) => {
    const numericValue = value.replace(/[^0-9]/g, "");
    const newOvertimes = [...overtimes];
    newOvertimes[index] = { ...newOvertimes[index], [team]: numericValue };
    setOvertimes(newOvertimes);
  };

  const addOvertime = () => {
    setOvertimes([...overtimes, { team1: "", team2: "" }]);
  };

  const removeOvertime = (index: number) => {
    const newOvertimes = overtimes.filter((_, i) => i !== index);
    setOvertimes(newOvertimes);
  };

  const calculateTotalScore = (team: "team1" | "team2") => {
    let total = 0;
    quarters.forEach((q) => {
      if (q[team]) total += parseInt(q[team], 10) || 0;
    });
    overtimes.forEach((ot) => {
      if (ot[team]) total += parseInt(ot[team], 10) || 0;
    });
    return total;
  };

  const handleSave = () => {
    onSave({ quarters, overtimes });
    onDismiss();
  };

  const handleEndGame = () => {
    Alert.alert(
      "End Game",
      "Are you sure you want to end this game? This will mark the game as completed and calculate final winners.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End Game",
          style: "destructive",
          onPress: () => {
            onEndGame?.();
          },
        },
      ],
    );
  };

  const handleReopenGame = () => {
    Alert.alert(
      "Reopen Game",
      "This will mark the game as incomplete. You can continue editing scores.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reopen",
          onPress: () => {
            onReopenGame?.();
          },
        },
      ],
    );
  };

  const truncateName = (name: string, maxLength: number = 12) => {
    return name.length > maxLength
      ? name.substring(0, maxLength) + "\u2026"
      : name;
  };

  const primaryColor = theme.colors.primary;
  const primaryBg = theme.dark
    ? "rgba(94, 96, 206, 0.15)"
    : "rgba(94, 96, 206, 0.08)";

  const renderScoreRow = (
    label: string,
    score: QuarterScore,
    onUpdate: (team: "team1" | "team2", value: string) => void,
    onRemove?: () => void,
  ) => (
    <View style={styles.scoreRow}>
      <View style={styles.labelContainer}>
        <Text
          style={[styles.rowLabel, { color: theme.colors.onSurfaceVariant }]}
        >
          {label}
        </Text>
      </View>
      <View style={styles.inputsContainer}>
        <TextInput
          style={[
            styles.scoreInput,
            {
              backgroundColor: theme.dark ? "#333" : "#f5f5f5",
              color: theme.colors.onBackground,
              borderColor: theme.dark ? "#555" : "#ddd",
            },
          ]}
          value={score.team1}
          onChangeText={(val) => onUpdate("team1", val)}
          keyboardType="number-pad"
          maxLength={3}
          placeholder="--"
          placeholderTextColor={theme.colors.onSurfaceVariant}
        />
        <TextInput
          style={[
            styles.scoreInput,
            {
              backgroundColor: theme.dark ? "#333" : "#f5f5f5",
              color: theme.colors.onBackground,
              borderColor: theme.dark ? "#555" : "#ddd",
            },
          ]}
          value={score.team2}
          onChangeText={(val) => onUpdate("team2", val)}
          keyboardType="number-pad"
          maxLength={3}
          placeholder="--"
          placeholderTextColor={theme.colors.onSurfaceVariant}
        />
      </View>
      {onRemove && (
        <TouchableOpacity onPress={onRemove} style={styles.removeButton}>
          <MaterialIcons name="close" size={20} color={theme.colors.error} />
        </TouchableOpacity>
      )}
    </View>
  );

  const surfaceColor = theme.colors.surface;
  const dividerColor = theme.dark ? "#333" : "#eee";

  if (!shouldRender) return null;

  return (
    <Portal>
      {visible && (
        <TouchableWithoutFeedback onPress={onDismiss}>
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
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text
              style={[styles.headerTitle, { color: theme.colors.onBackground }]}
            >
              Enter Scores
            </Text>
            <TouchableOpacity onPress={onDismiss} style={styles.closeButton}>
              <Text style={{ color: theme.colors.error, fontFamily: "Sora" }}>
                Close
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.divider, { backgroundColor: dividerColor }]} />

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Team Headers */}
            <View style={styles.teamHeaders}>
              <View style={styles.labelContainer} />
              <View style={styles.inputsContainer}>
                <Text
                  style={[
                    styles.teamHeader,
                    { color: theme.colors.onBackground },
                  ]}
                >
                  {truncateName(team1Name)}
                </Text>
                <Text
                  style={[
                    styles.teamHeader,
                    { color: theme.colors.onBackground },
                  ]}
                >
                  {truncateName(team2Name)}
                </Text>
              </View>
            </View>

            {/* Quarter Scores */}
            {quarters.map((quarter, index) => (
              <View key={`Q${index + 1}`}>
                {renderScoreRow(`Q${index + 1}`, quarter, (team, value) =>
                  updateQuarterScore(index, team, value),
                )}
              </View>
            ))}

            {/* Overtime Scores */}
            {overtimes.map((ot, index) => (
              <View key={`OT${index + 1}`}>
                {renderScoreRow(
                  `OT${index + 1}`,
                  ot,
                  (team, value) => updateOvertimeScore(index, team, value),
                  () => removeOvertime(index),
                )}
              </View>
            ))}

            {/* Add Overtime Button */}
            <TouchableOpacity
              onPress={addOvertime}
              style={[
                styles.addOvertimeButton,
                { borderColor: theme.colors.primary },
              ]}
            >
              <MaterialIcons
                name="add"
                size={20}
                color={theme.colors.primary}
              />
              <Text
                style={[
                  styles.addOvertimeText,
                  { color: theme.colors.primary },
                ]}
              >
                Add Overtime
              </Text>
            </TouchableOpacity>

            {/* Total Score */}
            <View
              style={[
                styles.totalRow,
                { borderTopColor: theme.dark ? "#444" : "#ddd" },
              ]}
            >
              <View style={styles.labelContainer}>
                <Text
                  style={[
                    styles.totalLabel,
                    { color: theme.colors.onBackground },
                  ]}
                >
                  Total
                </Text>
              </View>
              <View style={styles.inputsContainer}>
                <Text
                  style={[
                    styles.totalScore,
                    { color: theme.colors.onBackground },
                  ]}
                >
                  {calculateTotalScore("team1")}
                </Text>
                <Text
                  style={[
                    styles.totalScore,
                    { color: theme.colors.onBackground },
                  ]}
                >
                  {calculateTotalScore("team2")}
                </Text>
              </View>
            </View>

            {/* Save Button */}
            <Button
              mode="contained"
              onPress={handleSave}
              style={styles.saveButton}
              contentStyle={styles.saveButtonContent}
            >
              {saveButtonLabel}
            </Button>

            {/* End Game Section */}
            {(onEndGame || onReopenGame) && (
              <>
                <View
                  style={[
                    styles.endGameDivider,
                    { backgroundColor: dividerColor },
                  ]}
                />
                {!gameCompleted ? (
                  <TouchableOpacity
                    onPress={handleEndGame}
                    style={[
                      styles.endGameButton,
                      {
                        borderColor: primaryColor,
                        backgroundColor: primaryBg,
                      },
                    ]}
                  >
                    <MaterialIcons name="flag" size={20} color={primaryColor} />
                    <Text style={[styles.endGameText, { color: primaryColor }]}>
                      End Game
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={handleReopenGame}
                    style={[
                      styles.gameCompletedBadge,
                      {
                        backgroundColor: primaryBg,
                        borderColor: primaryColor,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="check-circle"
                      size={20}
                      color={primaryColor}
                    />
                    <View>
                      <Text
                        style={[
                          styles.gameCompletedText,
                          { color: primaryColor },
                        ]}
                      >
                        Game Completed
                      </Text>
                      <Text
                        style={[
                          styles.reopenHint,
                          { color: theme.colors.onSurfaceVariant },
                        ]}
                      >
                        Tap to reopen
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
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
    paddingBottom: 60,
    maxHeight: "85%",
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
  closeButton: {
    padding: 4,
  },
  divider: {
    height: 1,
    marginBottom: 20,
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingBottom: 60,
  },
  teamHeaders: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  labelContainer: {
    width: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  inputsContainer: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
  },
  teamHeader: {
    flex: 1,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  scoreInput: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
  },
  removeButton: {
    width: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  addOvertimeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 16,
  },
  addOvertimeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  totalScore: {
    flex: 1,
    textAlign: "center",
    fontSize: 24,
    fontWeight: "700",
  },
  saveButton: {
    marginTop: 16,
  },
  saveButtonContent: {
    paddingVertical: 4,
  },
  endGameDivider: {
    height: 1,
    marginTop: 16,
    marginBottom: 12,
  },
  endGameButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  endGameText: {
    fontSize: 15,
    fontWeight: "700",
  },
  gameCompletedBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  gameCompletedText: {
    fontSize: 15,
    fontWeight: "700",
  },
  reopenHint: {
    fontSize: 11,
    marginTop: 1,
  },
});

export default ScoreEntryModal;
