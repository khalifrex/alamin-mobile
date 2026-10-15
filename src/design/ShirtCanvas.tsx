import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Image, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/lib/theme';
import { basePhotoUrl, coloredPhotoUrl, fontStyleFor, H, W, type Design, type Layer, type Side } from './model';

type Props = {
  design: Design;
  side: Side;
  /** Display width in screen points; the 500×600 design is scaled to fit. */
  width: number;
  interactive?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onChangeLayer?: (id: string, patch: Partial<Layer>) => void;
  /** Called once the shirt photo and all artwork images have loaded (used before capturing a PNG). */
  onReady?: () => void;
  background?: string;
};

/** Renders one side of the shirt with its layers, in the same coordinates as the web designer. */
export const ShirtCanvas = forwardRef<View, Props>(function ShirtCanvas(
  { design, side, width, interactive, selectedId, onSelect, onChangeLayer, onReady, background = colors.canvas }, ref,
) {
  const scale = width / W;
  const layers = design.layers[side];
  const images = layers.filter(l => l.type === 'image').length;

  // ---- readiness (for capture): shirt photo + every image layer reported load/error
  const loaded = useRef(new Set<string>());
  const readyFired = useRef(false);
  const mark = (key: string) => {
    loaded.current.add(key);
    if (!readyFired.current && onReady && loaded.current.size >= 1 + images) { readyFired.current = true; onReady(); }
  };

  return (
    <View ref={ref} collapsable={false} style={{ width, height: H * scale, overflow: 'hidden', backgroundColor: background }}>
      <View style={{
        width: W, height: H,
        transform: [{ translateX: -(W - W * scale) / 2 }, { translateY: -(H - H * scale) / 2 }, { scale }],
      }}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => onSelect?.(null)} disabled={!interactive}>
          <ShirtBody type={design.type} side={side} color={design.color} onLoad={() => mark('shirt')} />
        </Pressable>

        {interactive ? <View pointerEvents="none" style={styles.guide} /> : null}

        {layers.map(l => (
          <LayerView
            key={l.id} layer={l} scale={scale} interactive={!!interactive} selected={selectedId === l.id}
            onSelect={() => onSelect?.(l.id)} onChange={p => onChangeLayer?.(l.id, p)} onLoad={() => mark(l.id)}
          />
        ))}

        {interactive && layers.length === 0 ? (
          <Text pointerEvents="none" style={styles.hint}>Add text, an image or a preset — it appears here instantly</Text>
        ) : null}
      </View>
    </View>
  );
});

// ---------------------------------------------------------------- shirt photo, recoloured
function ShirtBody({ type, side, color, onLoad }: { type: string; side: Side; color: string; onLoad: () => void }) {
  const colored = coloredPhotoUrl(type, side, color);
  const [failed, setFailed] = useState<string | null>(null);
  const base = basePhotoUrl(type, side);
  const useColored = colored && failed !== colored;

  if (useColored) {
    // catalogue colours have a pre-rendered photo on the server
    return <Image source={{ uri: colored }} style={StyleSheet.absoluteFill} resizeMode="contain" onLoad={onLoad} onError={() => setFailed(colored)} />;
  }
  return (
    <View style={StyleSheet.absoluteFill}>
      <Image source={{ uri: base }} style={StyleSheet.absoluteFill} resizeMode="contain" onLoad={onLoad} onError={onLoad} />
      {colored ? (
        // any other colour: tint the white photo, letting a little of its shading through
        <Image source={{ uri: base }} style={[StyleSheet.absoluteFill, { tintColor: color, opacity: 0.82 }]} resizeMode="contain" />
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------- one draggable layer
function LayerView({ layer, scale, interactive, selected, onSelect, onChange, onLoad }: {
  layer: Layer; scale: number; interactive: boolean; selected: boolean;
  onSelect: () => void; onChange: (p: Partial<Layer>) => void; onLoad: () => void;
}) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  // Gesture callbacks are created once; they read the newest props through this ref.
  const latest = useRef({ layer, scale, onSelect, onChange, box });
  useLayoutEffect(() => { latest.current = { layer, scale, onSelect, onChange, box }; });

  useEffect(() => { if (layer.type !== 'image') onLoad(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const start = useRef({ x: 0, y: 0 });
  const size0 = useRef({ w: 1, size: 0, iw: 0, ih: 0 });

  // eslint-disable-next-line react-hooks/refs -- refs are read only inside gesture callbacks, never during render
  const [move] = useState(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => {
      const l = latest.current.layer;
      start.current = { x: l.x, y: l.y };
      latest.current.onSelect();
    },
    onPanResponderMove: (_, g) => {
      const s = latest.current.scale;
      latest.current.onChange({ x: start.current.x + g.dx / s, y: start.current.y + g.dy / s });
    },
  }));

  // eslint-disable-next-line react-hooks/refs -- refs are read only inside gesture callbacks, never during render
  const [resize] = useState(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => {
      const l = latest.current.layer;
      size0.current = { w: latest.current.box.w || 1, size: l.type === 'image' ? 0 : l.size, iw: l.type === 'image' ? l.width : 0, ih: l.type === 'image' ? l.height : 0 };
    },
    onPanResponderMove: (_, g) => {
      const s0 = size0.current, l = latest.current.layer;
      const k = Math.max(0.15, (s0.w + g.dx / latest.current.scale) / s0.w);
      if (l.type === 'image') latest.current.onChange({ width: Math.max(20, s0.iw * k), height: Math.max(20, s0.ih * k) });
      else latest.current.onChange({ size: Math.max(10, Math.min(300, Math.round(s0.size * k))) });
    },
  }));


  let content;
  if (layer.type === 'text') {
    content = (
      <Text style={[fontStyleFor(layer.font, layer.style), { fontSize: layer.size, lineHeight: layer.size * 1.25, color: layer.color }]}>
        {layer.text}
      </Text>
    );
  } else if (layer.type === 'emoji') {
    const d = layer.size * 1.15;
    content = (
      <View style={{ width: d, height: d, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: layer.size * 0.9, lineHeight: d }}>{layer.char}</Text>
      </View>
    );
  } else {
    content = <Image source={{ uri: layer.url }} style={{ width: layer.width, height: layer.height }} onLoad={onLoad} onError={onLoad} />;
  }

  // The wide wrapper keeps text on one line (like canvas fillText) instead of wrapping at the canvas edge.
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: layer.x, top: layer.y, width: 4000, alignItems: 'flex-start' }}>
      <View
        collapsable={false}
        {...(interactive ? move.panHandlers : {})}
        pointerEvents={interactive ? 'auto' : 'none'}
        onLayout={e => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      >
        {content}
        {interactive && selected ? (
          <>
            <View pointerEvents="none" style={styles.selection} />
            <View {...resize.panHandlers} style={styles.handleHit} hitSlop={12}>
              <View style={styles.handle} />
            </View>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  guide: {
    position: 'absolute', left: W / 2 - 100, top: 120, width: 200, height: 300,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(120,120,140,0.45)',
  },
  hint: { position: 'absolute', top: 462, left: 0, right: 0, textAlign: 'center', color: 'rgba(120,120,120,0.75)', fontSize: 15 },
  selection: {
    position: 'absolute', left: -4, top: -4, right: -4, bottom: -4,
    borderWidth: 2, borderStyle: 'dashed', borderColor: colors.accent, borderRadius: 2,
  },
  handleHit: { position: 'absolute', right: -24, bottom: -24, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  handle: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.accent, borderWidth: 3, borderColor: colors.white },
});
