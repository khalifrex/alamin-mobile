import { useCallback, useEffect, useState } from 'react';
import { Image, ScrollView, Share, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Badge, Button, Card, Dot, Empty, ErrorState, H2, Loading, Muted, Row, T } from '@/components/ui';
import { ApiError, errorMessage, get, siteUrl } from '@/lib/api';
import { formatDate, naira, trimPct } from '@/lib/format';
import { colors, radius } from '@/lib/theme';
import type { Bank, Order } from '@/lib/types';

/** Mirrors receipt.php — only the owner of the order can open it. */
export default function Receipt() {
  const { ref, fresh } = useLocalSearchParams<{ ref: string; fresh?: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [bank, setBank] = useState<Bank | null>(null);
  const [error, setError] = useState<{ msg: string; notFound: boolean } | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await get<{ order: Order; bank: Bank }>('order', { ref });
      setOrder(r.order); setBank(r.bank);
    } catch (e) {
      setError({ msg: errorMessage(e), notFound: e instanceof ApiError && e.status === 404 });
    }
  }, [ref]);
  useEffect(() => { Promise.resolve().then(load); }, [load]);

  if (error?.notFound) {
    return (
      <View style={{ padding: 16 }}>
        <Empty icon="📭" title="No order found" text={error.msg} action={<Button title="🎨 Create a new design" onPress={() => router.navigate('/design')} />} />
      </View>
    );
  }
  if (error) return <ErrorState message={error.msg} onRetry={load} />;
  if (!order || !bank) return <Loading />;

  const paid = order.payment_status === 'paid';
  const share = () => Share.share({
    message: `ShirtCraft order ${order.ref}\n${order.qty} × Custom ${order.type_label} (${order.size}, ${order.color_label})\nTotal: ${naira(order.total)}\nPayment: ${order.payment_label}`
      + (order.payment_method === 'bank' && !paid ? `\n\nPay to ${bank.name} ${bank.account} (${bank.holder}), narration: ${order.ref}` : ''),
  });

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={styles.header}>
        <T style={{ fontSize: 44 }}>✅</T>
        <T weight="extrabold" style={{ color: colors.white, fontSize: 22 }}>{fresh ? 'Order confirmed!' : 'Order receipt'}</T>
        <T style={{ color: 'rgba(255,255,255,0.75)', textAlign: 'center' }}>Thank you for your order. We’re preparing your custom apparel.</T>
      </View>

      <Card style={{ alignItems: 'center' }}>
        <Muted>Order reference number</Muted>
        <T weight="extrabold" selectable style={{ fontSize: 24, color: colors.primary, letterSpacing: 1 }}>{order.ref}</T>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <Badge code={order.payment_status} label={(paid ? '✅ ' : '⏳ ') + order.payment_label} />
          <Badge code={order.order_status} label={'🧵 ' + order.order_label} />
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
          {([['Front', order.design_front], ['Back', order.design_back]] as const).map(([label, src]) => src ? (
            <View key={label} style={{ alignItems: 'center' }}>
              <Image source={{ uri: siteUrl(src) }} style={styles.design} resizeMode="contain" />
              <Muted style={{ fontSize: 12, marginTop: 4 }}>{label}</Muted>
            </View>
          ) : null)}
        </View>
      </Card>

      <Card>
        <H2>📦 Order details</H2>
        <Row label="Shirt type" value={order.type_label} />
        <Row label="Size" value={order.size} />
        <Row label="Colour" value={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><T weight="medium">{order.color_label}</T><Dot color={order.color} /></View>} />
        <Row label="Quantity" value={`${order.qty} × ${naira(order.unit_price)}`} />
        {order.discount_pct > 0 ? <Row label="Bulk discount" value={`${trimPct(order.discount_pct)}%`} /> : null}
        <Row label="Order date" value={formatDate(order.created_at, true)} />
      </Card>

      <Card>
        <H2>📍 Delivery details</H2>
        <Row label="Name" value={order.customer_name} />
        <Row label="Email" value={order.customer_email} />
        <Row label="Phone" value={order.customer_phone} />
        <Row label="Address" value={`${order.address}, ${order.city}, ${order.state}`} />
        {order.notes ? <Row label="Notes" value={order.notes} /> : null}
      </Card>

      <Card>
        <H2>💳 Payment</H2>
        <Row label="Method" value={order.payment_method === 'pod' ? '🚚 Pay on delivery' : '🏦 Bank transfer'} />
        <Row label="Status" value={<T weight="bold" style={{ color: paid ? colors.success : colors.warning }}>{order.payment_label}</T>} />
        <Row label="Total amount" value={<T weight="extrabold" style={{ color: colors.accent, fontSize: 18 }}>{naira(order.total)}</T>} />
      </Card>

      {order.payment_method === 'bank' && !paid ? (
        <View style={styles.bankNote}>
          <T weight="bold" style={{ color: '#92400e', marginBottom: 6 }}>⚠️ Complete your bank transfer</T>
          <T style={{ color: '#78350f', lineHeight: 21 }} selectable>
            Transfer the exact amount to:{'\n'}
            <T weight="bold" style={{ color: '#78350f' }}>{bank.name}</T>{'\n'}
            Account number: <T weight="bold" style={{ color: '#78350f' }}>{bank.account}</T>{'\n'}
            Account name: <T weight="bold" style={{ color: '#78350f' }}>{bank.holder}</T>{'\n\n'}
            Use <T weight="bold" style={{ color: '#78350f' }}>{order.ref}</T> as the payment narration.
          </T>
        </View>
      ) : null}

      <View style={{ gap: 10 }}>
        <Button title="📤 Share receipt" variant="ghost" onPress={share} />
        <Button title="🎨 Design another" onPress={() => router.navigate('/design')} />
        <Button title="📦 View my orders" variant="dark" onPress={() => router.navigate('/orders')} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: 22, alignItems: 'center', gap: 6, marginBottom: 14 },
  design: { width: 140, height: 168, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.canvas },
  bankNote: { backgroundColor: '#fef3c7', borderColor: '#f59e0b', borderWidth: 1, borderRadius: radius.lg, padding: 16, marginBottom: 14 },
});
