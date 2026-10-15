import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { Button, Card, ErrorState, H2, Loading, Muted, Notice, T } from '@/components/ui';
import { isHex } from '@/design/model';
import { errorMessage, get, post } from '@/lib/api';
import { trimPct } from '@/lib/format';
import { colors, font, radius } from '@/lib/theme';

type Flag = number | boolean | string;
type CatalogReply = {
  types: { code: string; name: string; is_active: Flag }[];
  sizes: { code: string; base_price: string | number; is_active: Flag }[];
  colors: { hex: string; name: string; is_active: Flag }[];
  discounts: { min_qty: string | number; percent: string | number }[];
  fees: { image: number; text: number };
};
const on = (v: Flag) => v === true || Number(v) === 1;

/** Mirrors admin/catalog.php — every save goes through api/admin_catalog.php, which keeps all the rules. */
export default function AdminCatalog() {
  const [data, setData] = useState<CatalogReply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // editable copies
  const [types, setTypes] = useState<CatalogReply['types']>([]);
  const [sizes, setSizes] = useState<{ code: string; price: string; active: boolean }[]>([]);
  const [cols, setCols] = useState<{ hex: string; name: string; active: boolean }[]>([]);
  const [fees, setFees] = useState({ image: '', text: '' });
  const [tiers, setTiers] = useState<{ min_qty: string; percent: string }[]>([]);
  const [newSize, setNewSize] = useState({ code: '', price: '' });
  const [newColor, setNewColor] = useState({ name: '', hex: '#2F6B4F' });

  const load = useCallback(async () => {
    try {
      const r = await get<CatalogReply>('admin_catalog');
      setData(r); setError(null);
      setTypes(r.types.map(t => ({ ...t, is_active: on(t.is_active) })));
      setSizes(r.sizes.map(s => ({ code: s.code, price: String(Number(s.base_price)), active: on(s.is_active) })));
      setCols(r.colors.map(c => ({ hex: c.hex, name: c.name, active: on(c.is_active) })));
      setFees({ image: String(r.fees.image), text: String(r.fees.text) });
      setTiers(r.discounts.map(d => ({ min_qty: String(d.min_qty), percent: trimPct(Number(d.percent)) })));
    } catch (e) { setError(errorMessage(e)); }
  }, []);
  useEffect(() => { Promise.resolve().then(load); }, [load]);

  const call = async (key: string, payload: object, reload = false) => {
    setBusy(key); setNotice(null);
    try {
      const r = await post<{ message: string }>('admin_catalog.php', payload);
      setNotice({ kind: 'success', msg: r.message });
      if (reload) await load();
    } catch (e) {
      setNotice({ kind: 'error', msg: errorMessage(e) });
    } finally { setBusy(null); }
  };
  const confirmDelete = (what: string, run: () => void) =>
    Alert.alert(`Delete ${what}?`, 'Customers will no longer see it. Old orders are not affected.', [
      { text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: run },
    ]);

  if (error && !data) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <Loading />;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Muted style={{ marginBottom: 12 }}>Everything here is what customers see in the Design Studio. Changes are live immediately.</Muted>
      {notice ? <Notice kind={notice.kind} message={notice.msg} /> : null}

      <Card>
        <H2>Shirt types</H2>
        {types.map((t, i) => (
          <View key={t.code} style={styles.item}>
            <Muted style={{ fontSize: 12 }}>{t.code}</Muted>
            <View style={styles.line}>
              <TextInput style={[styles.input, { flex: 1 }]} value={t.name} maxLength={50}
                onChangeText={v => setTypes(a => a.map((x, j) => (j === i ? { ...x, name: v } : x)))} />
              <Switch value={on(t.is_active)} onValueChange={v => setTypes(a => a.map((x, j) => (j === i ? { ...x, is_active: v } : x)))} trackColor={{ true: colors.accent }} />
              <Button small title="Save" loading={busy === `type-${t.code}`}
                onPress={() => call(`type-${t.code}`, { action: 'save_type', code: t.code, name: t.name, is_active: on(t.is_active) })} />
            </View>
          </View>
        ))}
      </Card>

      <Card>
        <H2>Sizes & base prices</H2>
        <Muted style={{ fontSize: 12, marginBottom: 6 }}>Price of one plain shirt in that size (₦). Print fees are added on top.</Muted>
        {sizes.map((s, i) => (
          <View key={s.code} style={[styles.item, styles.line]}>
            <T weight="bold" style={{ width: 44 }}>{s.code}</T>
            <TextInput style={[styles.input, { flex: 1 }]} value={s.price} keyboardType="decimal-pad"
              onChangeText={v => setSizes(a => a.map((x, j) => (j === i ? { ...x, price: v } : x)))} />
            <Switch value={s.active} onValueChange={v => setSizes(a => a.map((x, j) => (j === i ? { ...x, active: v } : x)))} trackColor={{ true: colors.accent }} />
            <Button small title="Save" loading={busy === `size-${s.code}`}
              onPress={() => call(`size-${s.code}`, { action: 'save_size', code: s.code, base_price: s.price, is_active: s.active })} />
            <Pressable hitSlop={8} onPress={() => confirmDelete(`size ${s.code}`, () => call(`size-${s.code}`, { action: 'delete_size', code: s.code }, true))}>
              <T style={{ fontSize: 16 }}>🗑️</T>
            </Pressable>
          </View>
        ))}
        <View style={[styles.line, styles.addRow]}>
          <TextInput style={[styles.input, { width: 80 }]} placeholder="e.g. 4XL" placeholderTextColor="#aaa" maxLength={10} autoCapitalize="characters"
            value={newSize.code} onChangeText={v => setNewSize(s => ({ ...s, code: v }))} />
          <TextInput style={[styles.input, { flex: 1 }]} placeholder="Base price ₦" placeholderTextColor="#aaa" keyboardType="decimal-pad"
            value={newSize.price} onChangeText={v => setNewSize(s => ({ ...s, price: v }))} />
          <Button small variant="dark" title="Add" loading={busy === 'new-size'}
            onPress={async () => { await call('new-size', { action: 'save_size', code: newSize.code, base_price: newSize.price, is_active: true }, true); setNewSize({ code: '', price: '' }); }} />
        </View>
      </Card>

      <Card>
        <H2>Shirt colours</H2>
        {cols.map((c, i) => (
          <View key={c.hex} style={[styles.item, styles.line]}>
            <View style={[styles.swatch, { backgroundColor: c.hex }]} />
            <View style={{ flex: 1 }}>
              <TextInput style={styles.input} value={c.name} maxLength={50}
                onChangeText={v => setCols(a => a.map((x, j) => (j === i ? { ...x, name: v } : x)))} />
              <Muted style={{ fontSize: 11 }}>{c.hex}</Muted>
            </View>
            <Switch value={c.active} onValueChange={v => setCols(a => a.map((x, j) => (j === i ? { ...x, active: v } : x)))} trackColor={{ true: colors.accent }} />
            <Button small title="Save" loading={busy === `color-${c.hex}`}
              onPress={() => call(`color-${c.hex}`, { action: 'save_color', hex: c.hex, name: c.name, is_active: c.active })} />
            <Pressable hitSlop={8} onPress={() => confirmDelete('this colour', () => call(`color-${c.hex}`, { action: 'delete_color', hex: c.hex }, true))}>
              <T style={{ fontSize: 16 }}>🗑️</T>
            </Pressable>
          </View>
        ))}
        <View style={[styles.line, styles.addRow]}>
          <View style={[styles.swatch, { backgroundColor: isHex(newColor.hex) ? newColor.hex : 'transparent' }]} />
          <TextInput style={[styles.input, { width: 92 }]} value={newColor.hex} maxLength={7} autoCapitalize="characters" autoCorrect={false}
            onChangeText={v => setNewColor(s => ({ ...s, hex: v.startsWith('#') ? v : '#' + v }))} />
          <TextInput style={[styles.input, { flex: 1 }]} placeholder="e.g. Forest Green" placeholderTextColor="#aaa" maxLength={50}
            value={newColor.name} onChangeText={v => setNewColor(s => ({ ...s, name: v }))} />
          <Button small variant="dark" title="Add" loading={busy === 'new-color'}
            onPress={async () => { await call('new-color', { action: 'save_color', hex: newColor.hex, name: newColor.name, is_active: true }, true); setNewColor({ name: '', hex: '#2F6B4F' }); }} />
        </View>
      </Card>

      <Card>
        <H2>Print fees</H2>
        <Muted style={{ fontSize: 12, marginBottom: 8 }}>Added per shirt when the design uses an image or preset, or text.</Muted>
        <View style={styles.line}>
          <Muted style={{ width: 130 }}>Image / preset (₦)</Muted>
          <TextInput style={[styles.input, { flex: 1 }]} value={fees.image} keyboardType="decimal-pad" onChangeText={v => setFees(f => ({ ...f, image: v }))} />
        </View>
        <View style={[styles.line, { marginTop: 8, marginBottom: 12 }]}>
          <Muted style={{ width: 130 }}>Text (₦)</Muted>
          <TextInput style={[styles.input, { flex: 1 }]} value={fees.text} keyboardType="decimal-pad" onChangeText={v => setFees(f => ({ ...f, text: v }))} />
        </View>
        <Button title="Save fees" small loading={busy === 'fees'} onPress={() => call('fees', { action: 'save_fees', image_fee: fees.image, text_fee: fees.text })} />
      </Card>

      <Card>
        <H2>Bulk discounts</H2>
        <Muted style={{ fontSize: 12, marginBottom: 8 }}>The best matching tier applies to the whole order. Leave empty to offer no discount.</Muted>
        {tiers.map((t, i) => (
          <View key={i} style={[styles.line, { marginBottom: 8 }]}>
            <TextInput style={[styles.input, { width: 64 }]} value={t.min_qty} keyboardType="number-pad"
              onChangeText={v => setTiers(a => a.map((x, j) => (j === i ? { ...x, min_qty: v } : x)))} />
            <Muted>+ pcs →</Muted>
            <TextInput style={[styles.input, { width: 64 }]} value={t.percent} keyboardType="decimal-pad"
              onChangeText={v => setTiers(a => a.map((x, j) => (j === i ? { ...x, percent: v } : x)))} />
            <Muted style={{ flex: 1 }}>% off</Muted>
            <Pressable hitSlop={8} onPress={() => setTiers(a => a.filter((_, j) => j !== i))}><T style={{ fontSize: 16 }}>✕</T></Pressable>
          </View>
        ))}
        <View style={[styles.line, { marginTop: 4 }]}>
          <Button small variant="ghost" title="+ Add tier" onPress={() => setTiers(a => [...a, { min_qty: '', percent: '' }])} />
          <Button small title="Save discounts" loading={busy === 'tiers'} onPress={() => call('tiers', { action: 'save_discounts', rows: tiers }, true)} />
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  item: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addRow: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 7, fontFamily: font.regular, fontSize: 14, color: colors.text, backgroundColor: colors.white },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: '#ccc' },
});
