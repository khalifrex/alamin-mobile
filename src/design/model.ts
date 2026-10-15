import { Platform, type TextStyle } from 'react-native';
import { siteUrl } from '@/lib/api';
import type { SavedLayer } from '@/lib/types';

// Same logical canvas as assets/js/designer.js, so layer x/y/size mean the same thing on web and mobile
// and the printer gets identical coordinates.
export const W = 500;
export const H = 600;
export const CX = W / 2;

export type Side = 'front' | 'back';

export type TextLayer = { id: string; type: 'text'; text: string; font: string; style: TextStyleName; color: string; size: number; x: number; y: number };
export type ImageLayer = { id: string; type: 'image'; src: string; url: string; x: number; y: number; width: number; height: number };
export type EmojiLayer = { id: string; type: 'emoji'; char: string; size: number; x: number; y: number };
export type Layer = TextLayer | ImageLayer | EmojiLayer;
export type TextStyleName = 'normal' | 'bold' | 'italic' | 'italic bold';

export type Design = {
  type: string;
  color: string;
  layers: { front: Layer[]; back: Layer[] };
};

let seq = 0;
export const newId = () => `l${Date.now().toString(36)}${(seq++).toString(36)}`;

export const PRESETS: { char: string; name: string }[] = [
  { char: '🦁', name: 'Lion' }, { char: '⭐', name: 'Star' }, { char: '🔥', name: 'Fire' }, { char: '💎', name: 'Diamond' },
  { char: '🎯', name: 'Target' }, { char: '🌟', name: 'Glow Star' }, { char: '👑', name: 'Crown' }, { char: '⚡', name: 'Lightning' },
  { char: '🏆', name: 'Trophy' }, { char: '🌍', name: 'Globe' },
];

export const TEXT_COLORS = ['#000000', '#FFFFFF', '#FF0000', '#FFD700', '#2563EB', '#16A34A', '#E94560'];
export const TYPE_ICONS: Record<string, string> = { tshirt: '👕', polo: '👔', hoodie: '🧥', longsleeve: '🧤' };

// ---------------------------------------------------------------- shirt photos (served by the PHP site)
const PHOTOS: Record<string, Record<Side, string>> = {
  tshirt: { front: 'assets/images/shirts/tshirt.png', back: 'assets/images/shirts/tshirt_back.png' },
  polo: { front: 'assets/images/shirts/shirt_05.png', back: 'assets/images/shirts/polo_back.png' },
  hoodie: { front: 'assets/images/shirts/hoodie.png', back: 'assets/images/shirts/hoodie_back.png' },
  longsleeve: { front: 'assets/images/shirts/shirt_03.png', back: 'assets/images/shirts/longsleeve_back.png' },
};

export function basePhotoUrl(type: string, side: Side): string {
  return siteUrl((PHOTOS[type] ?? PHOTOS.tshirt)[side]);
}

/** Pre-rendered colour variant (assets/images/shirts/colored/<type>_<side>_<RRGGBB>.webp), or null for white. */
export function coloredPhotoUrl(type: string, side: Side, color: string): string | null {
  if (color.toUpperCase() === '#FFFFFF') return null;
  const t = PHOTOS[type] ? type : 'tshirt';
  return siteUrl(`assets/images/shirts/colored/${t}_${side}_${color.replace('#', '').toUpperCase()}.webp`);
}

// ---------------------------------------------------------------- fonts
// The server only accepts the names in FONTS (functions.php). On the phone each one is drawn with
// the closest font available everywhere: bundled Google fonts, or a platform font.
const SYS: Record<string, { ios: string; android: string }> = {
  Georgia: { ios: 'Georgia', android: 'serif' },
  'Courier New': { ios: 'Courier New', android: 'monospace' },
  Verdana: { ios: 'Verdana', android: 'sans-serif' },
};

export function fontStyleFor(fontName: string, style: TextStyleName): TextStyle {
  const bold = style.includes('bold');
  const italic = style.includes('italic');
  if (fontName === 'Poppins') {
    return { fontFamily: `Poppins_${bold ? '700Bold' : '400Regular'}${italic ? '_Italic' : ''}` };
  }
  if (fontName === 'Impact') return { fontFamily: 'Anton_400Regular', fontStyle: italic ? 'italic' : 'normal' };
  if (fontName === 'Arial Black') return { fontFamily: 'ArchivoBlack_400Regular', fontStyle: italic ? 'italic' : 'normal' };
  const sys = SYS[fontName];
  return {
    fontFamily: sys ? (Platform.OS === 'ios' ? sys.ios : sys.android) : undefined,
    fontWeight: bold ? 'bold' : 'normal',
    fontStyle: italic ? 'italic' : 'normal',
  };
}

export function styleName(bold: boolean, italic: boolean): TextStyleName {
  return italic && bold ? 'italic bold' : italic ? 'italic' : bold ? 'bold' : 'normal';
}

// ---------------------------------------------------------------- serialise for api/save_draft.php
export function serialise(arr: Layer[]): SavedLayer[] {
  return arr.map(l => {
    const o: SavedLayer = { type: l.type, x: Math.round(l.x), y: Math.round(l.y) };
    if (l.type === 'text') Object.assign(o, { text: l.text, font: l.font, size: Math.round(l.size), color: l.color, style: l.style });
    if (l.type === 'image') Object.assign(o, { src: l.src, width: Math.round(l.width), height: Math.round(l.height) });
    if (l.type === 'emoji') Object.assign(o, { char: l.char, size: Math.round(l.size) });
    return o;
  });
}

export function hasKind(d: Design, kinds: Layer['type'][]): boolean {
  return (['front', 'back'] as Side[]).some(s => d.layers[s].some(l => kinds.includes(l.type)));
}

export const isHex = (v: string) => /^#[0-9A-Fa-f]{6}$/.test(v);
