import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Button, Chip, ErrorState, Loading, Muted, T } from '@/components/ui';
import { CaptureModal, type Previews } from '@/design/CaptureModal';
import { ShirtCanvas } from '@/design/ShirtCanvas';
import { Turntable } from '@/design/Turntable';
import {
  CX, fontStyleFor, H, hasKind, isHex, newId, PRESETS, serialise, styleName, TEXT_COLORS, TYPE_ICONS, W,
  type Design, type Layer, type Side, type TextLayer,
} from '@/design/model';
import { errorMessage, get, post, uploadArtwork } from '@/lib/api';
import { naira } from '@/lib/format';
import { colors, font, radius } from '@/lib/theme';
import type { Catalog, Quote } from '@/lib/types';

type View3 = Side | '3d';
type Tab = 'product' | 'text' | 'upload' | 'presets' | 'layers';
const TABS: { key: Tab; label: string }[] = [
  { key: 'product', label: '👕 Shirt' }, { key: 'text', label: '🔤 Text' }, { key: 'upload', label: '📤 Upload' },
  { key: 'presets', label: '⭐ Presets' }, { key: 'layers', label: '📋 Layers' },
];
const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

export default function DesignScreen() {
  const { width: winW, height: winH } = useWindowDimensions();
  const canvasW = Math.min(winW - 32, winH * 0.42 * (W / H));

  // ---- design state
  const [design, setDesign] = useState<Design>({ type: 'tshirt', color: '', layers: { front: [], back: [] } });
  const [size, setSize] = useState('M');

  // ---- catalogue (what the shop sells right now — edited in Admin > Catalog)
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadCatalog = useCallback(async () => {
    setLoadError(null);
    try {
      const c = await get<Catalog>('catalog');
      setCatalog(c);
      setDesign(d => ({ ...d, type: c.types.some(t => t.code === d.type) ? d.type : c.types[0]?.code ?? 'tshirt',
        color: d.color || c.default_color }));
      setSize(s => (c.sizes.some(x => x.code === s) ? s : c.default_size));
    } catch (e) { setLoadError(errorMessage(e)); }
  }, []);
  useEffect(() => { Promise.resolve().then(loadCatalog); }, [loadCatalog]);

  const [qty, setQty] = useState(1);
  const [view, setView] = useState<View3>('front');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('product');
  const side: Side = view === 'back' ? 'back' : 'front';
  const layers = design.layers[side];
  const selected = layers.find(l => l.id === selectedId) ?? null;

  const setLayers = (s: Side, fn: (arr: Layer[]) => Layer[]) =>
    setDesign(d => ({ ...d, layers: { ...d.layers, [s]: fn(d.layers[s]) } }));
  const patchLayer = (id: string, p: Partial<Layer>) =>
    setLayers(side, arr => arr.map(l => (l.id === id ? ({ ...l, ...p } as Layer) : l)));
  const addLayer = (l: Layer) => { setLayers(side, arr => [...arr, l]); setSelectedId(l.id); };
  const removeLayer = (id: string) => { setLayers(side, arr => arr.filter(l => l.id !== id)); setSelectedId(null); };

  // ---- live price from PHP (api/quote.php) — the app never computes prices itself
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState(false);
  const hasImage = hasKind(design, ['image', 'emoji']), hasText = hasKind(design, ['text']);
  const quoteSeq = useRef(0);
  useEffect(() => {
    if (!catalog) return;
    const seq = ++quoteSeq.current;
    const t = setTimeout(() => {
      post<Quote>('quote.php', { size, qty, hasImage, hasText })
        .then(r => { if (seq === quoteSeq.current) { setQuote(r); setQuoteError(false); } })
        .catch(() => { if (seq === quoteSeq.current) setQuoteError(true); });
    }, 150);
    return () => clearTimeout(t);
  }, [catalog, size, qty, hasImage, hasText]);

  // ---- text tool: controls edit the selected text layer live; "Add text" makes a new one
  const [txt, setTxt] = useState({ text: '', font: 'Poppins', size: 32, color: '#000000', bold: false, italic: false });
  const [txtHex, setTxtHex] = useState('');
  /** Select a layer; a text layer also loads its settings into the text controls (like the web's loadTextControls). */
  const select = (id: string | null) => {
    setSelectedId(id);
    const l = id ? layers.find(x => x.id === id) : null;
    if (l?.type === 'text') {
      setTxt({ text: l.text, font: l.font, size: l.size, color: l.color, bold: l.style.includes('bold'), italic: l.style.includes('italic') });
    }
  };

  const updateTxt = (p: Partial<typeof txt>) => {
    const next = { ...txt, ...p };
    setTxt(next);
    if (selected?.type === 'text') {
      patchLayer(selected.id, {
        text: next.text.trim() ? next.text : selected.text, font: next.font, size: next.size, color: next.color,
        style: styleName(next.bold, next.italic),
      } as Partial<TextLayer>);
    }
  };
  const addText = () => {
    const text = txt.text.trim();
    if (!text) { Alert.alert('Add text', 'Please enter some text first.'); return; }
    const longest = Math.max(...text.split('\n').map(l => l.length));
    const estW = longest * txt.size * 0.55;
    addLayer({ id: newId(), type: 'text', text, font: txt.font, size: txt.size, color: txt.color,
      style: styleName(txt.bold, txt.italic), x: Math.max(10, CX - estW / 2), y: 260 });
  };

  // ---- uploads (api/upload.php)
  const [uploading, setUploading] = useState(false);
  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], quality: 1,
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    const ext = (a.fileName ?? a.uri).split('.').pop()?.toLowerCase() ?? '';
    const type = a.mimeType ?? ({ png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' } as Record<string, string>)[ext] ?? 'image/jpeg';
    if (!ALLOWED_MIME.includes(type)) { Alert.alert('Unsupported image', 'Please choose a PNG, JPG, GIF or WEBP image.'); return; }
    if (catalog && a.fileSize && a.fileSize > catalog.max_upload_bytes) { Alert.alert('Image too large', 'Maximum is 10 MB.'); return; }
    setUploading(true);
    try {
      const r = await uploadArtwork({ uri: a.uri, name: a.fileName ?? `artwork.${ext || 'jpg'}`, type });
      const k = Math.min(1, 200 / Math.max(r.width, r.height));
      const w = Math.round(r.width * k), h = Math.round(r.height * k);
      addLayer({ id: newId(), type: 'image', src: r.src, url: a.uri, x: CX - w / 2, y: 270 - h / 2, width: w, height: h });
    } catch (e) {
      Alert.alert('Upload failed', errorMessage(e));
    } finally { setUploading(false); }
  };

  // ---- add to order → capture previews → api/save_draft.php
  const [capturing, setCapturing] = useState(false);
  const [saving, setSaving] = useState(false);
  const startOrder = () => {
    if (!design.layers.front.length && !design.layers.back.length) {
      Alert.alert('Nothing to print yet', 'Add some text, an image or a preset before ordering.'); return;
    }
    setSelectedId(null);
    setCapturing(true);
  };
  const saveDraft = async (p: Previews) => {
    setCapturing(false);
    setSaving(true);
    try {
      const r = await post<{ redirect: string }>('save_draft.php', {
        type: design.type, size, color: design.color, qty,
        layers: { front: serialise(design.layers.front), back: serialise(design.layers.back) },
        preview_front: p.front, preview_back: p.back,
      });
      if (r.redirect.startsWith('auth.php')) router.push({ pathname: '/auth', params: { next: 'checkout' } });
      else router.push('/checkout');
    } catch (e) {
      Alert.alert('Could not save your design', errorMessage(e));
    } finally { setSaving(false); }
  };

  // ---- custom shirt colour
  const [shirtHex, setShirtHex] = useState('');

  if (loadError) return <ErrorState message={loadError} onRetry={loadCatalog} />;
  if (!catalog) return <Loading label="Loading the Design Studio…" />;

  const colorName = catalog.colors.find(c => c.hex === design.color)?.name ?? design.color;
  const minDiscount = catalog.discounts.length ? Math.min(...catalog.discounts.map(d => d.min_qty)) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* ===== canvas ===== */}
      <View style={styles.canvasArea}>
        <View style={styles.viewToggle}>
          {(['front', 'back', '3d'] as View3[]).map(v => (
            <Pressable key={v} onPress={() => { setView(v); setSelectedId(null); }} style={[styles.viewBtn, view === v && styles.viewBtnActive]}>
              <T weight="semibold" style={{ fontSize: 13, color: view === v ? colors.white : colors.text }}>
                {v === 'front' ? 'Front' : v === 'back' ? 'Back' : '🌀 3D'}
              </T>
            </Pressable>
          ))}
        </View>
        <View style={{ borderRadius: radius.lg, overflow: 'hidden' }}>
          {view === '3d'
            ? <Turntable design={design} width={canvasW} />
            : <ShirtCanvas design={design} side={side} width={canvasW} interactive selectedId={selectedId}
                onSelect={select} onChangeLayer={patchLayer} />}
        </View>
        {view !== '3d' ? (
          <View style={styles.canvasTools}>
            <Button small variant="ghost" title="🗑️ Delete" disabled={!selected} onPress={() => selected && removeLayer(selected.id)} />
            <Button small variant="ghost" title="🧹 Clear side" disabled={!layers.length}
              onPress={() => Alert.alert('Clear everything?', `Remove all layers on the ${side}?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', style: 'destructive', onPress: () => { setLayers(side, () => []); setSelectedId(null); } },
              ])} />
          </View>
        ) : null}
      </View>

      {/* ===== tools ===== */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={{ paddingHorizontal: 12 }}>
        {TABS.map(t => <Chip key={t.key} label={t.label} active={tab === t.key} onPress={() => setTab(t.key)} style={{ marginBottom: 0 }} />)}
      </ScrollView>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        {tab === 'product' && (
          <>
            <Section title="Shirt type">
              <View style={styles.wrap}>
                {catalog.types.map(t => (
                  <Chip key={t.code} label={`${TYPE_ICONS[t.code] ?? '👕'} ${t.name}`} active={design.type === t.code}
                    onPress={() => setDesign(d => ({ ...d, type: t.code }))} />
                ))}
              </View>
            </Section>
            <Section title="Size">
              <View style={styles.wrap}>
                {catalog.sizes.map(s => <Chip key={s.code} label={s.code} active={size === s.code} onPress={() => setSize(s.code)} />)}
              </View>
            </Section>
            <Section title={`Shirt colour · ${colorName}`}>
              <View style={styles.wrap}>
                {catalog.colors.map(c => (
                  <Swatch key={c.hex} color={c.hex} active={design.color === c.hex} onPress={() => setDesign(d => ({ ...d, color: c.hex }))} />
                ))}
              </View>
              <HexInput value={shirtHex} onChange={setShirtHex} placeholder="Any colour, e.g. #FF6600"
                onApply={hex => setDesign(d => ({ ...d, color: hex }))} />
            </Section>
            <Section title="Quantity">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Stepper onPress={() => setQty(q => Math.max(1, q - 1))} label="−" />
                <TextInput
                  value={String(qty)} keyboardType="number-pad" style={styles.qtyInput}
                  onChangeText={v => { const n = parseInt(v.replace(/\D/g, ''), 10); setQty(Math.max(1, Math.min(catalog.max_qty, n || 1))); }}
                />
                <Stepper onPress={() => setQty(q => Math.min(catalog.max_qty, q + 1))} label="+" />
              </View>
              {minDiscount ? <Muted style={{ marginTop: 8 }}>🎁 {minDiscount}+ pieces get a discount!</Muted> : null}
            </Section>
          </>
        )}

        {tab === 'text' && (
          <>
            {selected?.type === 'text' ? <Muted style={{ marginBottom: 10 }}>Editing the selected text — changes show live.</Muted> : null}
            <TextInput
              value={txt.text} onChangeText={v => updateTxt({ text: v })} multiline maxLength={120}
              placeholder="Type anything you want on your shirt…" placeholderTextColor="#aaa" style={styles.textArea}
            />
            <Section title="Font">
              <View style={styles.wrap}>
                {catalog.fonts.map(f => (
                  <Pressable key={f} onPress={() => updateTxt({ font: f })} style={[styles.fontBtn, txt.font === f && styles.fontBtnActive]}>
                    <T style={[fontStyleFor(f, 'normal'), { fontSize: 15, color: txt.font === f ? colors.accent : colors.text }]}>{f}</T>
                  </Pressable>
                ))}
              </View>
            </Section>
            <Section title={`Size · ${txt.size}px`}>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <Stepper label="A−" onPress={() => updateTxt({ size: Math.max(16, txt.size - 4) })} />
                <Stepper label="A+" onPress={() => updateTxt({ size: Math.min(120, txt.size + 4) })} />
                <Chip label="Bold" active={txt.bold} onPress={() => updateTxt({ bold: !txt.bold })} style={{ marginBottom: 0, marginLeft: 8 }} />
                <Chip label="Italic" active={txt.italic} onPress={() => updateTxt({ italic: !txt.italic })} style={{ marginBottom: 0 }} />
              </View>
            </Section>
            <Section title="Text colour">
              <View style={styles.wrap}>
                {TEXT_COLORS.map(c => <Swatch key={c} color={c} small active={txt.color === c} onPress={() => updateTxt({ color: c })} />)}
              </View>
              <HexInput value={txtHex} onChange={setTxtHex} placeholder="Custom, e.g. #8B5CF6" onApply={hex => updateTxt({ color: hex })} />
            </Section>
            <Button title="+ Add text to shirt" onPress={addText} variant="dark" />
          </>
        )}

        {tab === 'upload' && (
          <>
            <Pressable onPress={pickImage} disabled={uploading} style={styles.uploadZone}>
              <T style={{ fontSize: 40 }}>{uploading ? '⏳' : '📁'}</T>
              <T weight="bold" style={{ fontSize: 16, color: colors.primary, marginTop: 6 }}>{uploading ? 'Uploading…' : 'Upload your design'}</T>
              <Muted>PNG · JPG · GIF · WEBP — max 10 MB</Muted>
            </Pressable>
            <View style={styles.tips}>
              <T weight="bold" style={{ color: colors.primary, marginBottom: 4 }}>💡 Design tips</T>
              <Muted>• Use a transparent PNG for best results{'\n'}• Minimum 2000×2000px recommended{'\n'}• Drag to move, drag the pink dot to resize</Muted>
            </View>
          </>
        )}

        {tab === 'presets' && (
          <View style={styles.wrap}>
            {PRESETS.map(p => (
              <Pressable key={p.char} style={styles.preset}
                onPress={() => addLayer({ id: newId(), type: 'emoji', char: p.char, size: 90, x: CX - 50, y: 230 })}>
                <T style={{ fontSize: 34 }}>{p.char}</T>
                <Muted style={{ fontSize: 11 }}>{p.name}</Muted>
              </Pressable>
            ))}
          </View>
        )}

        {tab === 'layers' && (
          layers.length === 0
            ? <Muted style={{ textAlign: 'center', paddingVertical: 20 }}>📋 No design layers on the {side} yet.{'\n'}Add text or upload an image.</Muted>
            : [...layers].map((l, i) => ({ l, i })).reverse().map(({ l, i }) => (
              <Pressable key={l.id} onPress={() => select(l.id)} style={[styles.layerRow, selectedId === l.id && { borderColor: colors.accent }]}>
                <T style={{ fontSize: 22, width: 32 }}>{l.type === 'text' ? '🔤' : l.type === 'emoji' ? l.char : '🖼️'}</T>
                <View style={{ flex: 1 }}>
                  <T weight="semibold" numberOfLines={1}>{l.type === 'text' ? l.text.split('\n')[0] : l.type === 'emoji' ? 'Preset' : 'Image'}</T>
                  <Muted style={{ fontSize: 12 }}>{l.type === 'text' ? `${l.font} · ${l.size}px` : l.type === 'emoji' ? 'Preset' : 'Uploaded image'}</Muted>
                </View>
                <LayerAct label="⬆" disabled={i === layers.length - 1} onPress={() => setLayers(side, a => { const b = [...a]; b.splice(i + 1, 0, b.splice(i, 1)[0]); return b; })} />
                <LayerAct label="⬇" disabled={i === 0} onPress={() => setLayers(side, a => { const b = [...a]; b.splice(i - 1, 0, b.splice(i, 1)[0]); return b; })} />
                <LayerAct label="🗑️" onPress={() => removeLayer(l.id)} />
              </Pressable>
            ))
        )}
      </ScrollView>

      {/* ===== price + order ===== */}
      <View style={styles.footer}>
        <View style={{ flex: 1 }}>
          <T weight="extrabold" style={{ fontSize: 20, color: colors.accent }}>{quoteError ? '—' : quote ? naira(quote.total) : '…'}</T>
          <Muted style={{ fontSize: 12 }}>
            {quote ? `${qty} ${qty > 1 ? 'items' : 'item'} · ${naira(quote.unit)} each` : `for ${qty} item${qty > 1 ? 's' : ''}`}
            {quote && quote.discount > 0 ? `  ·  ${Math.round(quote.discount * 100)}% off!` : ''}
          </Muted>
        </View>
        <Button title="🛒 Order" onPress={startOrder} loading={saving} style={{ paddingHorizontal: 26 }} />
      </View>

      {capturing ? (
        <CaptureModal design={design} onDone={saveDraft}
          onError={m => { setCapturing(false); Alert.alert('Something went wrong', m); }} />
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------- small pieces
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 18 }}>
      <T weight="bold" style={{ fontSize: 12, color: colors.gray, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{title}</T>
      {children}
    </View>
  );
}

function Swatch({ color, active, onPress, small }: { color: string; active: boolean; onPress: () => void; small?: boolean }) {
  const d = small ? 32 : 38;
  return (
    <Pressable onPress={onPress} accessibilityLabel={color}
      style={{ width: d + 8, height: d + 8, borderRadius: (d + 8) / 2, borderWidth: 2, borderColor: active ? colors.accent : 'transparent',
        alignItems: 'center', justifyContent: 'center', marginRight: 6, marginBottom: 6 }}>
      <View style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: color, borderWidth: 1, borderColor: '#ddd' }} />
    </Pressable>
  );
}

function HexInput({ value, onChange, onApply, placeholder }: { value: string; onChange: (v: string) => void; onApply: (hex: string) => void; placeholder: string }) {
  const norm = (value.startsWith('#') ? value : '#' + value).toUpperCase();
  const ok = isHex(norm);
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, alignItems: 'center' }}>
      <View style={{ width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: '#ddd', backgroundColor: ok ? norm : 'transparent' }} />
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#aaa" autoCapitalize="characters"
        autoCorrect={false} maxLength={7} style={[styles.hexInput]} onSubmitEditing={() => ok && onApply(norm)} />
      <Button small title="Use" variant="dark" disabled={!ok} onPress={() => onApply(norm)} />
    </View>
  );
}

function Stepper({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.stepper} accessibilityRole="button">
      <T weight="bold" style={{ fontSize: 18, color: colors.primary }}>{label}</T>
    </Pressable>
  );
}

function LayerAct({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={6} style={{ padding: 8, opacity: disabled ? 0.3 : 1 }}>
      <T style={{ fontSize: 16 }}>{label}</T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  canvasArea: { alignItems: 'center', paddingTop: 10, paddingHorizontal: 16 },
  viewToggle: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: radius.pill, padding: 3, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  viewBtn: { paddingHorizontal: 18, paddingVertical: 6, borderRadius: radius.pill },
  viewBtnActive: { backgroundColor: colors.primary },
  canvasTools: { flexDirection: 'row', gap: 10, marginTop: 10 },
  tabBar: { flexGrow: 0, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  qtyInput: { width: 70, textAlign: 'center', fontSize: 18, fontFamily: font.bold, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingVertical: 8, backgroundColor: colors.white, color: colors.text },
  stepper: { width: 46, height: 42, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  textArea: { minHeight: 70, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 12, fontSize: 15, fontFamily: font.regular, backgroundColor: colors.white, textAlignVertical: 'top', marginBottom: 16, color: colors.text },
  fontBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, marginRight: 8, marginBottom: 8 },
  fontBtnActive: { borderColor: colors.accent, backgroundColor: '#fff0f3' },
  hexInput: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 8, fontFamily: font.regular, backgroundColor: colors.white, color: colors.text },
  uploadZone: { borderWidth: 2, borderStyle: 'dashed', borderColor: colors.accent, borderRadius: radius.lg, padding: 26, alignItems: 'center', backgroundColor: '#fff7f8' },
  tips: { marginTop: 16, padding: 14, backgroundColor: colors.white, borderRadius: radius.sm },
  preset: { width: '18%', minWidth: 62, aspectRatio: 0.9, margin: '1%', backgroundColor: colors.white, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  layerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: radius.sm, padding: 10, marginBottom: 8, borderWidth: 2, borderColor: 'transparent' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.white, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
