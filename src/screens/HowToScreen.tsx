import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import colors from "../../assets/constants/colorOptions";

const HowToPlay = () => {
  const navigation = useNavigation();

  return (
    <LinearGradient
      colors={["#fdfcf9", "#e0e7ff"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.header}>How to Play Squares</Text>

          <Text style={styles.sectionTitle}>Objective</Text>
          <Text style={styles.paragraph}>
            Squares is a fun game based on real NFL games. Players select
            squares on a 10x10 grid. Each axis represents the last digit of a
            team's score. If your square matches the actual score at the end of
            a quarter, you win!
          </Text>

          <Text style={styles.sectionTitle}>How It Works</Text>
          <Text style={styles.paragraph}>
            1. Create or join a game session.
            {"\n"}2. Pick a username and color.
            {"\n"}3. Select available squares before the game starts.
            {"\n"}4. Once the deadline passes, the grid numbers are revealed.
            {"\n"}5. Winners are determined each quarter based on live scores!
          </Text>

          <Text style={styles.sectionTitle}>Scoring Example</Text>
          <Text style={styles.paragraph}>
            If the home team has 13 and the away team has 7, the winning square
            would be the one where X-axis is 3 and Y-axis is 7.
          </Text>

          <Text style={styles.sectionTitle}>Tips</Text>
          <Text style={styles.paragraph}>
            - Choose your squares strategically to spread out your chances.
          </Text>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backText}>Back to Home</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: colors.primaryText,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.primaryText,
    marginBottom: 6,
    marginTop: 16,
  },
  paragraph: {
    fontSize: 15,
    color: colors.secondaryText,
    lineHeight: 22,
  },
  backButton: {
    marginTop: 30,
    backgroundColor: colors.primary,
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  backText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default HowToPlay;
