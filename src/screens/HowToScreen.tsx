import React from "react";
import { Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "react-native-paper";

const HowToPlay = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const isDark = theme.dark;

  return (
    <LinearGradient
      colors={isDark ? ["#0d0d0d", "#1a1a1a"] : ["#fdfcf9", "#e0e7ff"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.header, { color: theme.colors.onBackground }]}>
          How to Play Squares
        </Text>

        <Text
          style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
        >
          Objective
        </Text>
        <Text
          style={[styles.paragraph, { color: theme.colors.onSurfaceVariant }]}
        >
          Squares is a fun game based on live sports events. Players select
          squares on a 10×10 grid, where each axis represents the last digit of
          a team's score. If your square matches the actual score at the end of
          a quarter, you win!
        </Text>

        <Text
          style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
        >
          How It Works
        </Text>
        <Text
          style={[styles.paragraph, { color: theme.colors.onSurfaceVariant }]}
        >
          1. Create or join a game session tied to a live sports event.{"\n"}
          2. Pick a username and a player color{"\n"}
          3. Select available squares before the game starts. You may be limited
          by either a max number of squares or a price-per-square system.{"\n"}
          4. Once the deadline passes, grid numbers are revealed.{"\n"}
          5. Winners are determined at the end of each quarter based on the live
          score digits.{"\n"}
          6. You'll receive optional notifications when new players join, the
          deadline is near, or quarter winners are announced.
        </Text>

        <Text
          style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
        >
          Scoring Example
        </Text>
        <Text
          style={[styles.paragraph, { color: theme.colors.onSurfaceVariant }]}
        >
          If the home team has 13 and the away team has 7, the winning square
          would be where the X-axis is 3 and the Y-axis is 7.
        </Text>

        <Text
          style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
        >
          Optional Restraints
        </Text>
        <Text
          style={[styles.paragraph, { color: theme.colors.onSurfaceVariant }]}
        >
          Each session could be restricted by the following if desired:{"\n"}-
          **Max Squares Per Player**: Players can pick up to a fixed number of
          squares.{"\n"}- **Price Per Square**: Players pay a set amount for
          each square they select. The app automatically tracks the total owed
          per person.
        </Text>

        <Text
          style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
        >
          Tips
        </Text>
        <Text
          style={[styles.paragraph, { color: theme.colors.onSurfaceVariant }]}
        >
          - Spread your picks across the board to increase your chances.{"\n"}-
          Enable notifications to stay updated with quarter results and game
          progress.
        </Text>

        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>Back to Home</Text>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
    fontFamily: "SoraBold",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 16,
    fontFamily: "SoraBold",
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Sora",
  },
  backButton: {
    marginTop: 20,
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  backText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Sora",
  },
});

export default HowToPlay;
