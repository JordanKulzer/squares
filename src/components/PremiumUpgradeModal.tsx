import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from "react-native";
import { Modal, Portal, Button, useTheme } from "react-native-paper";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { iapService, isIAPSupported } from "../services/iapService";
import { usePremium } from "../contexts/PremiumContext";
import Toast from "react-native-toast-message";

interface ProductInfo {
  productId: string;
  title: string;
  description: string;
  localizedPrice: string;
  price: string;
}

interface PremiumUpgradeModalProps {
  visible: boolean;
  onDismiss: () => void;
  feature?: string;
}

const PremiumUpgradeModal: React.FC<PremiumUpgradeModalProps> = ({
  visible,
  onDismiss,
  feature = "premium features",
}) => {
  const theme = useTheme();
  const { refreshPremiumStatus } = usePremium();
  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      loadProduct();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible]);

  const loadProduct = async () => {
    setLoading(true);
    const prod = await iapService.getProduct();
    setProduct(prod);
    setLoading(false);
  };

  const handlePurchase = async () => {
    if (!isIAPSupported()) {
      Toast.show({
        type: "info",
        text1: "Not available in Expo Go",
        text2: "Use a development build to test purchases",
        position: "bottom",
      });
      return;
    }

    setPurchasing(true);
    try {
      await iapService.purchasePremium();
      await refreshPremiumStatus();
      Toast.show({
        type: "success",
        text1: "Welcome to Premium!",
        text2: "All features are now unlocked",
        position: "bottom",
      });
      onDismiss();
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Purchase failed",
        text2: "Please try again",
        position: "bottom",
      });
    }
    setPurchasing(false);
  };

  const handleRestore = async () => {
    if (!isIAPSupported()) {
      Toast.show({
        type: "info",
        text1: "Not available in Expo Go",
        text2: "Use a development build to test restore",
        position: "bottom",
      });
      return;
    }

    setLoading(true);
    const restored = await iapService.restorePurchases();
    if (restored) {
      await refreshPremiumStatus();
      Toast.show({
        type: "success",
        text1: "Purchase restored!",
        text2: "You now have premium access",
        position: "bottom",
      });
      onDismiss();
    } else {
      Toast.show({
        type: "info",
        text1: "No purchases found",
        text2: "No previous purchases to restore",
        position: "bottom",
      });
    }
    setLoading(false);
  };

  const benefits = [
    { icon: "block", text: "Ad-free experience" },
    { icon: "palette", text: "25+ premium icons" },
    { icon: "color-lens", text: "Custom color picker" },
    { icon: "star", text: "Premium profile badge" },
  ];

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.modalContainer,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.header}>
            <View style={styles.starContainer}>
              <MaterialIcons name="star" size={48} color="#FFD700" />
            </View>
            <Text style={[styles.title, { color: theme.colors.onSurface }]}>
              Go Premium
            </Text>
            <Text
              style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
            >
              Unlock {feature} and more!
            </Text>
          </View>

          <View style={styles.benefitsList}>
            {benefits.map((benefit, index) => (
              <View key={index} style={styles.benefitRow}>
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: theme.colors.primaryContainer },
                  ]}
                >
                  <MaterialIcons
                    name={benefit.icon}
                    size={20}
                    color={theme.colors.primary}
                  />
                </View>
                <Text
                  style={[styles.benefitText, { color: theme.colors.onSurface }]}
                >
                  {benefit.text}
                </Text>
              </View>
            ))}
          </View>

          {loading ? (
            <ActivityIndicator
              size="large"
              color={theme.colors.primary}
              style={styles.loader}
            />
          ) : (
            <>
              <Button
                mode="contained"
                onPress={handlePurchase}
                loading={purchasing}
                disabled={purchasing || !product}
                style={styles.purchaseButton}
                contentStyle={styles.purchaseButtonContent}
                labelStyle={styles.purchaseButtonLabel}
              >
                {product ? `Upgrade for ${product.localizedPrice}` : "Loading..."}
              </Button>

              <TouchableOpacity
                onPress={handleRestore}
                style={styles.restoreButton}
              >
                <Text
                  style={[styles.restoreText, { color: theme.colors.primary }]}
                >
                  Restore Purchases
                </Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity onPress={onDismiss} style={styles.cancelButton}>
            <Text
              style={[styles.cancelText, { color: theme.colors.onSurfaceVariant }]}
            >
              Maybe Later
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    margin: 20,
    padding: 24,
    borderRadius: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  starContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 15,
    marginTop: 8,
    textAlign: "center",
  },
  benefitsList: {
    marginBottom: 24,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 14,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitText: {
    fontSize: 16,
    fontWeight: "500",
  },
  loader: {
    marginVertical: 20,
  },
  purchaseButton: {
    marginBottom: 12,
    borderRadius: 12,
  },
  purchaseButtonContent: {
    paddingVertical: 8,
  },
  purchaseButtonLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  restoreButton: {
    alignItems: "center",
    padding: 12,
  },
  restoreText: {
    fontSize: 14,
    fontWeight: "600",
  },
  cancelButton: {
    alignItems: "center",
    padding: 8,
  },
  cancelText: {
    fontSize: 14,
  },
});

export default PremiumUpgradeModal;
