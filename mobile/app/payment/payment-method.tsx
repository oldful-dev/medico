// Payment Method - Select/add payment method
import { View, Text, StyleSheet } from "react-native";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { Fonts, FontSize, Spacing } from "@/constants/theme";
import { useTranslation } from "react-i18next";

export default function PaymentMethodScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{t('checkout.payment_method')}</Text>
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.bgScreen,
      padding: Spacing.xl,
      justifyContent: "center",
      alignItems: "center",
    },
    title: {
      fontFamily: Fonts.semiBold,
      fontSize: FontSize.heading2,
      color: colors.textDark,
    },
  });
