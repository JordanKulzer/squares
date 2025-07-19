import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, Share } from "react-native";
import { Modal, Portal, Button, useTheme } from "react-native-paper";
import Toast from "react-native-toast-message";
import QRCode from "react-native-qrcode-svg";
import * as Clipboard from "expo-clipboard";
import * as Sentry from "@sentry/react-native";

const InviteFriendsModal = ({
  visible,
  onDismiss,
  gridId,
}: {
  visible: boolean;
  onDismiss: () => void;
  gridId: string;
}) => {
  const theme = useTheme();
  const dividerColor = theme.dark ? "#333" : "#eee";

  useEffect(() => {
    if (visible) {
      Sentry.addBreadcrumb({
        category: "modal",
        message: "InviteFriendsModal opened",
        level: "info",
      });

      if (!gridId) {
        Sentry.captureMessage(
          "InviteFriendsModal opened without gridId",
          "warning"
        );
      }
    }
  }, [visible]);

  const handleCopy = async () => {
    try {
      if (!gridId) {
        throw new Error("Attempted to copy empty gridId");
      }

      await Clipboard.setStringAsync(gridId);
      Toast.show({
        type: "info",
        text1: "Copied to clipboard!",
        position: "bottom",
        visibilityTime: 1500,
        bottomOffset: 60,
      });
    } catch (err) {
      Sentry.captureException(err);
      console.warn("Clipboard error:", err);
      Toast.show({
        type: "error",
        text1: "Copy failed",
      });
    }
  };

  const handleShare = async () => {
    try {
      if (!gridId) {
        throw new Error("Attempted to share without gridId");
      }

      const joinUrl = `squaresgame://session/${gridId}`;
      await Share.share({
        message: `Join my Squares game: ${joinUrl}`,
      });
    } catch (error) {
      Sentry.captureException(error);
      console.warn("Error sharing:", error);
      Toast.show({
        type: "error",
        text1: "Sharing failed",
      });
    }
  };

  const RenderQRCode = ({ value }: { value: string }) => {
    try {
      if (!value) throw new Error("QR Code received empty value");
      return <QRCode value={value} size={150} />;
    } catch (err) {
      Sentry.captureException(err);
      return (
        <Text style={{ color: "red", marginTop: 8 }}>
          Error displaying QR code.
        </Text>
      );
    }
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={{
          backgroundColor: theme.colors.surface,
          marginHorizontal: 24,
          padding: 20,
          borderRadius: 16,
          borderWidth: 1.5,
          borderColor: "rgba(94, 96, 206, 0.4)",
          borderLeftWidth: 5,
          borderLeftColor: theme.colors.primary,
          elevation: 5,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "bold",
            marginBottom: 12,
            color: theme.colors.onSurface,
            fontFamily: "SoraBold",
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

        <View style={{ alignItems: "center", marginBottom: 12 }}>
          {typeof gridId === "string" && gridId.length > 0 ? (
            <RenderQRCode value={gridId} />
          ) : (
            <Text style={{ color: theme.colors.error }}>
              Error Creating QR Code
            </Text>
          )}
        </View>

        <Text
          style={{
            marginBottom: 8,
            color: theme.colors.onSurface,
            fontFamily: "Sora",
          }}
        >
          Copy and share this session ID:
        </Text>

        <TouchableOpacity
          onPress={handleCopy}
          style={{
            padding: 10,
            backgroundColor: theme.dark ? "#333" : "#f4f4f4",
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              textAlign: "center",
              fontWeight: "600",
              color: theme.colors.primary,
              fontFamily: "Sora",
            }}
          >
            {gridId || "Unavailable"}
          </Text>
        </TouchableOpacity>

        <Text
          style={{
            marginBottom: 8,
            color: theme.colors.onSurface,
            fontFamily: "Sora",
          }}
        >
          Or share via:
        </Text>

        <Button
          icon="share-variant"
          mode="contained"
          onPress={handleShare}
          style={{ marginBottom: 16 }}
          labelStyle={{ fontFamily: "Sora" }}
        >
          Share
        </Button>

        <Button
          mode="text"
          textColor={theme.colors.error}
          onPress={onDismiss}
          labelStyle={{ fontFamily: "Sora" }}
        >
          Close
        </Button>
      </Modal>
    </Portal>
  );
};

export default InviteFriendsModal;
