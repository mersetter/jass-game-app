
export type Suit = 'HEARTS' | 'DIAMONDS' | 'CLUBS' | 'SPADES';
export type Rank = '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
    suit: Suit;
    rank: Rank;
}

export type Mode = 'TRUMP' | 'OBENABE' | 'UNDENUFE'; // Simplified for now

export interface Player {
    id: string;
    name: string;
    isBot: boolean;
    hand: Card[];
    team: 1 | 2;
}

export interface PlayedCard {
    playerId: string;
    card: Card;
}

export const SUITS: Suit[] = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'];
export const RANKS: Rank[] = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export const SUIT_SYMBOLS: Record<Suit, string> = {
    HEARTS: '♥',
    DIAMONDS: '♦',
    CLUBS: '♣',
    SPADES: '♠',
};

export const SUIT_COLORS: Record<Suit, string> = {
    HEARTS: 'red',
    DIAMONDS: 'red',
    CLUBS: 'black',
    SPADES: 'black',
};

export function createDeck(): Card[] {
    const deck: Card[] = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({ suit, rank });
        }
    }
    return shuffle(deck);
}

function shuffle(array: any[]) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}


// ... existing code ...

export function getCardValue(card: Card, trump: Suit | null, mode: Mode): number {
    const isTrump = trump && card.suit === trump;

    if (mode === 'OBENABE') {
        switch (card.rank) {
            case 'A': return 11;
            case 'K': return 4;
            case 'Q': return 3;
            case 'J': return 2;
            case '10': return 10;
            case '9': return 0;
            case '8': return 8; // Obenabe specific: 8 counts 8 to reach 157
            case '7': return 0;
            case '6': return 0;
            default: return 0;
        }
    }

    // ... (Undenufe logic omitted for brevity, treat as Trump logic default) ...

    // Trump Mode
    if (isTrump) {
        switch (card.rank) {
            case 'J': return 20;
            case '9': return 14;
            case 'A': return 11;
            case 'K': return 4;
            case 'Q': return 3;
            case '10': return 10;
            default: return 0;
        }
    } else {
        // Non-trump suit in Trump mode
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

// ... existing code ...

export function isValidMove(card: Card, hand: Card[], trick: PlayedCard[], trump: Suit | null): boolean {
    if (trick.length === 0) return true; // Leading, can play anything

    const leadCard = trick[0].card;
    const leadSuit = leadCard.suit;

    // 1. Must follow suit?
    // Check if player has lead suit
    const hasLeadSuit = hand.some(c => c.suit === leadSuit);

    // Special Rule: If lead is Trump, and you have Trump, you must play Trump.
    // Exception: If you only have the Buur (Jack of Trump), you don't have to play it.
    if (trump && leadSuit === trump) {
        const trumpsInHand = hand.filter(c => c.suit === trump);
        if (trumpsInHand.length > 0) {
            // Check if the only trump is Jack
            const onlyJack = trumpsInHand.length === 1 && trumpsInHand[0].rank === 'J';
            if (onlyJack) return true; // Allowed to hold back Jack

            // Otherwise must play trump
            if (card.suit === trump) return true;
            return false; // Valid trumps exist but playing non-trump
        } else {
            return true; // No trumps, can play anything
        }
    }

    // Normal Suit Lead
    if (hasLeadSuit) {
        // If you have the suit, you generally must play it.
        // Exception: You can play a Trump to cut (stechen).
        if (card.suit === leadSuit) return true;
        if (trump && card.suit === trump) return true; // Cutting with trump is allowed
        // If you have lead suit, playing non-suit non-trump is invalid.
        return false;
    }

    // If you don't have lead suit, you can play anything.
    // Exception: "Untertrumpfen" (Undertrumping) if a trump is already played.
    // Not implemented for simplicity in this version, but basically:
    // If trick contains a high trump, and you play a lower trump, it's invalid unless you have ONLY trumps.
    return true;
}


// Order for comparison (higher is better)
const RANK_ORDER_NORMAL: Record<Rank, number> = {
    '6': 0, '7': 1, '8': 2, '9': 3, '10': 4, 'J': 5, 'Q': 6, 'K': 7, 'A': 8
};
const RANK_ORDER_TRUMP: Record<Rank, number> = {
    '6': 0, '7': 1, '8': 2, '10': 3, 'Q': 4, 'K': 5, 'A': 6, '9': 7, 'J': 8
};
// Obenabe: A is highest. A=8... 6=0.
// Undenufe: 6 is highest.

export function getTrickWinner(trick: PlayedCard[], trump: Suit | null, lead: Suit): number {
    if (trick.length === 0) return -1;

    let winnerIdx = 0;
    let highestCard = trick[0].card;

    for (let i = 1; i < trick.length; i++) {
        const current = trick[i].card;

        // Check if current beats highest
        if (trump && current.suit === trump) {
            if (highestCard.suit !== trump) {
                // Trump beats non-trump
                winnerIdx = i;
                highestCard = current;
            } else {
                // Both trump, compare ranks
                if (RANK_ORDER_TRUMP[current.rank] > RANK_ORDER_TRUMP[highestCard.rank]) {
                    winnerIdx = i;
                    highestCard = current;
                }
            }
        } else if (current.suit === lead) {
            if (highestCard.suit === lead) {
                // Both lead suit (and no trump previously found that was higher? Wait.
                // If highest was trump, current (lead) cannot beat it.
                if (trump && highestCard.suit === trump) {
                    continue;
                }
                // Both lead, compare normal
                if (RANK_ORDER_NORMAL[current.rank] > RANK_ORDER_NORMAL[highestCard.rank]) {
                    winnerIdx = i;
                    highestCard = current;
                }
            } else if (highestCard.suit !== trump) {
                // Highest was not lead (discard) and not trump. Current is lead. Current wins.
                // Wait, if I play a card that matches lead, and highest was NOT lead (and not trump), then highest was a "discard" which loses to lead?
                // The first card sets the lead. So highestCard starts as lead.
                // If subsequent cards are not lead and not trump, they lose.
                // So we only update if current matches lead (and is higher) OR is trump.
            }
        } else {
            // Current is neither trump nor lead. It loses (unless Undenufe/Obenabe special cases, but assuming match rules).
        }
    }

    return winnerIdx;
}
