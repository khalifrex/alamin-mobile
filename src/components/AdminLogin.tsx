import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Field, H1, Muted, Notice, Screen } from '@/components/ui';
import { errorMessage, post } from '@/lib/api';
import { useSession } from '@/lib/session';

export function AdminLogin() {
  const { refresh } = useSession();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null); setBusy(true);
    try {
      await post('admin_auth.php', { action: 'login', username, password });
      await refresh();
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 40 }} keyboardShouldPersistTaps="handled">
          <H1>🛠️ Shop admin</H1>
          <Muted style={{ marginBottom: 20 }}>Sign in to manage orders and the catalogue.</Muted>
          <Card>
            <Notice message={error} />
            <Field label="Username" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} textContentType="username" />
            <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry textContentType="password" onSubmitEditing={submit} />
            <Button title="Sign in" variant="dark" onPress={submit} loading={busy} />
          </Card>
          <Button title="← Back to the shop" variant="ghost" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
