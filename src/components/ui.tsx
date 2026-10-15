import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View,
  type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, radius, shadow } from '@/lib/theme';

export function T({ style, weight = 'regular', children, ...rest }: {
  style?: StyleProp<TextStyle>; weight?: keyof typeof font; children: ReactNode; numberOfLines?: number; selectable?: boolean;
}) {
  return <Text {...rest} style={[{ fontFamily: font[weight], color: colors.text, fontSize: 14 }, style]}>{children}</Text>;
}

export function H1({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <T weight="extrabold" style={[{ fontSize: 24, color: colors.primary }, style]}>{children}</T>;
}
export function H2({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <T weight="bold" style={[{ fontSize: 17, color: colors.primary, marginBottom: 10 }, style]}>{children}</T>;
}
export function Muted({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <T style={[{ color: colors.gray, fontSize: 13 }, style]}>{children}</T>;
}

type ButtonProps = {
  title: string; onPress?: () => void; variant?: 'primary' | 'dark' | 'ghost' | 'danger';
  loading?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle>; small?: boolean;
};
export function Button({ title, onPress, variant = 'primary', loading, disabled, style, small }: ButtonProps) {
  const bg = { primary: colors.accent, dark: colors.primary, ghost: colors.white, danger: '#fee2e2' }[variant];
  const fg = { primary: colors.white, dark: colors.white, ghost: colors.primary, danger: '#b91c1c' }[variant];
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress} disabled={off} accessibilityRole="button"
      style={({ pressed }) => [
        styles.btn, small && styles.btnSmall, { backgroundColor: bg, opacity: off ? 0.6 : pressed ? 0.85 : 1 },
        variant === 'ghost' && { borderWidth: 1, borderColor: colors.border }, style,
      ]}>
      {loading ? <ActivityIndicator color={fg} /> : <T weight="bold" style={{ color: fg, fontSize: small ? 13 : 15 }}>{title}</T>}
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Screen({ children, edges = ['top'] }: { children: ReactNode; edges?: ('top' | 'bottom')[] }) {
  return <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: colors.bg }}>{children}</SafeAreaView>;
}

export function Field({ label, hint, ...input }: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <T weight="semibold" style={styles.label}>{label}</T>
      <TextInput placeholderTextColor="#aaa" {...input} style={[styles.input, input.multiline && { minHeight: 80, textAlignVertical: 'top' }, input.style]} />
      {hint ? <Muted style={{ fontSize: 12, marginTop: 4 }}>{hint}</Muted> : null}
    </View>
  );
}

export function Notice({ message, kind = 'error', style }: { message: string | null; kind?: 'error' | 'info' | 'success' | 'warning'; style?: StyleProp<ViewStyle> }) {
  if (!message) return null;
  const c = {
    error: ['#fee2e2', '#ef4444', '#b91c1c'], info: ['#e0e7ff', '#818cf8', '#3730a3'],
    success: ['#dcfce7', '#22c55e', '#15803d'], warning: ['#fef3c7', '#f59e0b', '#92400e'],
  }[kind];
  return (
    <View style={[{ backgroundColor: c[0], borderColor: c[1], borderWidth: 1, borderRadius: radius.sm, padding: 12, marginBottom: 14 }, style]}>
      <T style={{ color: c[2], fontSize: 13 }}>{kind === 'error' ? '⚠️ ' : ''}{message}</T>
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <ActivityIndicator size="large" color={colors.accent} />
      {label ? <Muted style={{ marginTop: 10 }}>{label}</Muted> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
      <T style={{ fontSize: 40, marginBottom: 10 }}>📡</T>
      <T style={{ textAlign: 'center', marginBottom: 16, color: colors.text }}>{message}</T>
      {onRetry ? <Button title="Try again" onPress={onRetry} variant="dark" /> : null}
    </View>
  );
}

export function Empty({ icon, title, text, action }: { icon: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <Card style={{ alignItems: 'center', paddingVertical: 40 }}>
      <T style={{ fontSize: 48, marginBottom: 10 }}>{icon}</T>
      <H2 style={{ textAlign: 'center' }}>{title}</H2>
      {text ? <Muted style={{ textAlign: 'center', marginBottom: 18 }}>{text}</Muted> : null}
      {action}
    </Card>
  );
}

export function Chip({ label, active, onPress, style }: { label: string; active?: boolean; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive, style]} accessibilityState={{ selected: !!active }}>
      <T weight="semibold" style={{ fontSize: 13, color: active ? colors.white : colors.text }}>{label}</T>
    </Pressable>
  );
}

