import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import { TouchableOpacity } from "react-native";
import { Menu } from "react-native-paper";
import Icon from "react-native-vector-icons/MaterialIcons";
import auth from "@react-native-firebase/auth";

const HeaderSettingsMenu = () => {
  const [visible, setVisible] = useState(false);
  const navigation = useNavigation();

  const handleLogout = async () => {
    setVisible(false);
    try {
      await auth().signOut();
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  return (
    <Menu
      visible={visible}
      onDismiss={() => setVisible(false)}
      anchor={
        <TouchableOpacity
          onPress={() => setVisible(true)}
          style={{ marginRight: 10 }}
        >
          <Icon name="settings" size={24} color="#000" />
        </TouchableOpacity>
      }
      contentStyle={{ borderRadius: 10 }}
    >
      <Menu.Item
        title={`Logged in as: ${auth().currentUser?.email || "Unknown"}`}
        disabled
      />
      <Menu.Item
        title="Log Out"
        onPress={handleLogout}
        titleStyle={{ color: "red" }}
      />
    </Menu>
  );
};

export default HeaderSettingsMenu;
