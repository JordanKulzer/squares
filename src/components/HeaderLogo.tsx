import React from "react";
import { Image, View } from "react-native";

const HeaderLogo = () => (
  <View style={{ justifyContent: "center", alignItems: "center", height: 44 }}>
    <Image
      source={require("../../assets/icons/squares-logo1.png")}
      style={{
        height: 44,
        width: 140,
        resizeMode: "contain",
        backgroundColor: "transparent",
      }}
    />
  </View>
);

export default HeaderLogo;
