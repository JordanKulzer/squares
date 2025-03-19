import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import React from "react";

const mySquares = ["square1", "square2", "square3", "square4", "square5"];

const ProfileScreen = () => {
  return (
    <View style={styles.container}>
      <SafeAreaView>
        <Text style={styles.text}>My Squares:</Text>
        {mySquares.length === 0 ? (
          <Text style={styles.text}>You have no squares LOSER</Text>
        ) : (
          <ScrollView>
            {mySquares.map((item, index) => (
              <View
                key={index}
                style={{
                  padding: 20,
                  borderBottomWidth: 1,
                  borderColor: "#ccc",
                }}
              >
                <Text style={styles.text}>{item}</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#a5a58d",
  },
  text: {
    color: "#ffe8d6",
  },
});
