import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Animated,
  Share,
} from "react-native";
import { Modal, Portal, Button, useTheme } from "react-native-paper";
import * as Clipboard from "expo-clipboard";
import Toast from "react-native-toast-message";
import colors from "../../assets/constants/colorOptions";
import QRCode from "react-native-qrcode-svg";

const SessionOptionsModal = ({
  visible,
  onDismiss,
  gridId,
  isOwner,
  handleLeaveSquare,
  handleDeleteSquare,
  setTempDeadline,
  deadlineValue,
  setShowDeadlineModal,
}) => {
  const theme = useTheme();
  const slideAnim = useRef(new Animated.Value(600)).current;
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : 600,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  const surfaceColor = theme.colors.surface;
  const onSurfaceColor = theme.colors.onSurface;
  const dividerColor = theme.dark ? "#333" : "#eee";

  return (
    <>
      <Portal>
        <Modal
          visible={visible}
          onDismiss={onDismiss}
          dismissable={false}
          contentContainerStyle={{
            height: "100%",
            backgroundColor: "transparent",
          }}
        >
          <TouchableWithoutFeedback onPress={onDismiss}>
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0,0,0,0.4)",
              }}
            />
          </TouchableWithoutFeedback>

          <Animated.View
            style={{
              transform: [{ translateY: slideAnim }],
              backgroundColor: surfaceColor,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              width: "100%",
              position: "absolute",
              bottom: 0,
              maxHeight: 500,
              paddingHorizontal: 20,
              paddingTop: 24,
              paddingBottom: 32,
              elevation: 12,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.15,
              shadowRadius: 6,
            }}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 24,
                }}
              >
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "700",
                    color: onSurfaceColor,
                  }}
                >
                  Session Options
                </Text>
                <TouchableOpacity onPress={onDismiss}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: theme.colors.primary,
                    }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>

              <View
                style={{
                  height: 1,
                  backgroundColor: dividerColor,
                  marginBottom: 20,
                }}
              />

              <Button
                icon="share-variant"
                mode="outlined"
                onPress={() => setShowInviteModal(true)}
                style={{ marginBottom: 12 }}
                labelStyle={{ fontWeight: "600", color: onSurfaceColor }}
              >
                Invite Friends
              </Button>

              {isOwner && (
                <Button
                  icon="calendar"
                  mode="outlined"
                  onPress={() => {
                    onDismiss();
                    setTempDeadline(deadlineValue);
                    setShowDeadlineModal(true);
                  }}
                  style={{
                    marginBottom: 12,
                    borderColor: theme.colors.primary,
                    borderRadius: 20,
                    paddingHorizontal: 12,
                  }}
                  labelStyle={{
                    fontWeight: "600",
                    color: theme.colors.primary,
                    textTransform: "none",
                  }}
                >
                  Change Deadline
                </Button>
              )}

              <Button
                icon="exit-to-app"
                mode="outlined"
                onPress={handleLeaveSquare}
                textColor={theme.colors.error}
                style={{
                  backgroundColor: theme.colors.error,
                  marginBottom: 12,
                }}
                labelStyle={{
                  fontWeight: "600",
                  color: theme.colors.onPrimary,
                }}
              >
                Leave Square
              </Button>

              {isOwner && (
                <Button
                  icon="delete"
                  mode="outlined"
                  onPress={handleDeleteSquare}
                  style={{ backgroundColor: "#ff4d4f", marginBottom: 12 }}
                  labelStyle={{
                    fontWeight: "600",
                    color: "#fff",
                  }}
                >
                  Delete Square
                </Button>
              )}
            </ScrollView>
          </Animated.View>
        </Modal>
      </Portal>

      <Portal>
        <Modal
          visible={showInviteModal}
          onDismiss={() => setShowInviteModal(false)}
          contentContainerStyle={{
            backgroundColor: surfaceColor,
            padding: 24,
            margin: 20,
            borderRadius: 12,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              color: onSurfaceColor,
              marginBottom: 16,
            }}
          >
            Invite Friends
          </Text>

          <View
            style={{
              height: 1,
              backgroundColor: dividerColor,
              marginBottom: 20,
            }}
          />

          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <QRCode value={`squares://join/${gridId}`} size={180} />
          </View>

          <TouchableOpacity
            onPress={async () => {
              await Clipboard.setStringAsync(gridId);
              Toast.show({
                type: "success",
                text1: "Session ID copied!",
              });
            }}
            style={{
              marginTop: 20,
              padding: 12,
              borderRadius: 8,
              backgroundColor: theme.colors.primary,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>
              Copy Session ID
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={async () => {
              await Share.share({
                message: `Join my Squares game! Session ID: ${gridId}`,
              });
            }}
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 8,
              backgroundColor: theme.dark ? "#555" : "#ddd",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontWeight: "600",
                color: onSurfaceColor,
              }}
            >
              Send Session ID
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowInviteModal(false)}
            style={{ marginTop: 16, alignItems: "center" }}
          >
            <Text style={{ color: theme.colors.error, fontWeight: "600" }}>
              Close
            </Text>
          </TouchableOpacity>
        </Modal>
      </Portal>
    </>
  );
};

export default SessionOptionsModal;
