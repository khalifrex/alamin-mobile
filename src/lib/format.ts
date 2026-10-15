/** ₦3,500.00 — same output as naira() in includes/functions.php. */
export function naira(n: number): string {
  const [whole, frac] = Math.abs(n).toFixed(2).split('.');
  return (n < 0 ? '−' : '') + '₦' + whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + frac;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDate(iso: string, withTime = false): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const date = `${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`;
  if (!withTime) return date;
  const h = d.getHours(), m = String(d.getMinutes()).padStart(2, '0');
  return `${date} · ${((h + 11) % 12) + 1}:${m} ${h < 12 ? 'AM' : 'PM'}`;
}

export function trimPct(p: number): string {
  return String(Math.round(p * 100) / 100);
}

export const NIGERIAN_STATES = ['Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta',
  'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT Abuja', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
  'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'];

export const COUNTRY_CODES = ['+234', '+1', '+44', '+233', '+254'];
