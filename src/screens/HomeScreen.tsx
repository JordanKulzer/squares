import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Button,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import NewModalSquare from "../modals/NewSquareModal";

const mySquares = [
  // 'square1',
  // 'square2',
  // 'square3',
  // 'square4',
  // 'square5'
];

const HomeScreen: React.FC = () => {
  const navigation = useNavigation();

  const [modalVisible, setModalVisible] = useState(false);
  const openModal = () => setModalVisible(true);
  const closeModal = () => setModalVisible(false);

  const handleSave = (title, squareAmount) => {
    console.log("title: ", title);
    console.log("squareAmount: ", squareAmount);
    closeModal();
    navigation.navigate("NewSquareScreen", {
      inputTitle: title,
      inputSquareAmount: squareAmount,
    });
  };

  const navigateToDetails = () => {
    navigation.navigate("Details");
  };

  return (
    <View>
      <SafeAreaView>
        <Text>My Squares:</Text>
        {mySquares.length === 0 ? (
          <Text>You have no squares LOSER</Text>
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
                <Text>{item}</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
      <TouchableOpacity style={styles.button} onPress={openModal}>
        <Text style={[styles.buttonText]}>Create</Text>
        <NewModalSquare
          visible={modalVisible}
          onClose={closeModal}
          createNewSquare={handleSave}
        />
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={navigateToDetails}>
        <Text style={[styles.buttonText]}>Join a friends</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={navigateToDetails}>
        <Text style={[styles.buttonText]}>Join random</Text>
      </TouchableOpacity>
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#4286f4",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    marginVertical: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    textTransform: "uppercase",
  },
});
