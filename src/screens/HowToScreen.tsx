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
          What is Squares?
        </Text>
        <Text
          style={[styles.paragraph, { color: theme.colors.onSurfaceVariant }]}
        >
          Squares is a popular game played during football games (NFL, college, etc.).
          It's a fun way to add excitement to watching sports with friends and family,
          with chances to win at the end of each quarter!
        </Text>

        <Text
          style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
        >
          The Grid
        </Text>
        <Text
          style={[styles.paragraph, { color: theme.colors.onSurfaceVariant }]}
        >
          The game uses a 10x10 grid (100 squares total). Each row and column is
          labeled with a number from 0-9:{"\n\n"}
          • The top row represents one team's score (last digit){"\n"}
          • The left column represents the other team's score (last digit){"\n\n"}
          These numbers are hidden until the game's deadline passes, so picking
          squares is completely random and fair!
        </Text>

        <Text
          style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
        >
          How to Play
        </Text>
        <Text
          style={[styles.paragraph, { color: theme.colors.onSurfaceVariant }]}
        >
          1. Create a new session or join one using a code from a friend{"\n\n"}
          2. Choose your username and pick a color to identify yourself on the grid{"\n\n"}
          3. Tap on empty squares to claim them before the deadline (game start time){"\n\n"}
          4. Once the deadline passes, the random numbers (0-9) are revealed on each axis{"\n\n"}
          5. Watch the game! At the end of each quarter, check if you won
        </Text>

        <Text
          style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
        >
          How Winners Are Determined
        </Text>
        <Text
          style={[styles.paragraph, { color: theme.colors.onSurfaceVariant }]}
        >
          At the end of each quarter, look at the last digit of each team's score.{"\n\n"}
          Example: If the score is Patriots 17, Chiefs 14:{"\n"}
          • Patriots last digit = 7{"\n"}
          • Chiefs last digit = 4{"\n"}
          • The winning square is where 7 and 4 intersect{"\n\n"}
          There's a winner at the end of Q1, Q2, Q3, Q4, and any overtime periods!
        </Text>

        <Text
          style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
        >
          Session Options
        </Text>
        <Text
          style={[styles.paragraph, { color: theme.colors.onSurfaceVariant }]}
        >
          When creating a session, you can set optional limits:{"\n\n"}
          • Max Squares: Limit how many squares each player can pick (ensures everyone
          gets a fair chance){"\n\n"}
          • Price Per Square: Set a buy-in amount per square. The app tracks how much
          each player owes based on their picks. Winnings are split among quarter winners.
        </Text>

        <Text
          style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
        >
          Notifications
        </Text>
        <Text
          style={[styles.paragraph, { color: theme.colors.onSurfaceVariant }]}
        >
          Stay in the loop with optional notifications:{"\n\n"}
          • Deadline reminders before the game starts{"\n"}
          • When someone joins your session{"\n"}
          • When someone leaves your session{"\n"}
          • When a session you're in gets deleted
        </Text>

        <Text
          style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
        >
          Tips for New Players
        </Text>
        <Text
          style={[styles.paragraph, { color: theme.colors.onSurfaceVariant }]}
        >
          • Pick your squares early - popular sessions fill up fast!{"\n\n"}
          • Spread your picks around the grid rather than clustering them together{"\n\n"}
          • Some numbers are statistically more common in football scores (0, 7, 3, 4)
          but since numbers are randomly assigned, every square has an equal chance{"\n\n"}
          • Share the session code with friends to fill up your grid!
        </Text>

        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>Done</Text>
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
