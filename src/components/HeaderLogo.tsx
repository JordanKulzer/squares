// src/components/HeaderLogo.tsx
import React from "react";
import { Image, View } from "react-native";

const HeaderLogo = () => (
  <View style={{ height: 40, justifyContent: "center", alignItems: "center" }}>
    <Image
      source={require("../../assets/icons/new logo pt2.png")}
      style={{ width: 120, height: 100 }}
      resizeMode="contain"
    />
  </View>
);

export default HeaderLogo;
