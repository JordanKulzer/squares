import { useNavigation } from "@react-navigation/native";
import React, { useState, useEffect } from "react";
import { TouchableOpacity } from "react-native";
import { Menu } from "react-native-paper";
import Icon from "react-native-vector-icons/MaterialIcons";
import { supabase } from "../lib/supabase"; // Update the path as needed

const HeaderSettingsMenu = () => {
  const [visible, setVisible] = useState(false);
  const [userEmail, setUserEmail] = useState("Unknown");
  const navigation = useNavigation();

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (user?.email) setUserEmail(user.email);
    };

    fetchUser();
  }, []);

  const handleLogout = async () => {
    setVisible(false);
    try {
      await supabase.auth.signOut();
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
      <Menu.Item title={`Logged in as: ${userEmail}`} disabled />
      <Menu.Item
        title="Log Out"
        onPress={handleLogout}
        titleStyle={{ color: "red" }}
      />
    </Menu>
  );
};

export default HeaderSettingsMenu;
