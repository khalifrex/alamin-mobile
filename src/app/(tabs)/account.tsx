import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, H2, Muted, Notice, Row, T } from '@/components/ui';
import { BASE_URL } from '@/lib/api';
import { useSession } from '@/lib/session';
import { colors } from '@/lib/theme';

export default function Account() {
  const { user, admin, error, signOut, refresh } = useSession();

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      {error ? (
        <>
          <Notice message={error} />
          <Button title="Retry connection" variant="dark" onPress={refresh} style={{ marginBottom: 14 }} />
        </>
      ) : null}

      <Card>
        {user ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 }}>
              <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
                <T weight="extrabold" style={{ color: colors.white, fontSize: 22 }}>{user.fullname.charAt(0).toUpperCase()}</T>
              </View>
              <View style={{ flex: 1 }}>
                <T weight="bold" style={{ color: colors.primary, fontSize: 17 }}>{user.fullname}</T>
                <Muted>{user.email}</Muted>
              </View>
            </View>
            <Row label="Phone" value={user.phone} />
            <View style={{ gap: 10, marginTop: 16 }}>
              <Button title="📦 My orders" variant="ghost" onPress={() => router.navigate('/orders')} />
              <Button title="🚪 Sign out" variant="danger" onPress={signOut} />
            </View>
          </>
        ) : (
          <>
            <H2>You’re not signed in</H2>
            <Muted style={{ marginBottom: 16 }}>Sign in or create a free account to order your designs and track deliveries.</Muted>
            <Button title="Sign in / Create account" onPress={() => router.push('/auth')} />
          </>
        )}
      </Card>

      <Card>
        <H2>🛠️ Shop admin</H2>
        <Muted style={{ marginBottom: 14 }}>
          {admin ? `Signed in as ${admin.username}.` : 'For the ShirtCraft team: manage orders, payments, prices and colours.'}
        </Muted>
        <Button title={admin ? 'Open admin panel' : 'Admin sign in'} variant="dark" onPress={() => router.push('/admin')} />
      </Card>

      <Muted style={{ textAlign: 'center', fontSize: 11, marginTop: 8 }}>Server: {BASE_URL}</Muted>
    </ScrollView>
  );
}
