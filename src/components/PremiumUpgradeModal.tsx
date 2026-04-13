import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  ScrollView,
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
  context?: "square_limit" | "premium_features";
  source?: string;
}

const PremiumUpgradeModal: React.FC<PremiumUpgradeModalProps> = ({
  visible,
  onDismiss,
  feature = "premium features",
  context = "premium_features",
  source: _source,
}) => {
  const theme = useTheme();
  const { refreshPremiumStatus } = usePremium();
  const [extraSquareProduct, setExtraSquareProduct] =
    useState<ProductInfo | null>(null);
  const [subscriptionProduct, setSubscriptionProduct] =
    useState<ProductInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [purchasingExtra, setPurchasingExtra] = useState(false);
  const [purchasingSub, setPurchasingSub] = useState(false);
  const [restoringPremium, setRestoringPremium] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const starSpin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      loadProducts();
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

  const loadProducts = async () => {
    setLoading(true);
    const [extra, sub] = await Promise.all([
      iapService.getExtraSquareProduct(),
      iapService.getSubscriptionProduct(),
    ]);
    setExtraSquareProduct(extra);
    setSubscriptionProduct(sub);
    setLoading(false);
  };

  const handlePurchaseExtra = async () => {
    if (!isIAPSupported()) {
      Toast.show({
        type: "info",
        text1: "Not available in Expo Go",
        text2: "Use a development build to test purchases",
        position: "bottom",
      });
      return;
    }

    if (!extraSquareProduct) {
      // Products failed to load — retry once before giving up
      setLoading(true);
      const retried = await iapService.getExtraSquareProduct();
      setLoading(false);
      if (!retried) {
        Toast.show({
          type: "error",
          text1: "Product unavailable",
          text2: "Could not connect to the App Store. Please try again.",
          position: "bottom",
        });
        return;
      }
      setExtraSquareProduct(retried);
    }

    setPurchasingExtra(true);
    try {
      await iapService.purchaseExtraSquare();
      // Dismiss the modal — the store dialog takes over.
      // IAPInitializer handles refresh + success toast when purchase completes.
      onDismiss();
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Purchase failed",
        text2: "Please try again",
        position: "bottom",
      });
    }
    setPurchasingExtra(false);
  };

  const handlePurchaseSub = async () => {
    if (!isIAPSupported()) {
      Toast.show({
        type: "info",
        text1: "Not available in Expo Go",
        text2: "Use a development build to test purchases",
        position: "bottom",
      });
      return;
    }

    if (!subscriptionProduct) {
      // Products failed to load — retry once before giving up
      setLoading(true);
      const retried = await iapService.getSubscriptionProduct();
      setLoading(false);
      if (!retried) {
        Toast.show({
          type: "error",
          text1: "Product unavailable",
          text2: "Could not connect to the App Store. Please try again.",
          position: "bottom",
        });
        return;
      }
      setSubscriptionProduct(retried);
    }

    setPurchasingSub(true);
    try {
      await iapService.purchaseSubscription();
      // Dismiss the modal — the store dialog takes over.
      // IAPInitializer handles refresh + success toast when purchase completes.
      onDismiss();
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Purchase failed",
        text2: "Please try again",
        position: "bottom",
      });
    }
    setPurchasingSub(false);
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

    setRestoringPremium(true);
    const restored = await iapService.restorePurchases();
    if (restored) {
      await refreshPremiumStatus();
      Toast.show({
        type: "success",
        text1: "Premium restored",
        position: "bottom",
      });
      onDismiss();
    } else {
      Toast.show({
        type: "info",
        text1: "No premium subscription found",
        text2: "Only active subscriptions can be restored",
        position: "bottom",
      });
    }
    setRestoringPremium(false);
  };

  const isDark = theme.dark;

  const subscriptionBenefits = [
    { icon: "all-inclusive", text: "Unlimited squares" },
    { icon: "palette", text: "Premium icons" },
    { icon: "brush", text: "Custom colors" },
    { icon: "star", text: "Profile badge" },
  ];

  // Determine which option to show first based on context
  const showExtraFirst = context === "square_limit";

  const renderExtraSquareOption = () => (
    <TouchableOpacity
      onPress={handlePurchaseExtra}
      disabled={purchasingExtra}
      activeOpacity={0.85}
      style={[
        styles.optionCard,
        {
          backgroundColor: isDark
            ? "rgba(94, 96, 206, 0.06)"
            : "rgba(94, 96, 206, 0.03)",
          borderColor: isDark
            ? "rgba(94, 96, 206, 0.18)"
            : "rgba(94, 96, 206, 0.12)",
        },
      ]}
    >
      <View style={styles.optionHeader}>
        <View
          style={[
            styles.optionIcon,
            {
              backgroundColor: isDark
                ? "rgba(94, 96, 206, 0.2)"
                : "rgba(94, 96, 206, 0.1)",
            },
          ]}
        >
          <MaterialIcons name="add-box" size={22} color="#6C63FF" />
        </View>
        <View style={styles.optionInfo}>
          <Text
            style={[styles.optionTitle, { color: isDark ? "#fff" : "#1a1a2e" }]}
          >
            Add 1 Extra Square
          </Text>
          <Text
            style={[
              styles.optionDesc,
              { color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)" },
            ]}
          >
            One-time use credit
          </Text>
        </View>
        <View style={styles.priceTag}>
          {purchasingExtra ? (
            <ActivityIndicator size="small" color="#6C63FF" />
          ) : (
            <Text style={[styles.priceText, { color: "#6C63FF" }]}>
              {extraSquareProduct?.localizedPrice || "$0.99"}
            </Text>
          )}
        </View>
      </View>
      <Text
        style={[
          styles.clarityNote,
          { color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)" },
        ]}
      >
        One-time purchase. Does not restore.
      </Text>
    </TouchableOpacity>
  );

  const renderSubscriptionOption = () => (
    <View style={styles.subSection}>
      <TouchableOpacity
        onPress={handlePurchaseSub}
        disabled={purchasingSub}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={purchasingSub ? ["#999", "#888"] : ["#6C63FF", "#4834DF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.subButton}
        >
          {purchasingSub ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialIcons
                name="workspace-premium"
                size={20}
                color="#FFD700"
              />
              <Text style={styles.subButtonText}>
                Go Premium —{" "}
                {subscriptionProduct?.localizedPrice || "$4.99"}/mo
              </Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <View style={styles.benefitsList}>
        {subscriptionBenefits.map((b, i) => (
          <View key={i} style={styles.benefitChip}>
            <MaterialIcons name={b.icon} size={14} color="#6C63FF" />
            <Text
              style={[
                styles.benefitChipText,
                { color: isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.65)" },
              ]}
            >
              {b.text}
            </Text>
          </View>
        ))}
      </View>
      <Text
        style={[
          styles.clarityNote,
          { color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)", textAlign: "center", marginTop: 10 },
        ]}
      >
        Subscription restores automatically when you sign in.
      </Text>
    </View>
  );

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalOuter}
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
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
            <Text style={styles.headerTitle}>
              {context === "square_limit" ? "Need More Squares?" : "Go Premium"}
            </Text>
            <Text style={styles.headerSubtitle}>
              {context === "square_limit"
                ? "Add extra slots or unlock everything"
                : `Unlock ${feature} and more`}
            </Text>
          </LinearGradient>

          {loading ? (
            <ActivityIndicator
              size="large"
              color="#6C63FF"
              style={{ marginVertical: 40 }}
            />
          ) : (
            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              bounces={false}
            >
              {/* Divider label */}
              {showExtraFirst ? (
                <>
                  {renderExtraSquareOption()}
                  <View style={styles.dividerRow}>
                    <View
                      style={[
                        styles.dividerLine,
                        { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)" },
                      ]}
                    />
                    <Text
                      style={[
                        styles.dividerText,
                        {
                          color: isDark
                            ? "rgba(255,255,255,0.18)"
                            : "rgba(0,0,0,0.18)",
                        },
                      ]}
                    >
                      or
                    </Text>
                    <View
                      style={[
                        styles.dividerLine,
                        { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)" },
                      ]}
                    />
                  </View>
                  {renderSubscriptionOption()}
                </>
              ) : (
                <>
                  {renderSubscriptionOption()}
                  <View style={styles.dividerRow}>
                    <View
                      style={[
                        styles.dividerLine,
                        { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)" },
                      ]}
                    />
                    <Text
                      style={[
                        styles.dividerText,
                        {
                          color: isDark
                            ? "rgba(255,255,255,0.18)"
                            : "rgba(0,0,0,0.18)",
                        },
                      ]}
                    >
                      or
                    </Text>
                    <View
                      style={[
                        styles.dividerLine,
                        { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)" },
                      ]}
                    />
                  </View>
                  {renderExtraSquareOption()}
                </>
              )}

              {/* Restore */}
              <TouchableOpacity
                onPress={handleRestore}
                disabled={restoringPremium}
                style={[styles.restoreButton, restoringPremium && { opacity: 0.5 }]}
              >
                {restoringPremium ? (
                  <ActivityIndicator size="small" color={isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)"} />
                ) : (
                  <Text
                    style={[
                      styles.restoreText,
                      {
                        color: isDark
                          ? "rgba(255,255,255,0.5)"
                          : "rgba(0,0,0,0.4)",
                      },
                    ]}
                  >
                    Restore Premium
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}
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
    maxHeight: "100%",
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
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginTop: 6,
    textAlign: "center",
  },
  body: {
    flexShrink: 1,
  },
  bodyContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  // Extra square option card
  optionCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  optionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  optionDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  priceTag: {
    minWidth: 50,
    alignItems: "center",
  },
  priceText: {
    fontSize: 18,
    fontWeight: "800",
  },
  slotCount: {
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },
  // Divider
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 13,
    fontWeight: "500",
  },
  // Subscription section
  subSection: {},
  subButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 16,
    gap: 8,
  },
  subButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
  },
  benefitsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
    justifyContent: "center",
  },
  benefitChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(108, 99, 255, 0.08)",
  },
  benefitChipText: {
    fontSize: 12,
    fontWeight: "500",
  },
  // Clarity notes
  clarityNote: {
    fontSize: 11,
    marginTop: 8,
    fontStyle: "italic",
  },
  // Restore
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
