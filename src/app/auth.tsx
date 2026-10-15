import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Chip, Field, H1, Muted, Notice, Select } from '@/components/ui';
import { errorMessage, post } from '@/lib/api';
import { COUNTRY_CODES } from '@/lib/format';
import { useSession } from '@/lib/session';

/** Sign in / create account — posts to api/auth.php like the website's auth.js. */
export default function AuthScreen() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const { refresh } = useSession();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ fullname: '', email: '', country_code: '+234', phone: '', password: '', confirm_password: '' });
  const set = (k: keyof typeof f) => (v: string) => setF(s => ({ ...s, [k]: v }));

  const submit = async () => {
    setError(null);
    if (mode === 'register') {
      if (f.password.length < 8) return setError('Password must be at least 8 characters.');
      if (f.password !== f.confirm_password) return setError('Passwords do not match.');
    }
    setBusy(true);
    try {
      await post('auth.php', mode === 'login' ? { action: 'login', email: f.email, password: f.password } : { action: 'register', ...f });
      await refresh(); // the server started a new session + CSRF token
      if (next === 'checkout') router.replace('/checkout');
      else if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch (e) {
      setError(errorMessage(e));
    } finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', marginBottom: 18 }}>
          <Chip label="Sign in" active={mode === 'login'} onPress={() => { setMode('login'); setError(null); }} />
          <Chip label="Create account" active={mode === 'register'} onPress={() => { setMode('register'); setError(null); }} />
        </View>
        <H1>{mode === 'login' ? 'Welcome back! 👋' : 'Create account 🎉'}</H1>
        <Muted style={{ marginBottom: 20 }}>
          {next === 'checkout' ? 'Sign in to place your order — your design is saved.' : mode === 'login' ? 'Sign in to order your custom designs' : 'It takes less than a minute'}
        </Muted>
        <Notice message={error} />

        {mode === 'register' ? <Field label="Full name" value={f.fullname} onChangeText={set('fullname')} placeholder="First and last name" autoComplete="name" textContentType="name" /> : null}
        <Field label="Email address" value={f.email} onChangeText={set('email')} placeholder="you@gmail.com" autoCapitalize="none"
          keyboardType="email-address" autoComplete="email" textContentType="emailAddress" />
        {mode === 'register' ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ width: 110 }}>
              <Select label="Code" value={f.country_code} options={COUNTRY_CODES.map(c => ({ value: c, label: c }))} onChange={set('country_code')} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Phone number" value={f.phone} onChangeText={set('phone')} placeholder="08012345678" keyboardType="phone-pad"
                autoComplete="tel" textContentType="telephoneNumber" />
            </View>
          </View>
        ) : null}
        <Field label="Password" value={f.password} onChangeText={set('password')} secureTextEntry
          placeholder={mode === 'register' ? 'Min. 8 characters' : 'Enter your password'}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'} textContentType={mode === 'login' ? 'password' : 'newPassword'} />
        {mode === 'register' ? (
          <Field label="Confirm password" value={f.confirm_password} onChangeText={set('confirm_password')} secureTextEntry
            placeholder="Repeat your password" autoComplete="new-password" textContentType="newPassword" />
        ) : null}

        <Button title={mode === 'login' ? 'Sign in' : 'Create account & sign in →'} onPress={submit} loading={busy} style={{ marginTop: 6 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
