import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from "react-native";
import { Modal, Portal, useTheme } from "react-native-paper";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
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
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const starSpin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      loadProduct();
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
      starSpin.setValue(0);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
        Animated.timing(starSpin, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
  }, [visible]);

  const spinInterpolate = starSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

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
    { icon: "grid-on", text: "Unlimited squares", desc: "Create as many as you want" },
    { icon: "block", text: "Ad-free experience", desc: "No banners or interruptions" },
    { icon: "palette", text: "Premium icons", desc: "25+ exclusive display styles" },
    { icon: "brush", text: "Custom colors", desc: "Full color picker unlocked" },
    { icon: "star", text: "Profile badge", desc: "Stand out from the crowd" },
  ];

  const isDark = theme.dark;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalOuter}
      >
        <Animated.View
          style={[
            styles.modalContainer,
            {
              backgroundColor: isDark ? "#1a1a2e" : "#fff",
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Close button */}
          <TouchableOpacity
            onPress={onDismiss}
            style={styles.closeButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <MaterialIcons
              name="close"
              size={22}
              color={isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.35)"}
            />
          </TouchableOpacity>

          {/* Gradient header */}
          <LinearGradient
            colors={isDark ? ["#2d1b69", "#1a1a2e"] : ["#6C63FF", "#4834DF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <Animated.View
              style={[
                styles.starContainer,
                { transform: [{ rotate: spinInterpolate }] },
              ]}
            >
              <MaterialIcons name="star" size={36} color="#FFD700" />
            </Animated.View>
            <Text style={styles.headerTitle}>Go Premium</Text>
            <Text style={styles.headerSubtitle}>
              Unlock {feature} and more
            </Text>
            {product && (
              <View style={styles.priceBadge}>
                <Text style={styles.priceBadgeText}>
                  One-time purchase
                </Text>
              </View>
            )}
          </LinearGradient>

          {/* Benefits */}
          <View style={styles.benefitsList}>
            {benefits.map((benefit, index) => (
              <View key={index} style={styles.benefitRow}>
                <View
                  style={[
                    styles.checkCircle,
                    {
                      backgroundColor: isDark
                        ? "rgba(108, 99, 255, 0.2)"
                        : "rgba(108, 99, 255, 0.1)",
                    },
                  ]}
                >
                  <MaterialIcons name={benefit.icon} size={18} color="#6C63FF" />
                </View>
                <View style={styles.benefitTextContainer}>
                  <Text
                    style={[
                      styles.benefitTitle,
                      { color: isDark ? "#fff" : "#1a1a2e" },
                    ]}
                  >
                    {benefit.text}
                  </Text>
                  <Text
                    style={[
                      styles.benefitDesc,
                      { color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)" },
                    ]}
                  >
                    {benefit.desc}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* CTA section */}
          <View style={styles.ctaSection}>
            {loading ? (
              <ActivityIndicator
                size="large"
                color="#6C63FF"
                style={styles.loader}
              />
            ) : (
              <>
                <TouchableOpacity
                  onPress={handlePurchase}
                  disabled={purchasing || !product}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={
                      purchasing || !product
                        ? ["#999", "#888"]
                        : ["#6C63FF", "#4834DF"]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.purchaseButton}
                  >
                    {purchasing ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <MaterialIcons name="lock-open" size={20} color="#fff" />
                        <Text style={styles.purchaseButtonText}>
                          {product
                            ? `Unlock Premium \u2014 ${product.localizedPrice}`
                            : "Loading..."}
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleRestore}
                  style={styles.restoreButton}
                >
                  <Text
                    style={[
                      styles.restoreText,
                      { color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)" },
                    ]}
                  >
                    Restore Purchase
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Animated.View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalOuter: {
    margin: 16,
  },
  modalContainer: {
    borderRadius: 24,
    overflow: "hidden",
  },
  closeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  starContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.8)",
    marginTop: 6,
    textAlign: "center",
  },
  priceBadge: {
    marginTop: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priceBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
  },
  benefitsList: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 14,
  },
  checkCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitTextContainer: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  benefitDesc: {
    fontSize: 12,
    marginTop: 1,
  },
  ctaSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 8,
  },
  loader: {
    marginVertical: 20,
  },
  purchaseButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  purchaseButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
  },
  restoreButton: {
    alignItems: "center",
    paddingVertical: 14,
  },
  restoreText: {
    fontSize: 13,
    fontWeight: "500",
  },
});

export default PremiumUpgradeModal;