const BADGE: Record<string, [string, string]> = {
  paid: ['#dcfce7', '#15803d'], awaiting_payment: ['#fef3c7', '#b45309'], pay_on_delivery: ['#e0f2fe', '#0369a1'],
  new: ['#e0e7ff', '#3730a3'], processing: ['#fef3c7', '#92400e'], printing: ['#fae8ff', '#86198f'],
  ready: ['#ccfbf1', '#0f766e'], delivered: ['#dcfce7', '#15803d'], cancelled: ['#fee2e2', '#b91c1c'],
};
export function Badge({ code, label }: { code: string; label: string }) {
  const [bg, fg] = BADGE[code] ?? ['#eee', '#333'];
  return (
    <View style={{ backgroundColor: bg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' }}>
      <T weight="bold" style={{ color: fg, fontSize: 12 }}>{label}</T>
    </View>
  );
}

export function Row({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Muted style={{ flexShrink: 0, marginRight: 12 }}>{label}</Muted>
      {typeof value === 'string' || typeof value === 'number'
        ? <T weight={strong ? 'bold' : 'medium'} style={{ flex: 1, textAlign: 'right' }} selectable>{value}</T>
        : <View style={{ flex: 1, alignItems: 'flex-end' }}>{value}</View>}
    </View>
  );
}

export function Dot({ color, size = 14 }: { color: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, borderWidth: 1, borderColor: '#ccc' }} />;
}

/** A tappable field that opens a list to pick from (the app's <select>). */
export function Select<V extends string>({ label, value, options, onChange, disabled, compact }: {
  label?: string; value: V; options: { value: V; label: string }[]; onChange: (v: V) => void; disabled?: boolean; compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find(o => o.value === value)?.label ?? value;
  return (
    <View style={{ marginBottom: compact ? 0 : 14, flex: compact ? 1 : undefined }}>
      {label ? <T weight="semibold" style={styles.label}>{label}</T> : null}
      <Pressable disabled={disabled} onPress={() => setOpen(true)} style={[styles.input, { flexDirection: 'row', alignItems: 'center', opacity: disabled ? 0.6 : 1 }]}>
        <T style={{ flex: 1 }} numberOfLines={1}>{current || 'Select…'}</T>
        <T style={{ color: colors.gray }}>▾</T>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            {label ? <H2>{label}</H2> : null}
            <FlatList
              data={options} keyExtractor={o => o.value}
              renderItem={({ item }) => (
                <Pressable onPress={() => { setOpen(false); if (item.value !== value) onChange(item.value); }} style={styles.option}>
                  <T weight={item.value === value ? 'bold' : 'regular'} style={{ color: item.value === value ? colors.accent : colors.text }}>
                    {item.value === value ? '✓ ' : ''}{item.label}
                  </T>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { borderRadius: radius.sm, paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  btnSmall: { paddingVertical: 8, paddingHorizontal: 12 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 18, marginBottom: 14, ...shadow },
  label: { fontSize: 12, color: colors.gray, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 11,
    fontSize: 15, fontFamily: font.regular, color: colors.text, backgroundColor: colors.white,
  },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, marginRight: 8, marginBottom: 8 },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 20, maxHeight: '70%' },
  option: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
});
