import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { Button, Card, Dot, Empty, ErrorState, Field, H2, Loading, Muted, Notice, Row, Select, T } from '@/components/ui';
import { ApiError, errorMessage, get, post, siteUrl, type SessionUser } from '@/lib/api';
import { naira, NIGERIAN_STATES } from '@/lib/format';
import { colors, radius } from '@/lib/theme';
import type { Bank } from '@/lib/types';

type DraftReply = {
  user: SessionUser; bank: Bank;
  draft: null | { type_label: string; size: string; color: string; color_label: string; qty: number; front: string | null; back: string | null };
  quote: { unit: number; discount: number; total: number; qty: number; subtotal: number };
};

/** Mirrors checkout.php: review the saved design, enter delivery details, place the order (api/place_order.php). */
export default function Checkout() {
  const [data, setData] = useState<DraftReply | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [f, setF] = useState({ fullname: '', email: '', phone: '', state: 'Lagos', address: '', city: '', notes: '', payment_method: 'bank' as 'bank' | 'pod' });
  const set = (k: keyof typeof f) => (v: string) => setF(s => ({ ...s, [k]: v }));
  const scroll = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const r = await get<DraftReply>('draft');
      setData(r);
      if (r.user) setF(s => ({ ...s, fullname: s.fullname || r.user.fullname, email: s.email || r.user.email, phone: s.phone || r.user.phone }));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) { router.replace({ pathname: '/auth', params: { next: 'checkout' } }); return; }
      setLoadError(errorMessage(e));
    }
  }, []);
  useEffect(() => { Promise.resolve().then(load); }, [load]);

  const fail = (m: string) => { setError(m); scroll.current?.scrollTo({ y: 0, animated: true }); };

  const placeOrder = async () => {
    setError(null);
    const d = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.trim()])) as typeof f;
    if (!d.fullname || !d.phone || !d.address || !d.city || !d.state) return fail('Please fill in all required delivery details.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return fail('Please enter a valid email address.');
    setBusy(true);
    try {
      const r = await post<{ redirect: string }>('place_order.php', d);
      const ref = decodeURIComponent(r.redirect.split('ref=')[1] ?? '');
      router.replace({ pathname: '/receipt/[ref]', params: { ref, fresh: '1' } });
    } catch (e) {
      fail(errorMessage(e));
    } finally { setBusy(false); }
  };

  if (loadError) return <ErrorState message={loadError} onRetry={load} />;
  if (!data) return <Loading />;
  if (!data.draft) {
    return (
      <View style={{ padding: 16 }}>
        <Empty icon="🎨" title="No design to check out" text="Your design session expired. Open the Design Studio and add your design to the order again."
          action={<Button title="Open Design Studio" onPress={() => router.navigate('/design')} />} />
      </View>
    );
  }
  const { draft, quote, bank } = data;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} keyboardVerticalOffset={90}>
      <ScrollView ref={scroll} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Notice message={error} />

        <Card>
          <H2>📋 Order summary</H2>
          <View style={{ flexDirection: 'row', gap: 14, marginBottom: 10 }}>
            {draft.front ? <Image source={{ uri: siteUrl(draft.front) }} style={styles.thumb} resizeMode="contain" /> : null}
            <View style={{ flex: 1 }}>
              <T weight="bold" style={{ color: colors.primary, fontSize: 15 }}>Custom {draft.type_label}</T>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <Muted>Size {draft.size} · {draft.color_label}</Muted><Dot color={draft.color} size={12} />
              </View>
              <Muted>Qty: {draft.qty} × {naira(quote.unit)}</Muted>
              {draft.back ? <Muted>Includes back print</Muted> : null}
            </View>
          </View>
          <Row label="Subtotal" value={naira(quote.subtotal)} />
          {quote.discount > 0 ? <Row label={`Bulk discount (${Math.round(quote.discount * 100)}%)`} value={`−${naira(quote.subtotal - quote.total)}`} /> : null}
          <Row label="Delivery" value={naira(0)} />
          <Row label="Total" value={<T weight="extrabold" style={{ color: colors.accent, fontSize: 18 }}>{naira(quote.total)}</T>} />
          <Pressable onPress={() => router.navigate('/design')} style={{ marginTop: 10 }}>
            <T weight="semibold" style={{ color: colors.accent, textAlign: 'center' }}>← Edit design</T>
          </Pressable>
        </Card>

        <Card>
          <H2>📍 Delivery information</H2>
          <Field label="Full name" value={f.fullname} onChangeText={set('fullname')} textContentType="name" />
          <Field label="Email address" value={f.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" />
          <Field label="Phone number" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
          <Select label="State" value={f.state} options={NIGERIAN_STATES.map(s => ({ value: s, label: s }))} onChange={set('state')} />
          <Field label="Delivery address" value={f.address} onChangeText={set('address')} placeholder="House/street number and street name" maxLength={255} />
          <Field label="City / town" value={f.city} onChangeText={set('city')} placeholder="e.g. Ikeja" maxLength={100} />
          <Field label="Additional notes (optional)" value={f.notes} onChangeText={set('notes')} placeholder="e.g. landmark, special instructions" maxLength={255} />
        </Card>

        <Card>
          <H2>💳 Payment method</H2>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
            {([['bank', '🏦', 'Bank transfer'], ['pod', '🚚', 'Pay on delivery']] as const).map(([m, icon, label]) => (
              <Pressable key={m} onPress={() => setF(s => ({ ...s, payment_method: m }))}
                style={[styles.payOpt, f.payment_method === m && styles.payOptActive]}>
                <T style={{ fontSize: 26 }}>{icon}</T>
                <T weight="bold" style={{ color: colors.primary, fontSize: 13 }}>{label}</T>
              </Pressable>
            ))}
          </View>
          {f.payment_method === 'bank' ? (
            <>
              <View style={styles.bank}>
                <Row label="Bank" value={bank.name} />
                <Row label="Account number" value={
                  <Pressable onPress={async () => { await Clipboard.setStringAsync(bank.account); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <T weight="bold">{bank.account}</T>
                    <T weight="semibold" style={{ color: colors.accent, fontSize: 12 }}>{copied ? 'Copied!' : 'Copy'}</T>
                  </Pressable>
                } />
                <Row label="Account name" value={bank.holder} />
                <Row label="Amount" value={<T weight="bold" style={{ color: colors.accent }}>{naira(quote.total)}</T>} />
              </View>
              <Notice kind="warning" style={{ marginTop: 12, marginBottom: 0 }}
                message='Place the order first — you&apos;ll get an Order Reference to use as your payment narration. Production starts once your transfer is confirmed.' />
            </>
          ) : (
            <Notice kind="success" style={{ marginBottom: 0 }} message={`You'll pay ${naira(quote.total)} in cash or by transfer to the rider when your order is delivered.`} />
          )}
        </Card>

        <Button title="✅ Place order now" onPress={placeOrder} loading={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  thumb: { width: 70, height: 84, borderRadius: radius.sm, backgroundColor: colors.canvas, borderWidth: 1, borderColor: '#eee' },
  payOpt: { flex: 1, alignItems: 'center', padding: 14, borderRadius: radius.sm, borderWidth: 2, borderColor: colors.border, gap: 4 },
  payOptActive: { borderColor: colors.accent, backgroundColor: '#fff5f7' },
  bank: { backgroundColor: colors.bg, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 4 },
});
