# ShirtCraft mobile (Expo)

The ShirtCraft shop as an iOS/Android app. It uses the **same PHP + MySQL backend** as the website:
same accounts, catalogue, prices, orders and admin.

## Run it

1. Start **Apache** and **MySQL** in XAMPP (the website must work at `http://localhost/stallion/`).
2. Point the app at your computer. A phone can't reach `localhost`, so use your computer's LAN IP:
   ```sh
   cp .env.example .env.local
   # edit EXPO_PUBLIC_API_URL, e.g. http://192.168.1.10/stallion/
   ```
   Android emulator: `http://10.0.2.2/stallion/` · iOS simulator: `http://localhost/stallion/`
3. Install and start:
   ```sh
   npm install
   npx expo start
   ```
   Scan the QR code with **Expo Go** (phone on the same Wi-Fi as the computer).
   If Windows Firewall blocks it, allow Apache (port 80) on private networks.

The Account tab shows which server the app is using.

## How it talks to the backend

| App needs | Endpoint |
|---|---|
| Session, CSRF token, catalogue, checkout draft, my orders, receipt, admin lists | `api/mobile.php?action=…` (new, read-only GET) |
| Sign in / register / sign out | `api/auth.php` |
| Live price | `api/quote.php` |
| Artwork upload | `api/upload.php` |
| Add to order (design + PNG previews) | `api/save_draft.php` |
| Place order | `api/place_order.php` |
| Admin sign in, password | `api/admin_auth.php` |
| Order status, catalogue edits | `api/admin_order.php`, `api/admin_catalog.php` |

`api/mobile.php` is the only backend addition. It returns, as JSON, the data that the PHP pages render as HTML. No existing file was changed.
Prices and validation still come only from PHP. The PHP session cookie is kept by the phone's networking layer, like a browser keeps it.
The app sends `X-CSRF-Token` and re-fetches the token after sign-in (PHP rotates it) or on a 419.

The designer uses the web's 500×600 canvas coordinates and layer format, so mobile and web orders look identical to the printer.
Proof PNGs are captured with `react-native-view-shot`. Shirt photos are loaded from the site's `assets/images/shirts/`.

## Layout

```
src/app/            screens (Expo Router)
  (tabs)/           Home · Design · Orders · Account
  auth, checkout, receipt/[ref]
  admin/            orders, order/[ref], catalog, account
src/design/         canvas, 3D turntable, PNG capture, layer model
src/lib/            API client, session, formatting, theme
```

## Checks

```sh
npx tsc --noEmit
npx expo lint
npx expo-doctor
```

## Release builds

`app.json` allows plain-HTTP traffic (Android `usesCleartextTraffic`, iOS ATS), so a LAN XAMPP server works in development builds.
For a store release, serve the site over **HTTPS** and remove those exceptions. Build with `npx eas-cli@latest build`.
