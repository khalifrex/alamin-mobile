import { useCallback, useEffect, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Card, Dot, ErrorState, H2, Loading, Muted, Notice, Row, Select, T } from '@/components/ui';
import { errorMessage, get, post, siteUrl } from '@/lib/api';
import { formatDate, naira, trimPct } from '@/lib/format';
import { colors, radius } from '@/lib/theme';
import type { Order, SavedLayer, StatusOption } from '@/lib/types';

type Reply = { order: Order; order_statuses: StatusOption[]; payment_statuses: StatusOption[] };

/** Mirrors admin/order.php: change statuses, see customer details, the design proofs and the exact print layers. */
export default function AdminOrder() {
  const { ref } = useLocalSearchParams<{ ref: string }>();
  const [data, setData] = useState<Reply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);

  const load = useCallback(async () => {
    try { setData(await get<Reply>('admin_order', { ref })); setError(null); } catch (e) { setError(errorMessage(e)); }
  }, [ref]);
  useEffect(() => { Promise.resolve().then(load); }, [load]);

  const update = async (field: 'order_status' | 'payment_status', value: string) => {
    if (!data) return;
    setSaving(field); setNotice(null);
    try {
      const r = await post<{ order_status: string; payment_status: string; order_label: string; payment_label: string }>(
        'admin_order.php', { id: data.order.id, [field]: value });
      setData({ ...data, order: { ...data.order, ...r } });
      setNotice({ kind: 'success', msg: field === 'order_status' ? `Production: ${r.order_label}` : `Payment: ${r.payment_label}` });
    } catch (e) {
      setNotice({ kind: 'error', msg: errorMessage(e) });
    } finally { setSaving(null); }
  };

  if (error && !data) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <Loading />;
  const o = data.order;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Stack.Screen options={{ title: o.ref }} />
      <Muted style={{ marginBottom: 12 }}>Placed {formatDate(o.created_at, true)}</Muted>
      {notice ? <Notice kind={notice.kind} message={notice.msg} /> : null}

      <Card>
        <H2>Status</H2>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Select label="Payment" value={o.payment_status} disabled={!!saving}
              options={data.payment_statuses.map(s => ({ value: s.code, label: s.label }))} onChange={v => update('payment_status', v)} />
          </View>
          <View style={{ flex: 1 }}>
            <Select label="Production" value={o.order_status} disabled={!!saving}
              options={data.order_statuses.map(s => ({ value: s.code, label: s.label }))} onChange={v => update('order_status', v)} />
          </View>
        </View>
        <Muted style={{ fontSize: 12 }}>{saving ? 'Saving…' : 'Customers see the production status on their receipt and in "My Orders".'}</Muted>
      </Card>

      <Card>
        <H2>Item</H2>
        <Row label="Shirt type" value={o.type_label} />
        <Row label="Size" value={o.size} />
        <Row label="Colour" value={<View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><T weight="medium">{o.color_label}</T><Muted style={{ fontSize: 12 }}>{o.color}</Muted><Dot color={o.color} /></View>} />
        <Row label="Quantity" value={`${o.qty} × ${naira(o.unit_price)}`} />
        {o.discount_pct > 0 ? <Row label="Bulk discount" value={`${trimPct(o.discount_pct)}%`} /> : null}
        <Row label="Total" value={naira(o.total)} strong />
        <Row label="Payment method" value={o.payment_method === 'pod' ? 'Pay on delivery' : 'Bank transfer'} />
      </Card>

      <Card>
        <H2>Customer & delivery</H2>
        <Row label="Name" value={o.customer_name} />
        <Row label="Phone" value={<Link text={o.customer_phone} url={`tel:${o.customer_phone.replace(/\s+/g, '')}`} />} />
        <Row label="Email" value={<Link text={o.customer_email} url={`mailto:${o.customer_email}`} />} />
        <Row label="Address" value={`${o.address}, ${o.city}, ${o.state}`} />
        {o.notes ? <Row label="Notes" value={o.notes} /> : null}
      </Card>

      <Card>
        <H2>Design</H2>
        <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
          {([['Front', o.design_front], ['Back', o.design_back]] as const).map(([label, src]) => src ? (
            <Pressable key={label} onPress={() => Linking.openURL(siteUrl(src))} style={{ alignItems: 'center' }}>
              <Image source={{ uri: siteUrl(src) }} style={styles.proof} resizeMode="contain" />
              <Muted style={{ fontSize: 12 }}>{label} · open PNG ↗</Muted>
            </Pressable>
          ) : null)}
          {!o.design_front && !o.design_back ? <Muted>No preview image was saved for this order.</Muted> : null}
        </View>

        {(['front', 'back'] as const).map(side => o.layers && o.layers[side].length ? (
          <View key={side} style={{ marginTop: 16 }}>
            <T weight="bold" style={{ color: colors.primary, marginBottom: 6 }}>{side === 'front' ? 'Front' : 'Back'} print layers</T>
            {o.layers[side].map((l, i) => <LayerRow key={i} n={i + 1} l={l} />)}
          </View>
        ) : null)}
      </Card>
    </ScrollView>
  );
}

function Link({ text, url }: { text: string; url: string }) {
  return <Pressable onPress={() => Linking.openURL(url)}><T weight="semibold" style={{ color: colors.accent }}>{text}</T></Pressable>;
}

function LayerRow({ n, l }: { n: number; l: SavedLayer }) {
  let detail: React.ReactNode = null;
  if (l.type === 'text') {
    detail = (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <T>“{l.text}” — {l.font}, {l.size}px, {l.style ?? 'normal'}</T><Dot color={l.color ?? '#000000'} size={12} /><Muted style={{ fontSize: 12 }}>{l.color}</Muted>
      </View>
    );
  } else if (l.type === 'image') {
    detail = <Link text={`${l.src} — ${Math.round(l.width ?? 0)} × ${Math.round(l.height ?? 0)} px`} url={siteUrl(`uploads/artwork/${l.src}`)} />;
  } else {
    detail = <T>{l.char} preset, {l.size}px</T>;
  }
  return (
    <View style={styles.layer}>
      <T weight="bold" style={{ width: 22, color: colors.gray }}>{n}</T>
      <View style={{ flex: 1 }}>
        <Muted style={{ fontSize: 11, textTransform: 'uppercase' }}>{l.type} · x {Math.round(l.x)}, y {Math.round(l.y)}</Muted>
        {detail}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  proof: { width: 150, height: 180, borderRadius: radius.sm, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.border },
  layer: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
});
