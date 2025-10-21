import React from "react";
import { Image, View } from "react-native";

const HeaderLogo = () => (
  <View
    style={{
      height: 40,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "transparent",
    }}
  >
    <Image
      source={require("../../assets/icons/squares-logo.png")}
      style={{
        width: 110,
        height: 35,
        tintColor: undefined,
        resizeMode: "center", // prevents blur scaling
      }}
      resizeMode="center"
    />
  </View>
);

export default HeaderLogo;
