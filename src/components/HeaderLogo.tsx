// src/components/HeaderLogo.tsx
import React from "react";
import { Image } from "react-native";

const HeaderLogo = () => (
  <Image
    source={require("../../assets/icons/icon_outline3.png")}
    style={{ width: 80, height: 80 }}
    resizeMode="contain"
  />
);

export default HeaderLogo;
