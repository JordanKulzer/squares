import React from "react";
import { Image, View } from "react-native";

const HeaderLogo = () => (
  <View style={{ justifyContent: "center", alignItems: "center", height: 10 }}>
    <Image
      source={require("../../assets/icons/squares-logo1.png")}
      style={{
        height: 120,
        width: 140,
        resizeMode: "contain",
      }}
    />
  </View>
);

export default HeaderLogo;
