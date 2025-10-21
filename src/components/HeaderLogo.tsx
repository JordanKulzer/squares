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
        width: 120,
        height: 45,
        resizeMode: "contain",
      }}
      resizeMode="center"
    />
  </View>
);

export default HeaderLogo;
