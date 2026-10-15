import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, StyleSheet, View } from 'react-native';
import { T } from '@/components/ui';
import { colors } from '@/lib/theme';
import { ShirtCanvas } from './ShirtCanvas';
import { H, W, type Design } from './model';

/**
 * 3D preview: the front and back renders are the two faces of a card that turns in perspective.
 * Drag sideways to rotate; it spins once when opened. (Mirrors the web's Three.js view, without WebGL.)
 */
export function Turntable({ design, width }: { design: Design; width: number }) {
  const height = (H / W) * width;
  const [angle] = useState(() => new Animated.Value(0));
  const current = useRef(0);
  const startAngle = useRef(0);

  useEffect(() => {
    const id = angle.addListener(({ value }) => { current.current = value; });
    Animated.timing(angle, { toValue: 360, duration: 2600, easing: Easing.inOut(Easing.cubic), useNativeDriver: true })
      .start(() => angle.setValue(0));
    return () => angle.removeListener(id);
  }, [angle]);

  // eslint-disable-next-line react-hooks/refs -- refs are read only inside gesture callbacks, never during render
  const [pan] = useState(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => { angle.stopAnimation(); startAngle.current = current.current; },
    onPanResponderMove: (_, g) => angle.setValue(startAngle.current + g.dx * 0.7),
    onPanResponderRelease: (_, g) => {
      // a little momentum, then settle
      Animated.decay(angle, { velocity: g.vx * 0.7, deceleration: 0.995, useNativeDriver: true }).start();
    },
  }));

  const deg = (offset: number) => angle.interpolate({
    inputRange: [-36000, 36000], outputRange: [`${-36000 + offset}deg`, `${36000 + offset}deg`],
  });

  return (
    <View style={{ width, height: height + 34, backgroundColor: '#f0f2f5' }} {...pan.panHandlers}>
      <View style={{ width, height }}>
        {[{ side: 'front' as const, off: 0 }, { side: 'back' as const, off: 180 }].map(f => (
          <Animated.View
            key={f.side}
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backfaceVisibility: 'hidden', transform: [{ perspective: 1100 }, { rotateY: deg(f.off) }] }]}
          >
            <ShirtCanvas design={design} side={f.side} width={width} background="transparent" />
          </Animated.View>
        ))}
      </View>
      <T style={{ textAlign: 'center', color: colors.gray, fontSize: 12, marginTop: 8 }}>💡 Drag sideways to turn the shirt</T>
    </View>
  );
}
