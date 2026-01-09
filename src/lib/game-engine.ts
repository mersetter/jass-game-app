// ============================================
// JASS.IO - Game Engine
// Core game logic for Jass card game
// ============================================

import { Card, Suit, Rank, Player, PlayedCard, GameState, SUITS, RANKS } from './types';

// ============================================
// DECK MANAGEMENT
// ============================================

/**
 * Creates a shuffled 36-card Jass deck
 */
export function createDeck(): Card[] {
    const deck: Card[] = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({ suit, rank });
        }
    }
    return shuffle(deck);
}

/**
 * Fisher-Yates shuffle
 */
function shuffle<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * Deal cards to players (9 cards each for 4 players)
 */
export function dealCards(players: Player[]): Player[] {
    const deck = createDeck();
    return players.map((player, idx) => ({
        ...player,
        hand: sortHand(deck.slice(idx * 9, (idx + 1) * 9)),
    }));
}

/**
 * Sort hand by suit, then by rank within suit
 */
export function sortHand(hand: Card[]): Card[] {
    const suitOrder: Record<Suit, number> = {
        HEARTS: 0,
        DIAMONDS: 1,
        CLUBS: 2,
        SPADES: 3,
    };
    const rankOrder: Record<Rank, number> = {
        '6': 0, '7': 1, '8': 2, '9': 3, '10': 4, 'J': 5, 'Q': 6, 'K': 7, 'A': 8,
    };

    return [...hand].sort((a, b) => {
        const suitDiff = suitOrder[a.suit] - suitOrder[b.suit];
        if (suitDiff !== 0) return suitDiff;
        return rankOrder[a.rank] - rankOrder[b.rank];
    });
}

// ============================================
// CARD VALUES (for scoring)
// ============================================

/**
 * Get point value of a card in Trump mode
 */
export function getCardValue(card: Card, trump: Suit | null): number {
    const isTrump = trump !== null && card.suit === trump;

    if (isTrump) {
        // Trump values (Nell = 14, Buur = 20)
        switch (card.rank) {
            case 'J': return 20;  // Buur (Jack of Trump)
            case '9': return 14;  // Nell (9 of Trump)
            case 'A': return 11;
            case 'K': return 4;
            case 'Q': return 3;
            case '10': return 10;
            default: return 0;
        }
    } else {
        // Regular suit values
        switch (card.rank) {
            case 'A': return 11;
            case 'K': return 4;
            case 'Q': return 3;
            case 'J': return 2;
            case '10': return 10;
            default: return 0;
        }
    }
}

/**
 * Calculate total points in a trick
 */
export function calculateTrickPoints(trick: PlayedCard[], trump: Suit | null, isLastTrick: boolean): number {
    let points = trick.reduce((sum, p) => sum + getCardValue(p.card, trump), 0);
    if (isLastTrick) {
        points += 5; // "Stöck" bonus for last trick
    }
    return points;
}

// ============================================
// CARD COMPARISON (for determining winner)
// ============================================

const RANK_ORDER_NORMAL: Record<Rank, number> = {
    '6': 0, '7': 1, '8': 2, '9': 3, '10': 4, 'J': 5, 'Q': 6, 'K': 7, 'A': 8,
};

const RANK_ORDER_TRUMP: Record<Rank, number> = {
    '6': 0, '7': 1, '8': 2, '10': 3, 'Q': 4, 'K': 5, 'A': 6, '9': 7, 'J': 8,
};

/**
 * Determine the winner of a trick
 * Returns the index within the trick array
 */
export function getTrickWinner(trick: PlayedCard[], trump: Suit | null): number {
    if (trick.length === 0) return -1;

    const leadSuit = trick[0].card.suit;
    let winnerIdx = 0;
    let winnerCard = trick[0].card;

    for (let i = 1; i < trick.length; i++) {
        const current = trick[i].card;

        if (beats(current, winnerCard, leadSuit, trump)) {
            winnerIdx = i;
            winnerCard = current;
        }
    }

    return winnerIdx;
}

/**
 * Check if card A beats card B
 */
function beats(a: Card, b: Card, leadSuit: Suit, trump: Suit | null): boolean {
    const aIsTrump = trump !== null && a.suit === trump;
    const bIsTrump = trump !== null && b.suit === trump;

    // Trump beats non-trump
    if (aIsTrump && !bIsTrump) return true;
    if (!aIsTrump && bIsTrump) return false;

    // Both trump: compare trump ranks
    if (aIsTrump && bIsTrump) {
        return RANK_ORDER_TRUMP[a.rank] > RANK_ORDER_TRUMP[b.rank];
    }

    // Neither is trump
    // Only lead suit matters
    const aIsLead = a.suit === leadSuit;
    const bIsLead = b.suit === leadSuit;

    if (aIsLead && !bIsLead) return true;
    if (!aIsLead && bIsLead) return false;

    // Both same suit (lead): compare normal ranks
    if (aIsLead && bIsLead) {
        return RANK_ORDER_NORMAL[a.rank] > RANK_ORDER_NORMAL[b.rank];
    }

    // Neither is lead suit: doesn't beat
    return false;
}

