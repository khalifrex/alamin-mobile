import { useState } from 'react';
import { ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Field, H2, Muted, Notice } from '@/components/ui';
import { errorMessage, post } from '@/lib/api';
import { useSession } from '@/lib/session';

/** Mirrors admin/account.php. */
export default function AdminAccount() {
  const { admin, adminSignOut } = useSession();
  const [f, setF] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF(s => ({ ...s, [k]: v }));

  const save = async () => {
    setBusy(true); setNotice(null);
    try {
      const r = await post<{ message: string }>('admin_auth.php', { action: 'change_password', ...f });
      setNotice({ kind: 'success', msg: r.message });
      setF({ current_password: '', new_password: '', confirm_password: '' });
    } catch (e) { setNotice({ kind: 'error', msg: errorMessage(e) }); } finally { setBusy(false); }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <Muted style={{ marginBottom: 12 }}>Signed in as {admin?.username}.</Muted>
      <Card>
        <H2>Change password</H2>
        <Muted style={{ fontSize: 12, marginBottom: 12 }}>The starter password is admin123 — change it before anyone else can reach this site.</Muted>
        {notice ? <Notice kind={notice.kind} message={notice.msg} /> : null}
        <Field label="Current password" value={f.current_password} onChangeText={set('current_password')} secureTextEntry textContentType="password" />
        <Field label="New password (8+ characters)" value={f.new_password} onChangeText={set('new_password')} secureTextEntry textContentType="newPassword" />
        <Field label="Confirm new password" value={f.confirm_password} onChangeText={set('confirm_password')} secureTextEntry textContentType="newPassword" />
        <Button title="Update password" variant="dark" onPress={save} loading={busy} />
      </Card>
      <Button title="🚪 Sign out of admin" variant="danger"
        onPress={async () => { await adminSignOut(); router.dismissTo('/account'); }} />
    </ScrollView>
  );
}
