import React from "react";
import { View, Text } from "react-native";

const DetailsScreen: React.FC = ({ route }) => {
  const { data } = route.params;
  console.log(data);
  return (
    <View>
      <Text>{data}</Text>
    </View>
  );
};

export default DetailsScreen;
