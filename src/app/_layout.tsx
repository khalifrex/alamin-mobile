import {
  Poppins_400Regular, Poppins_400Regular_Italic, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold,
  Poppins_700Bold_Italic, Poppins_800ExtraBold, useFonts,
} from '@expo-google-fonts/poppins';
import { Anton_400Regular } from '@expo-google-fonts/anton';
import { ArchivoBlack_400Regular } from '@expo-google-fonts/archivo-black';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Loading } from '@/components/ui';
import { SessionProvider } from '@/lib/session';
import { colors, font } from '@/lib/theme';

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Poppins_400Regular, Poppins_400Regular_Italic, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold,
    Poppins_700Bold_Italic, Poppins_800ExtraBold, Anton_400Regular, ArchivoBlack_400Regular,
  });
  if (!loaded && !error) return <Loading />;

  return (
    <SessionProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTintColor: colors.primary,
          headerTitleStyle: { fontFamily: font.bold },
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.bg },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ title: 'Sign in', presentation: 'modal' }} />
        <Stack.Screen name="checkout" options={{ title: 'Checkout' }} />
        <Stack.Screen name="receipt/[ref]" options={{ title: 'Order receipt' }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
      </Stack>
    </SessionProvider>
  );
}
