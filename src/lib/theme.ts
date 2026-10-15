// Same palette as assets/css/style.css on the website.
export const colors = {
  primary: '#1a1a2e',
  secondary: '#16213e',
  accent: '#e94560',
  accentDark: '#c73652',
  gold: '#f0a500',
  white: '#ffffff',
  bg: '#f5f5f5',
  gray: '#888888',
  text: '#333333',
  success: '#27ae60',
  warning: '#f39c12',
  error: '#e74c3c',
  border: '#dddddd',
  canvas: '#f8f8f8',
};

export const radius = { lg: 12, sm: 8, pill: 999 };

export const font = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
  extrabold: 'Poppins_800ExtraBold',
};

export const shadow = {
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
} as const;
