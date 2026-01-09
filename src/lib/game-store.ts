// ============================================
// JASS.IO - Game Store (In-Memory)
// For production, replace with Redis/Database
// ============================================

import { GameState, Player, PlayedCard } from './types';
import {
    createInitialGameState,
    initializeRound,
    getTrickWinner,
    calculateTrickPoints,
    isRoundOver,
    isGameOver,
    isValidMove,
} from './game-engine';

// In-memory storage (Note: Will be reset on Vercel cold starts)
// For production, use Vercel KV, Upstash Redis, or a database
const rooms: Map<string, GameState> = new Map();

// ============================================
// ROOM MANAGEMENT
// ============================================

export function createRoom(roomId: string, hostId: string): GameState {
    const state = createInitialGameState(roomId, hostId);
    rooms.set(roomId, state);
    return state;
}

export function getRoom(roomId: string): GameState | undefined {
    return rooms.get(roomId);
}

export function deleteRoom(roomId: string): void {
    rooms.delete(roomId);
}

export function roomExists(roomId: string): boolean {
    return rooms.has(roomId);
}

// ============================================
// PLAYER MANAGEMENT
// ============================================

export function addPlayer(
    roomId: string,
    playerId: string,
    playerName: string
): { success: boolean; state?: GameState; error?: string } {
    const room = rooms.get(roomId);
    if (!room) {
        return { success: false, error: 'Raum nicht gefunden' };
    }
    if (room.status !== 'LOBBY') {
        return { success: false, error: 'Spiel läuft bereits' };
    }
    if (room.players.length >= 4) {
        return { success: false, error: 'Raum ist voll' };
    }
    if (room.players.some((p) => p.id === playerId)) {
        return { success: false, error: 'Bereits beigetreten' };
    }

    // Assign to teams (1, 2, 1, 2)
    const team = (room.players.length % 2) + 1 as 1 | 2;

    const newPlayer: Player = {
        id: playerId,
        name: playerName,
        team,
        hand: [],
        isBot: false,
        isConnected: true,
    };

    room.players.push(newPlayer);
    rooms.set(roomId, room);

    return { success: true, state: room };
}

export function removePlayer(
    roomId: string,
    playerId: string
): GameState | undefined {
    const room = rooms.get(roomId);
    if (!room) return undefined;

    room.players = room.players.filter((p) => p.id !== playerId);

    // If room is empty, delete it
    if (room.players.length === 0) {
        rooms.delete(roomId);
        return undefined;
    }

    // If host left, assign new host
    if (room.hostId === playerId && room.players.length > 0) {
        room.hostId = room.players[0].id;
    }

    rooms.set(roomId, room);
    return room;
}

// ============================================
// GAME ACTIONS
// ============================================

export function startGame(
    roomId: string,
    playerId: string
): { success: boolean; state?: GameState; error?: string } {
    const room = rooms.get(roomId);
    if (!room) {
        return { success: false, error: 'Raum nicht gefunden' };
    }
    if (room.hostId !== playerId) {
        return { success: false, error: 'Nur der Host kann starten' };
    }
    if (room.players.length < 4) {
        // Add bots to fill
        while (room.players.length < 4) {
            const botNum = room.players.length + 1;
            const team = (room.players.length % 2) + 1 as 1 | 2;
            room.players.push({
                id: `bot-${botNum}-${Date.now()}`,
                name: `Bot ${botNum}`,
                team,
                hand: [],
                isBot: true,
                isConnected: true,
            });
        }
    }

    const newState = initializeRound(room);
    rooms.set(roomId, newState);

    return { success: true, state: newState };
}

export function playCard(
    roomId: string,
    playerId: string,
    cardIndex: number
): {
    success: boolean;
    state?: GameState;
    trickComplete?: boolean;
    trickWinner?: { playerName: string; points: number };
    roundOver?: boolean;
    gameOver?: boolean;
    error?: string;
} {
    const room = rooms.get(roomId);
    if (!room) {
        return { success: false, error: 'Raum nicht gefunden' };
    }
    if (room.status !== 'PLAYING') {
        return { success: false, error: 'Spiel läuft nicht' };
    }

    const playerIdx = room.players.findIndex((p) => p.id === playerId);
    if (playerIdx === -1) {
        return { success: false, error: 'Spieler nicht gefunden' };
    }
    if (playerIdx !== room.currentTurn) {
        return { success: false, error: 'Nicht dein Zug' };
    }

    const player = room.players[playerIdx];
    const card = player.hand[cardIndex];
    if (!card) {
        return { success: false, error: 'Ungültige Karte' };
    }

    // Validate move
    if (!isValidMove(card, player.hand, room.trick, room.trump)) {
        return { success: false, error: 'Ungültiger Zug' };
    }

    // Remove card from hand
    player.hand.splice(cardIndex, 1);

    // Add to trick
    room.trick.push({ playerId: player.id, card });

    // Check if trick is complete (4 cards)
    if (room.trick.length === 4) {
        const winnerIdxInTrick = getTrickWinner(room.trick, room.trump);
        const winnerPlayerId = room.trick[winnerIdxInTrick].playerId;
        const winnerPlayerIdx = room.players.findIndex((p) => p.id === winnerPlayerId);
        const winnerPlayer = room.players[winnerPlayerIdx];

        const isLastTrick = isRoundOver(room.players);
        const points = calculateTrickPoints(room.trick, room.trump, isLastTrick);

        // Add points to team
        if (winnerPlayer.team === 1) {
            room.roundScores.team1 += points;
            room.scores.team1 += points;
        } else {
            room.roundScores.team2 += points;
            room.scores.team2 += points;
        }

        room.lastTrickWinner = {
            playerName: winnerPlayer.name,
            points,
        };

        // Winner leads next trick
        room.currentTurn = winnerPlayerIdx;
        room.trick = [];

        rooms.set(roomId, room);

        // Check if round is over
        if (isLastTrick) {
            room.status = 'ROUND_END';

            // Check if game is over
            if (isGameOver(room.scores)) {
                room.status = 'GAME_OVER';
                return {
                    success: true,
                    state: room,
                    trickComplete: true,
                    trickWinner: room.lastTrickWinner,
                    roundOver: true,
                    gameOver: true,
                };
            }

            return {
                success: true,
                state: room,
                trickComplete: true,
                trickWinner: room.lastTrickWinner,
                roundOver: true,
            };
        }

        return {
            success: true,
            state: room,
            trickComplete: true,
            trickWinner: room.lastTrickWinner,
        };
    }

    // Next player's turn
    room.currentTurn = (room.currentTurn + 1) % 4;
    rooms.set(roomId, room);

    return { success: true, state: room };
}

export function startNextRound(roomId: string): GameState | undefined {
    const room = rooms.get(roomId);
    if (!room) return undefined;

    const newState = initializeRound(room);
    rooms.set(roomId, newState);
    return newState;
}

// ============================================
// STATE SERIALIZATION
// ============================================

/**
 * Get state for a specific player (hide other players' cards)
 */
export function getPlayerView(state: GameState, playerId: string): GameState {
    return {
        ...state,
        players: state.players.map((p) => ({
            ...p,
            // Only show own hand, or if viewing as spectator show card count
            hand: p.id === playerId ? p.hand : p.hand.map(() => ({ suit: 'HEARTS', rank: '6' } as const)),
        })),
    };
}

/**
 * Get full state (for broadcast)
 */
export function getFullState(state: GameState): GameState {
    return state;
}
