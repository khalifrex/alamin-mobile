import { useEffect, useRef } from 'react';
import { ActivityIndicator, Modal, PixelRatio, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { H2, Muted } from '@/components/ui';
import { colors, radius } from '@/lib/theme';
import { ShirtCanvas } from './ShirtCanvas';
import { H, W, type Design, type Side } from './model';

export type Previews = { front: string; back: string | null };

/**
 * Renders the finished front (and back, if it has artwork), waits for every image to load, then captures
 * each as a 500×600 PNG data URL — the same "proof" image the web designer sends to api/save_draft.php.
 */
export function CaptureModal({ design, onDone, onError }: {
  design: Design; onDone: (p: Previews) => void; onError: (msg: string) => void;
}) {
  const sides: Side[] = design.layers.back.length ? ['front', 'back'] : ['front'];
  const refs = { front: useRef<View>(null), back: useRef<View>(null) };
  const ready = useRef(new Set<Side>());
  const done = useRef(false);

  const capture = async () => {
    if (done.current) return;
    done.current = true;
    try {
      const opts = { format: 'png' as const, result: 'base64' as const, width: W / PixelRatio.get(), height: H / PixelRatio.get() };
      const shot = async (s: Side) => 'data:image/png;base64,' + (await captureRef(refs[s], opts)).replace(/\s/g, '');
      const front = await shot('front');
      const back = sides.includes('back') ? await shot('back') : null;
      onDone({ front, back });
    } catch {
      onError('Could not capture your design preview. Please try again.');
    }
  };

  const markReady = (s: Side) => {
    ready.current.add(s);
    // one frame later so the last image is actually drawn
    if (ready.current.size === sides.length) requestAnimationFrame(() => setTimeout(capture, 120));
  };

  useEffect(() => {
    const t = setTimeout(capture, 8000); // never hang if an image fails silently
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal transparent animationType="fade" visible>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <View style={{ backgroundColor: colors.white, borderRadius: radius.lg, padding: 20, alignItems: 'center' }}>
          <H2>Saving your design…</H2>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
            {sides.map(s => (
              <ShirtCanvas key={s} ref={refs[s]} design={design} side={s} width={140} onReady={() => markReady(s)} />
            ))}
          </View>
          <ActivityIndicator color={colors.accent} />
          <Muted style={{ marginTop: 8 }}>Preparing print-ready previews</Muted>
        </View>
      </View>
    </Modal>
  );
}
