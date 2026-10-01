import { StyleSheet } from 'react-native';

export const colors = {
  clay: {
    50: '#FBF4EE', 100: '#F5E6D5', 200: '#EBCFB0', 300: '#DDB07F',
    400: '#CC9251', 500: '#B8773A', 600: '#9C5E2A', 700: '#7D4920',
    800: '#5E3618', 900: '#3F2410',
  },
  accent: {
    50: '#ECFDF5', 100: '#D1FAE5', 200: '#A7F3D0', 300: '#6EE7B7',
    400: '#34D399', 500: '#10B981', 600: '#059669', 700: '#047857',
    800: '#065F46', 900: '#064E3B',
  },
  warm: { 400: '#FB923C', 500: '#F97316', 600: '#EA580C' },
  neutral: {
    0: '#FFFFFF', 50: '#FAFAF9', 100: '#F5F5F4', 200: '#E7E5E4',
    300: '#D6D3D1', 400: '#A8A29E', 500: '#78716C', 600: '#57534E',
    700: '#44403C', 800: '#292524', 900: '#1C1917',
  },
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;

export const typography = {
  fontRegular: 'Poppins-Regular',
  fontMedium: 'Poppins-Medium',
  fontSemiBold: 'Poppins-SemiBold',
  fontBold: 'Poppins-Bold',
  h1: { fontSize: 28, lineHeight: 34, fontFamily: 'Poppins-Bold' },
  h2: { fontSize: 22, lineHeight: 28, fontFamily: 'Poppins-SemiBold' },
  h3: { fontSize: 18, lineHeight: 24, fontFamily: 'Poppins-SemiBold' },
  body: { fontSize: 15, lineHeight: 22, fontFamily: 'Poppins-Regular' },
  small: { fontSize: 13, lineHeight: 18, fontFamily: 'Poppins-Regular' },
  caption: { fontSize: 11, lineHeight: 16, fontFamily: 'Poppins-Regular' },
} as const;

export const shadows = {
  card: {
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  elevated: {
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.neutral[50] },
});
