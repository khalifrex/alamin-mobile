import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, Stack, useFocusEffect } from 'expo-router';
import { Badge, Chip, ErrorState, Loading, Muted, T } from '@/components/ui';
import { errorMessage, get, siteUrl } from '@/lib/api';
import { formatDate, naira } from '@/lib/format';
import { colors, font, radius, shadow } from '@/lib/theme';
import type { Order, StatusOption } from '@/lib/types';

type ListReply = {
  orders: Order[]; page: number; pages: number; total: number;
  stats: { all: number; new: number; in_production: number; awaiting: number; paid_total: number };
  order_statuses: StatusOption[]; payment_statuses: StatusOption[];
};

/** Mirrors admin/index.php: headline numbers, search + filters, newest orders first. */
export default function AdminOrders() {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [pay, setPay] = useState('');
  const [data, setData] = useState<ListReply | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const seq = useRef(0);

  const load = useCallback(async (page = 1) => {
    const my = ++seq.current;
    try {
      const r = await get<ListReply>('admin_orders', { q: query, status, pay, page });
      if (my !== seq.current) return;
      setData(r); setError(null);
      setOrders(prev => (page === 1 ? r.orders : [...prev, ...r.orders]));
    } catch (e) { if (my === seq.current) setError(errorMessage(e)); }
  }, [query, status, pay]);

  useEffect(() => { Promise.resolve(1).then(load); }, [load]);
  // reload when coming back from an order (its status may have changed)
  const first = useRef(true);
  useFocusEffect(useCallback(() => { if (first.current) { first.current = false; return; } load(1); }, [load]));
  // search as you type (debounced)
  useEffect(() => { const t = setTimeout(() => setQuery(q.trim()), 350); return () => clearTimeout(t); }, [q]);

  const header = (
    <Stack.Screen options={{
      headerRight: () => (
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <Pressable onPress={() => router.push('/admin/catalog')} hitSlop={8}><T style={{ fontSize: 20 }}>🏷️</T></Pressable>
          <Pressable onPress={() => router.push('/admin/account')} hitSlop={8}><T style={{ fontSize: 20 }}>👤</T></Pressable>
        </View>
      ),
    }} />
  );

  if (error && !data) return <>{header}<ErrorState message={error} onRetry={() => load(1)} /></>;
  if (!data) return <>{header}<Loading /></>;
  const s = data.stats;

  return (
    <>
      {header}
      <FlatList
        data={orders}
        keyExtractor={o => o.ref}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(1); setRefreshing(false); }} />}
        onEndReachedThreshold={0.4}
        onEndReached={async () => {
          if (loadingMore || data.page >= data.pages) return;
          setLoadingMore(true); await load(data.page + 1); setLoadingMore(false);
        }}
        ListHeaderComponent={
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 14 }}>
              {([['All orders', s.all], ['New', s.new], ['In production', s.in_production], ['Awaiting payment', s.awaiting], ['Paid so far', naira(s.paid_total)]] as const)
                .map(([label, v]) => (
                  <View key={label} style={styles.stat}>
                    <Muted style={{ fontSize: 12 }}>{label}</Muted>
                    <T weight="extrabold" style={{ fontSize: 20, color: colors.primary }}>{v}</T>
                  </View>
                ))}
            </ScrollView>
            <TextInput value={q} onChangeText={setQ} placeholder="Search reference, name, email or phone" placeholderTextColor="#999"
              style={styles.search} autoCapitalize="none" autoCorrect={false} clearButtonMode="while-editing" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
              <Chip label="All statuses" active={!status} onPress={() => setStatus('')} />
              {data.order_statuses.map(o => <Chip key={o.code} label={o.label} active={status === o.code} onPress={() => setStatus(o.code)} />)}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Chip label="All payments" active={!pay} onPress={() => setPay('')} />
              {data.payment_statuses.map(o => <Chip key={o.code} label={o.label} active={pay === o.code} onPress={() => setPay(o.code)} />)}
            </ScrollView>
            <Muted style={{ marginVertical: 8 }}>{data.total} order{data.total === 1 ? '' : 's'}</Muted>
          </View>
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: 30 }}>
            <T style={{ fontSize: 40 }}>📭</T>
            <T weight="bold" style={{ color: colors.primary, marginTop: 6 }}>No orders found</T>
            <Muted>{s.all === 0 ? 'Orders appear here as soon as customers check out.' : 'Try a different filter or search.'}</Muted>
          </View>
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.accent} style={{ margin: 16 }} /> : null}
        renderItem={({ item: o }) => (
          <Pressable style={styles.card} onPress={() => router.push({ pathname: '/admin/order/[ref]', params: { ref: o.ref } })}>
            {o.design_front
              ? <Image source={{ uri: siteUrl(o.design_front) }} style={styles.thumb} resizeMode="contain" />
              : <View style={[styles.thumb, { alignItems: 'center', justifyContent: 'center' }]}><T>👕</T></View>}
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <T weight="extrabold" style={{ color: colors.primary }}>{o.ref}</T>
                <T weight="bold">{naira(o.total)}</T>
              </View>
              <T weight="semibold" numberOfLines={1}>{o.customer_name} <Muted style={{ fontSize: 12 }}>· {o.customer_phone}</Muted></T>
              <Muted style={{ fontSize: 12 }}>{o.type_label} · {o.size} × {o.qty} · {o.color_label}</Muted>
              <Muted style={{ fontSize: 11 }}>{formatDate(o.created_at, true)}</Muted>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                <Badge code={o.payment_status} label={o.payment_label} />
                <Badge code={o.order_status} label={o.order_label} />
              </View>
            </View>
          </Pressable>
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  stat: { backgroundColor: colors.white, borderRadius: radius.lg, paddingHorizontal: 16, paddingVertical: 12, minWidth: 120, ...shadow },
  search: { backgroundColor: colors.white, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10, fontFamily: font.regular, fontSize: 14, color: colors.text },
  card: { flexDirection: 'row', gap: 12, backgroundColor: colors.white, borderRadius: radius.lg, padding: 12, marginBottom: 10, ...shadow },
  thumb: { width: 56, height: 68, borderRadius: radius.sm, backgroundColor: colors.canvas, borderWidth: 1, borderColor: '#eee' },
});
