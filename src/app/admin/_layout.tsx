import { Stack } from 'expo-router';
import { Loading } from '@/components/ui';
import { AdminLogin } from '@/components/AdminLogin';
import { useSession } from '@/lib/session';
import { colors, font } from '@/lib/theme';

/** Admin area — separate sign-in from customer accounts, same as admin/ on the website. */
export default function AdminLayout() {
  const { ready, admin } = useSession();
  if (!ready) return <Loading />;
  if (!admin) return <AdminLogin />;

  return (
    <Stack screenOptions={{
      headerTintColor: colors.white, headerStyle: { backgroundColor: colors.primary },
      headerTitleStyle: { fontFamily: font.bold }, headerBackButtonDisplayMode: 'minimal',
      contentStyle: { backgroundColor: colors.bg },
    }}>
      <Stack.Screen name="index" options={{ title: 'Orders' }} />
      <Stack.Screen name="order/[ref]" options={{ title: 'Order' }} />
      <Stack.Screen name="catalog" options={{ title: 'Catalog & prices' }} />
      <Stack.Screen name="account" options={{ title: 'Admin account' }} />
    </Stack>
  );
}
