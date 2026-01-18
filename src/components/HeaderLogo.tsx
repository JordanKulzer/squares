import React from "react";
import { Image, View } from "react-native";
import { useTheme } from "react-native-paper";

const HeaderLogo = () => {
  const theme = useTheme();

  return (
    <View
      style={{ justifyContent: "center", alignItems: "center", height: 44 }}
    >
      <Image
        source={require("../../assets/icons/My_Squares_new_logo_transparent1_new_new.png")}
        style={{
          height: 50,
          width: 120,
          resizeMode: "contain",
          backgroundColor: "transparent",
        }}
      />
    </View>
  );
};

export default HeaderLogo;
