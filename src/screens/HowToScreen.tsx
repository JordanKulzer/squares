import React from "react";
import {
  Text,
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "react-native-paper";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

const Section = ({
  icon,
  title,
  children,
  isDark,
  textColor,
  subColor,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
  isDark: boolean;
  textColor: string;
  subColor: string;
}) => (
  <View
    style={[
      styles.section,
      {
        backgroundColor: isDark
          ? "rgba(255,255,255,0.05)"
          : "rgba(0,0,0,0.02)",
      },
    ]}
  >
    <View style={styles.sectionHeader}>
      <View
        style={[
          styles.sectionIcon,
          {
            backgroundColor: isDark
              ? "rgba(108,99,255,0.2)"
              : "rgba(108,99,255,0.1)",
          },
        ]}
      >
        <MaterialIcons name={icon} size={20} color="#6C63FF" />
      </View>
      <Text style={[styles.sectionTitle, { color: textColor }]}>{title}</Text>
    </View>
    <Text style={[styles.paragraph, { color: subColor }]}>{children}</Text>
  </View>
);

const HowToPlay = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const isDark = theme.dark;
  const textColor = theme.colors.onBackground;
  const subColor = theme.colors.onSurfaceVariant;

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
        {/* Header */}
        <LinearGradient
          colors={isDark ? ["#2d1b69", "#1a1a2e"] : ["#6C63FF", "#4834DF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <MaterialIcons name="help-outline" size={36} color="#fff" />
          <Text style={styles.header}>How to Play</Text>
          <Text style={styles.headerSub}>
            Everything you need to know about Squares
          </Text>
        </LinearGradient>

        <Section
          icon="grid-on"
          title="What is Squares?"
          isDark={isDark}
          textColor={textColor}
          subColor={subColor}
        >
          Squares is a popular game played during football, basketball, and
          other sports. A 10x10 grid (100 squares) is shared among players, and
          winners are determined by the score at the end of each quarter. It's a
          fun way to add excitement to any game!
        </Section>

        <Section
          icon="apps"
          title="The Grid"
          isDark={isDark}
          textColor={textColor}
          subColor={subColor}
        >
          {`\u2022 The top row represents one team's score (last digit)
\u2022 The left column represents the other team's score (last digit)
\u2022 Numbers (0-9) are randomly assigned and hidden until the deadline
\u2022 This keeps selection fair — every square has an equal chance!`}
        </Section>

        <Section
          icon="play-circle-outline"
          title="Getting Started"
          isDark={isDark}
          textColor={textColor}
          subColor={subColor}
        >
          {`1. Create a new session or join one using a code from a friend

2. Choose a real game from the schedule (NFL, NCAAF) or create a custom game with your own teams

3. Pick your color and display style to identify yourself on the grid

4. Tap empty squares to claim them before the deadline

5. Once the deadline passes, the axis numbers are revealed

6. Watch the game and check your results after each quarter!`}
        </Section>

        <Section
          icon="emoji-events"
          title="How Winners Are Determined"
          isDark={isDark}
          textColor={textColor}
          subColor={subColor}
        >
          {`At the end of each quarter, take the last digit of each team's score.

Example: If the score is Patriots 17, Chiefs 14:
\u2022 Patriots last digit = 7
\u2022 Chiefs last digit = 4
\u2022 The winning square is where 7 and 4 intersect

Winners are determined at Q1, Q2, Q3, Q4, and any overtime periods. If a price per square is set, winnings are calculated and split among quarter winners.`}
        </Section>

        <Section
          icon="tune"
          title="Session Options"
          isDark={isDark}
          textColor={textColor}
          subColor={subColor}
        >
          {`When creating a session, you can customize:

\u2022 Max Squares — Limit how many squares each player can claim
\u2022 Price Per Square — Set a buy-in per square; the app tracks payouts
\u2022 Block Mode — Players select 2x2 blocks instead of individual squares (25 blocks total)
\u2022 Randomize Axis — Shuffle the 0-9 numbers randomly (on by default)
\u2022 Hide Axis — Keep numbers hidden until the deadline passes`}
        </Section>

        <Section
          icon="person-add"
          title="Invites & Guest Players"
          isDark={isDark}
          textColor={textColor}
          subColor={subColor}
        >
          {`\u2022 Share your session code or invite friends directly from the app
\u2022 Pending invites appear on the Profile screen
\u2022 Owners can add guest players who don't have an account — great for in-person games
\u2022 Owners can also assign squares to specific players`}
        </Section>

        <Section
          icon="sports-score"
          title="Scores & Results"
          isDark={isDark}
          textColor={textColor}
          subColor={subColor}
        >
          {`\u2022 Scores update automatically for scheduled games via live data
\u2022 Owners can manually enter or override scores from Edit Square Settings
\u2022 Owners can end or reopen a game at any time
\u2022 Tap a winning square to see full payout details`}
        </Section>

        <Section
          icon="star"
          title="Premium"
          isDark={isDark}
          textColor={textColor}
          subColor={subColor}
        >
          {`Free players can have up to 3 active squares at a time. Need more?

\u2022 Buy an extra square credit for $0.99 (single use)
\u2022 Earn free credits by winning — every 4 quarter wins = 1 bonus credit
\u2022 Subscribe to Premium for $4.99/month:
  \u2014 Unlimited squares
  \u2014 Ad-free experience
  \u2014 25+ premium icons
  \u2014 Custom color picker
  \u2014 Premium profile badge`}
        </Section>

        <Section
          icon="lightbulb-outline"
          title="Tips"
          isDark={isDark}
          textColor={textColor}
          subColor={subColor}
        >
          {`\u2022 Pick your squares early — popular sessions fill up fast
\u2022 Spread your picks around the grid instead of clustering them
\u2022 Since numbers are randomly assigned, every square has an equal chance
\u2022 Share the session code with friends to fill up your grid
\u2022 Use notifications to get reminders before the deadline`}
        </Section>

        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
          style={{ marginTop: 20, marginBottom: 10 }}
        >
          <LinearGradient
            colors={["#6C63FF", "#4834DF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.doneButton}
          >
            <Text style={styles.doneText}>Got It</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  headerGradient: {
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 28,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  header: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
    marginTop: 10,
    letterSpacing: 0.3,
  },
  headerSub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    marginTop: 4,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 12,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    flex: 1,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 21,
  },
  doneButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: 14,
    marginHorizontal: 16,
  },
  doneText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default HowToPlay;
