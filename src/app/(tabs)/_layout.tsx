import { Text } from 'react-native';
import { Tabs } from 'expo-router/tabs';
import { colors, font } from '@/lib/theme';

function TabIcon({ glyph, focused }: { glyph: string; focused: boolean }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.55 }}>{glyph}</Text>;
}
const icon = (glyph: string) => function Icon({ focused }: { focused: boolean }) {
  return <TabIcon glyph={glyph} focused={focused} />;
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.gray,
        tabBarLabelStyle: { fontFamily: font.semibold, fontSize: 11 },
        headerTitleStyle: { fontFamily: font.bold, color: colors.primary },
        sceneStyle: { backgroundColor: colors.bg },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home', headerShown: false, tabBarIcon: icon('🏠') }} />
      <Tabs.Screen name="design" options={{ title: 'Design Studio', tabBarLabel: 'Design', tabBarIcon: icon('🎨') }} />
      <Tabs.Screen name="orders" options={{ title: 'My Orders', tabBarLabel: 'Orders', tabBarIcon: icon('📦') }} />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: icon('👤') }} />
    </Tabs>
  );
}
