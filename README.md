
# Pro Jass App

A premium, modern web-based Jass application built with Next.js.

## Features

- **Play against Bots**: advanced card logic and automated opponents.
- **Premium Design**: Dark mode aesthetic with glassmorphism effects.
- **Responsive**: Works on Tablets and Desktops. (Mobile Landscape recommended).
- **Jass Rules**: Supports standard Trump rules (Schieber basics).

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) with your browser.

## Deployment (Go Online)

To make this app available to friends online:

1. The code is already pushed to [GitHub](https://github.com/mersetter/jass-game-app).
2. Go to [Vercel](https://vercel.com) and sign in.
3. Click "Add New..." -> "Project".
4. Import `jass-game-app`.
5. Click **Deploy**.

### Real-Time Multiplayer Note

Currently, the "Online" mode is a placeholder. To enable real-time multiplayer where 4 people play on different devices, you need a backend server to sync the game state.

Recommended stack for adding multiplayer:
- **Socket.io** with a custom Node.js server.
- **Firebase Realtime Database**.
- **PartyKit** (Serverless WebSockets).

For now, enjoy the Single Player experience against our Bots!
