import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, H2, Muted, Screen, T } from '@/components/ui';
import { useSession } from '@/lib/session';
import { colors, radius } from '@/lib/theme';

const STATS = [['5,000+', 'Happy customers'], ['50+', 'Design options'], ['48hr', 'Fast delivery'], ['4.9★', 'Average rating']];
const STEPS = [
  ['🎨', 'Create your design', 'Upload your artwork or add custom text in your choice of font and colour.'],
  ['👁️', 'Preview in 3D', 'Turn the shirt around and check every detail before you order.'],
  ['💳', 'Choose & pay', 'Pick size, colour and quantity. Pay by bank transfer or on delivery.'],
  ['📦', 'Receive your order', 'We print and deliver your custom clothing right to your door.'],
];
const FEATURES = [
  ['🖼️', 'Upload any design'], ['🔤', 'Custom text & fonts'], ['🎯', 'Free placement'], ['🌀', '3D preview'],
  ['🎨', '12+ shirt colours'], ['📏', 'XS to 3XL'], ['🔒', 'Secure payment'], ['🚀', 'Fast production'],
];
const REVIEWS = [
  ['AO', 'Adebayo Okonkwo', 'Business Owner, Lagos', 'I uploaded my company logo and ordered 50 T-shirts for our team event. The quality was amazing and they arrived two days early!'],
  ['FI', 'Fatima Ibrahim', 'School Administrator, Abuja', 'The text customization is superb. I typed our school motto and chose the exact font and colour to match our brand.'],
  ['CN', 'Chisom Nwosu', 'Customer, Enugu', 'Ordered custom shirts for my birthday crew. The whole experience was smooth and fun. Will definitely order again!'],
];

export default function Home() {
  const { user } = useSession();
  const start = () => router.navigate('/design');

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        <View style={styles.hero}>
          <T weight="extrabold" style={{ color: colors.white, fontSize: 18, marginBottom: 18 }}>
            Shirt<T weight="extrabold" style={{ color: colors.accent, fontSize: 18 }}>Craft</T>
          </T>
          <View style={styles.badge}><T weight="semibold" style={{ color: colors.gold, fontSize: 12 }}>✨ Premium custom clothing</T></View>
          <T weight="extrabold" style={styles.heroTitle}>
            Design your <T weight="extrabold" style={[styles.heroTitle, { color: colors.accent }]}>perfect</T> outfit
          </T>
          <T style={{ color: 'rgba(255,255,255,0.75)', marginBottom: 22, lineHeight: 21 }}>
            {user ? `Welcome back, ${user.fullname.split(' ')[0]}! ` : ''}Upload your design, add custom text, pick your colour — then preview it in 3D before you order.
          </T>
          <Button title="🎨 Start designing" onPress={start} />
          <View style={styles.stats}>
            {STATS.map(([n, l]) => (
              <View key={l} style={{ width: '50%', paddingVertical: 10 }}>
                <T weight="extrabold" style={{ color: colors.gold, fontSize: 22 }}>{n}</T>
                <T style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{l}</T>
              </View>
            ))}
          </View>
        </View>

        <View style={{ padding: 16 }}>
          <H2 style={{ fontSize: 20, marginTop: 8 }}>From idea to delivery in 4 steps</H2>
          {STEPS.map(([icon, title, text], i) => (
            <Card key={title} style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
              <View style={styles.stepNum}><T weight="bold" style={{ color: colors.white }}>{i + 1}</T></View>
              <View style={{ flex: 1 }}>
                <T weight="bold" style={{ color: colors.primary, fontSize: 15 }}>{icon} {title}</T>
                <Muted style={{ marginTop: 2, lineHeight: 19 }}>{text}</Muted>
              </View>
            </Card>
          ))}

          <H2 style={{ fontSize: 20, marginTop: 10 }}>Why choose us</H2>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 }}>
            {FEATURES.map(([icon, label]) => (
              <View key={label} style={{ width: '50%', padding: 5 }}>
                <View style={styles.feature}>
                  <T style={{ fontSize: 26 }}>{icon}</T>
                  <T weight="semibold" style={{ color: colors.primary, fontSize: 13, marginTop: 6, textAlign: 'center' }}>{label}</T>
                </View>
              </View>
            ))}
          </View>

          <H2 style={{ fontSize: 20, marginTop: 18 }}>What our customers say</H2>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
          {REVIEWS.map(([init, name, title, text]) => (
            <View key={name} style={styles.review}>
              <T style={{ color: colors.gold, marginBottom: 6 }}>★★★★★</T>
              <T style={{ color: 'rgba(255,255,255,0.85)', lineHeight: 20, marginBottom: 14 }}>“{text}”</T>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={styles.avatar}><T weight="bold" style={{ color: colors.white }}>{init}</T></View>
                <View>
                  <T weight="bold" style={{ color: colors.white }}>{name}</T>
                  <T style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>{title}</T>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.cta}>
          <T weight="extrabold" style={{ color: colors.white, fontSize: 20, textAlign: 'center' }}>Ready to create your custom shirt?</T>
          <T style={{ color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginVertical: 10 }}>Start designing right now — it’s free!</T>
          <Button title="🎨 Start designing now" variant="ghost" onPress={start} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.primary, padding: 22, paddingTop: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  badge: { alignSelf: 'flex-start', backgroundColor: 'rgba(240,165,0,0.15)', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 14 },
  heroTitle: { color: colors.white, fontSize: 32, lineHeight: 40, marginBottom: 12 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 22, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 8 },
  stepNum: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  feature: { backgroundColor: colors.white, borderRadius: radius.lg, paddingVertical: 18, alignItems: 'center' },
  review: { width: 290, backgroundColor: colors.secondary, borderRadius: radius.lg, padding: 18 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  cta: { margin: 16, marginTop: 24, padding: 24, borderRadius: radius.lg, backgroundColor: colors.accent },
});
