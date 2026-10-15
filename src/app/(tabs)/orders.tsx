import { useCallback, useState } from 'react';
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Badge, Button, Empty, ErrorState, Loading, Muted, T } from '@/components/ui';
import { errorMessage, get, siteUrl } from '@/lib/api';
import { formatDate, naira } from '@/lib/format';
import { useSession } from '@/lib/session';
import { colors, radius, shadow } from '@/lib/theme';
import type { Order } from '@/lib/types';

/** Mirrors my_orders.php. Reloads whenever the tab is opened so status changes by the shop show up. */
export default function MyOrders() {
  const { user, ready } = useSession();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const r = await get<{ orders: Order[] }>('my_orders');
      setOrders(r.orders); setError(null);
    } catch (e) { setError(errorMessage(e)); }
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!ready) return <Loading />;
  if (!user) {
    return (
      <View style={{ padding: 16 }}>
        <Empty icon="🔐" title="Sign in to see your orders" text="Track every custom order and its payment status in one place."
          action={<Button title="Sign in" onPress={() => router.push('/auth')} />} />
      </View>
    );
  }
  if (error && !orders) return <ErrorState message={error} onRetry={load} />;
  if (!orders) return <Loading />;

  return (
    <FlatList
      data={orders}
      keyExtractor={o => o.ref}
      contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      ListEmptyComponent={
        <Empty icon="🛍️" title="No orders placed yet" text="Design your first custom shirt and see it in 3D before you order."
          action={<Button title="🎨 Open Design Studio" onPress={() => router.navigate('/design')} />} />
      }
      renderItem={({ item: o }) => (
        <Pressable onPress={() => router.push({ pathname: '/receipt/[ref]', params: { ref: o.ref } })} style={styles.card}>
          {o.design_front
            ? <Image source={{ uri: siteUrl(o.design_front) }} style={styles.thumb} resizeMode="contain" />
            : <View style={[styles.thumb, { alignItems: 'center', justifyContent: 'center' }]}><T style={{ fontSize: 28 }}>👕</T></View>}
          <View style={{ flex: 1, gap: 3 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <T weight="extrabold" style={{ color: colors.primary }}>{o.ref}</T>
              <T weight="extrabold" style={{ color: colors.accent }}>{naira(o.total)}</T>
            </View>
            <Muted style={{ fontSize: 12 }}>{o.type_label} · Size {o.size} · Qty {o.qty}</Muted>
            <Muted style={{ fontSize: 11 }}>Placed on {formatDate(o.created_at)}</Muted>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
              <Badge code={o.payment_status} label={(o.payment_status === 'paid' ? '✅ ' : '⏳ ') + o.payment_label} />
              <Badge code={o.order_status} label={'🧵 ' + o.order_label} />
            </View>
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: 14, backgroundColor: colors.white, borderRadius: radius.lg, padding: 14, marginBottom: 12, ...shadow },
  thumb: { width: 64, height: 78, borderRadius: radius.sm, backgroundColor: colors.canvas, borderWidth: 1, borderColor: '#eee' },
});