// ============================================
// MOVE VALIDATION
// ============================================

/**
 * Check if playing a card is valid according to Jass rules
 */
export function isValidMove(
    card: Card,
    hand: Card[],
    trick: PlayedCard[],
    trump: Suit | null
): boolean {
    // First card can be anything
    if (trick.length === 0) return true;

    const leadCard = trick[0].card;
    const leadSuit = leadCard.suit;

    // Check if player has lead suit
    const hasLeadSuit = hand.some((c) => c.suit === leadSuit);

    // If lead is trump
    if (trump && leadSuit === trump) {
        const trumpsInHand = hand.filter((c) => c.suit === trump);

        if (trumpsInHand.length > 0) {
            // Exception: If only trump is the Buur (Jack), don't have to play it
            const onlyBuur = trumpsInHand.length === 1 && trumpsInHand[0].rank === 'J';
            if (onlyBuur) return true;

            // Must play trump
            return card.suit === trump;
        }
        // No trumps, can play anything
        return true;
    }

    // Normal suit lead
    if (hasLeadSuit) {
        // Must follow suit OR can cut with trump
        if (card.suit === leadSuit) return true;
        if (trump && card.suit === trump) return true; // Stechen (cut)
        return false;
    }

    // Don't have lead suit, can play anything
    // Note: Untertrumpfen (undertrumping) rules not implemented for simplicity
    return true;
}

/**
 * Get all valid cards from a hand
 */
export function getValidCards(
    hand: Card[],
    trick: PlayedCard[],
    trump: Suit | null
): Card[] {
    return hand.filter((card) => isValidMove(card, hand, trick, trump));
}

// ============================================
// BOT LOGIC (Simple AI)
// ============================================

/**
 * Simple bot that plays a valid card
 * Strategy: Play lowest value valid card when not winning,
 * play highest when trying to secure
 */
export function getBotMove(
    hand: Card[],
    trick: PlayedCard[],
    trump: Suit | null,
    players: Player[],
    currentPlayerIdx: number
): number {
    const validCards = getValidCards(hand, trick, trump);
    if (validCards.length === 0) return 0;

    // For simplicity: play a random valid card
    // More sophisticated logic could be added
    const randomIdx = Math.floor(Math.random() * validCards.length);
    const chosenCard = validCards[randomIdx];

    return hand.findIndex(
        (c) => c.suit === chosenCard.suit && c.rank === chosenCard.rank
    );
}

// ============================================
// GAME STATE HELPERS
// ============================================

/**
 * Create initial game state for a room
 */
export function createInitialGameState(roomId: string, hostId: string): GameState {
    return {
        roomId,
        status: 'LOBBY',
        players: [],
        trump: null,
        trick: [],
        currentTurn: 0,
        scores: { team1: 0, team2: 0 },
        roundScores: { team1: 0, team2: 0 },
        hostId,
    };
}

/**
 * Initialize a new round (deal cards, set trump)
 */
export function initializeRound(state: GameState): GameState {
    const playersWithCards = dealCards(state.players);

    // Random trump
    const trump = SUITS[Math.floor(Math.random() * SUITS.length)];

    return {
        ...state,
        status: 'PLAYING',
        players: playersWithCards,
        trump,
        trick: [],
        currentTurn: 0,
        roundScores: { team1: 0, team2: 0 },
        lastTrickWinner: undefined,
    };
}

/**
 * Check if round is over (all cards played)
 */
export function isRoundOver(players: Player[]): boolean {
    return players.every((p) => p.hand.length === 0);
}

/**
 * Check if game is over (reaching 1000 points)
 */
export function isGameOver(scores: { team1: number; team2: number }): boolean {
    return scores.team1 >= 1000 || scores.team2 >= 1000;
}

/**
 * Get winner team
 */
export function getWinningTeam(scores: { team1: number; team2: number }): 1 | 2 | null {
    if (scores.team1 >= 1000) return 1;
    if (scores.team2 >= 1000) return 2;
    return null;
}

/**
 * Generate a random 6-character room code
 */
export function generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No confusing chars like O, 0, I, 1
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}
