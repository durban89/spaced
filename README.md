# Spaced

A web app for memorizing knowledge using the Ebbinghaus forgetting curve. Built with React + TypeScript.

## Features

- **Spaced Repetition** — 7-level review intervals based on the Ebbinghaus forgetting curve (20min → 1h → 9h → 1d → 2d → 6d → 31d)
- **Card Flip Animation** — Tap to reveal answers with smooth 3D flip effect
- **Smart Scheduling** — Three feedback modes: Remembered / Fuzzy / Forgot, each adjusts the next review time accordingly
- **Category Management** — Organize cards by subject, with filtering support
- **Statistics** — Mastery distribution, day streak, recent activity
- **PWA** — Installable on mobile and desktop, works offline
- **Push Notifications** — FCM web push: get reminded on your phone even when the app is closed
- **Dark Mode** — Automatic theme based on system preference

## Tech Stack

- React 18 + TypeScript
- Vite
- IndexedDB (via idb)
- React Router
- Firebase (Auth, Firestore, Cloud Messaging)

## Push Notifications Setup

1. **Firebase Console** → Project Settings → Cloud Messaging → copy the **Web push certificates → Key pair** and set it in `.env`:

   ```
   VITE_FIREBASE_VAPID_KEY="your-vapid-public-key"
   ```

2. **Deploy the scheduled reminder function** (requires Firebase Blaze plan, one-time):

   ```bash
   pnpm install          # from repo root, installs functions deps too
   cd functions
   pnpm build
   firebase login
   firebase deploy --only functions
   ```

3. **Deploy Firestore rules**:

   ```bash
   firebase deploy --only firestore:rules
   ```

4. Build & deploy the web app (the build injects Firebase config into
   `firebase-messaging-sw.js` and `gcm_sender_id` into the manifest automatically).

Users then tap **Enable** on the notification banner → the FCM token is stored in
`users/{uid}/fcmTokens`. The scheduled Cloud Function checks every 30 minutes for
due cards and pushes a notification.

> Note: on iOS (Safari 16.4+) and Android (Chrome), push requires the app to be
> installed to the home screen (PWA) and HTTPS.

## Development

```bash
pnpm install
pnpm dev
```

## Build

```bash
pnpm build
```

Output will be in the `dist/` directory.

## Deploy to Hugo

Copy the build output to your Hugo site's static directory:

```bash
cp -r dist/* /path/to/hugo-site/static/memory/
```

Then access at `https://your-domain.com/memory/`.

## Project Structure

```
src/
├── main.tsx              # Entry point
├── App.tsx               # Router setup
├── types.ts              # Type definitions
├── db.ts                 # IndexedDB operations
├── scheduler.ts          # Ebbinghaus scheduling algorithm
├── components/
│   ├── Layout.tsx        # Bottom navigation
│   └── CardFlip.tsx      # Flip card component
└── pages/
    ├── Home.tsx          # Dashboard + quick add
    ├── Cards.tsx         # Card management
    ├── Review.tsx        # Review session
    └── Stats.tsx         # Statistics
```

## License

[AGPL-3.0](LICENSE)
