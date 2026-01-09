# 🇨🇭 JASS.IO - Schweizer Kartenspiel Online

Ein modernes, Premium Online-Multiplayer Jass-Spiel mit Echtzeit-Verbindung über Pusher.

![JASS.IO](https://img.shields.io/badge/JASS.IO-Premium-red?style=for-the-badge)

## ✨ Features

- 🎮 **Echtzeit-Multiplayer** - Spiele mit bis zu 4 Spielern online
- 🤖 **Bot-Unterstützung** - Fehlende Spieler werden durch Bots ersetzt
- 🎨 **Premium Design** - Glassmorphism & Swiss-inspired Theme
- 📱 **Responsive** - Optimiert für Desktop & Mobile
- ⚡ **Schnell** - Gehostet auf Vercel mit Pusher Realtime

## 🚀 Quick Start

### 1. Pusher Account erstellen

1. Gehe zu [pusher.com](https://pusher.com) und erstelle einen kostenlosen Account
2. Erstelle eine neue "Channels" App
3. Kopiere die Zugangsdaten

### 2. Environment Variables

Erstelle `.env.local` im Root-Verzeichnis:

```env
PUSHER_APP_ID=your_app_id
PUSHER_SECRET=your_secret
NEXT_PUBLIC_PUSHER_KEY=your_key
NEXT_PUBLIC_PUSHER_CLUSTER=eu
```

### 3. Installation

```bash
npm install
```

### 4. Development Server

```bash
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000) im Browser.

## 🌐 Deployment auf Vercel

### Automatisches Deployment

1. Push den Code zu GitHub
2. Gehe zu [vercel.com](https://vercel.com)
3. Importiere das Repository
4. Füge die Environment Variables hinzu:
   - `PUSHER_APP_ID`
   - `PUSHER_SECRET`
   - `NEXT_PUBLIC_PUSHER_KEY`
   - `NEXT_PUBLIC_PUSHER_CLUSTER`
5. Klicke **Deploy**

## 🎮 Spielanleitung

1. **Neues Spiel erstellen** - Generiert einen 6-stelligen Raum-Code
2. **Code teilen** - Sende den Code an deine Freunde
3. **Beitreten** - Freunde geben den Code ein
4. **Starten** - Der Host startet das Spiel (mit Bots wenn < 4 Spieler)

### Jass Regeln (Schieber)

- 36 Karten, 4 Spieler in 2 Teams
- Der Trumpf wird zufällig gewählt
- Farbzwang: Du musst die angespielte Farbe bedienen (wenn möglich)
- Trumpf kann jederzeit gespielt werden (Stechen)
- Ziel: 1000 Punkte erreichen

## 🛠 Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Custom CSS mit Glassmorphism
- **Realtime**: Pusher Channels
- **Hosting**: Vercel
- **Game Logic**: Custom TypeScript Engine

## 📁 Projektstruktur

```
src/
├── app/
│   ├── api/
│   │   ├── room/          # Room creation & joining
│   │   └── game/          # Game actions (start, play)
│   ├── globals.css        # Premium design system
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── Card.tsx           # Playing card component
│   ├── GameTable.tsx      # Game table view
│   ├── JassApp.tsx        # Main app logic
│   └── Lobby.tsx          # Lobby & waiting room
└── lib/
    ├── types.ts           # TypeScript definitions
    ├── game-engine.ts     # Core game logic
    ├── game-store.ts      # Game state management
    └── pusher.ts          # Pusher configuration
```

## ⚠️ Bekannte Limitierungen

- **Serverless State**: Da Vercel serverless ist, wird der Spielstand im Memory gespeichert. Bei Cold Starts geht der State verloren. Für Produktion empfohlen: Redis (Upstash/Vercel KV)
- **Karten der Gegner**: Aktuell sehen alle Spieler nur ihre eigenen Karten (Kartenzählen nicht möglich)

## 📝 Lizenz

MIT License - Frei zur Nutzung

---

Made with ❤️ in Switzerland 🇨🇭
