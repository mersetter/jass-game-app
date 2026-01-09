// ============================================
// JASS.IO - Pusher Configuration
// ============================================

import Pusher from 'pusher';
import PusherClient from 'pusher-js';

// Server-side Pusher instance
export const pusherServer = new Pusher({
    appId: process.env.PUSHER_APP_ID!,
    key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    useTLS: true,
});

// Client-side Pusher instance (singleton)
let pusherClientInstance: PusherClient | null = null;

export function getPusherClient(): PusherClient {
    if (!pusherClientInstance) {
        pusherClientInstance = new PusherClient(
            process.env.NEXT_PUBLIC_PUSHER_KEY!,
            {
                cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
            }
        );
    }
    return pusherClientInstance;
}

// Channel naming convention
export function getRoomChannel(roomId: string): string {
    return `jass-room-${roomId}`;
}

// Event names
export const PUSHER_EVENTS = {
    GAME_STATE: 'game-state',
    PLAYER_JOINED: 'player-joined',
    PLAYER_LEFT: 'player-left',
    GAME_STARTED: 'game-started',
    CARD_PLAYED: 'card-played',
    TRICK_WON: 'trick-won',
    ROUND_END: 'round-end',
    GAME_OVER: 'game-over',
    ERROR: 'error',
} as const;
