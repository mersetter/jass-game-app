// ============================================
// JASS.IO - Type Definitions
// ============================================

export type Suit = 'HEARTS' | 'DIAMONDS' | 'CLUBS' | 'SPADES';
export type Rank = '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
    suit: Suit;
    rank: Rank;
}

export interface Player {
    id: string;
    name: string;
    team: 1 | 2;
    hand: Card[];
    isBot: boolean;
    isConnected: boolean;
}

export interface PlayedCard {
    playerId: string;
    card: Card;
}

export interface GameState {
    roomId: string;
    status: 'LOBBY' | 'PLAYING' | 'ROUND_END' | 'GAME_OVER';
    players: Player[];
    trump: Suit | null;
    trick: PlayedCard[];
    currentTurn: number; // index in players array
    scores: {
        team1: number;
        team2: number;
    };
    roundScores: {
        team1: number;
        team2: number;
    };
    lastTrickWinner?: {
        playerName: string;
        points: number;
    };
    hostId: string;
}

// Pusher Events
export type PusherEventType =
    | 'game-state'
    | 'player-joined'
    | 'player-left'
    | 'game-started'
    | 'card-played'
    | 'trick-won'
    | 'round-end'
    | 'game-over'
    | 'error';

export interface PusherMessage {
    type: PusherEventType;
    payload: unknown;
}

// API Request/Response types
export interface CreateRoomRequest {
    playerName: string;
}

export interface CreateRoomResponse {
    roomId: string;
    playerId: string;
}

export interface JoinRoomRequest {
    roomId: string;
    playerName: string;
}

export interface JoinRoomResponse {
    success: boolean;
    playerId?: string;
    error?: string;
}

export interface PlayCardRequest {
    roomId: string;
    playerId: string;
    cardIndex: number;
}

export interface StartGameRequest {
    roomId: string;
    playerId: string; // must be host
}

// Constants
export const SUITS: Suit[] = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'];
export const RANKS: Rank[] = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export const SUIT_SYMBOLS: Record<Suit, string> = {
    HEARTS: '♥',
    DIAMONDS: '♦',
    CLUBS: '♣',
    SPADES: '♠',
};

export const SUIT_NAMES_DE: Record<Suit, string> = {
    HEARTS: 'Herz',
    DIAMONDS: 'Schellen',
    CLUBS: 'Kreuz',
    SPADES: 'Schaufel',
};

export const RANK_NAMES: Record<Rank, string> = {
    '6': '6',
    '7': '7',
    '8': '8',
    '9': '9',
    '10': '10',
    'J': 'B',  // Bauer (Jack)
    'Q': 'D',  // Dame
    'K': 'K',  // König
    'A': 'A',  // Ass
};
