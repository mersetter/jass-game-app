// ============================================
// JASS.IO - Play Card API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { playCard, getRoom, startNextRound } from '@/lib/game-store';
import { pusherServer, getRoomChannel, PUSHER_EVENTS } from '@/lib/pusher';
import { getBotMove } from '@/lib/game-engine';

// POST /api/game/play - Play a card
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { roomId, playerId, cardIndex } = body;

        if (!roomId || !playerId || cardIndex === undefined) {
            return NextResponse.json(
                { error: 'Fehlende Parameter' },
                { status: 400 }
            );
        }

        const result = playCard(roomId, playerId, cardIndex);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            );
        }

        // Broadcast card played
        await pusherServer.trigger(
            getRoomChannel(roomId),
            PUSHER_EVENTS.CARD_PLAYED,
            { state: result.state }
        );

        // If trick complete, broadcast winner
        if (result.trickComplete && result.trickWinner) {
            await pusherServer.trigger(
                getRoomChannel(roomId),
                PUSHER_EVENTS.TRICK_WON,
                {
                    winner: result.trickWinner,
                    state: result.state
                }
            );
        }

        // If round over
        if (result.roundOver) {
            await pusherServer.trigger(
                getRoomChannel(roomId),
                PUSHER_EVENTS.ROUND_END,
                { state: result.state }
            );
        }

        // If game over
        if (result.gameOver) {
            await pusherServer.trigger(
                getRoomChannel(roomId),
                PUSHER_EVENTS.GAME_OVER,
                { state: result.state }
            );
        }

        // Check if next player is a bot and trigger bot move
        if (result.state && result.state.status === 'PLAYING') {
            const currentPlayer = result.state.players[result.state.currentTurn];
            if (currentPlayer.isBot) {
                // Small delay before bot plays
                setTimeout(async () => {
                    await playBotTurn(roomId);
                }, 1000);
            }
        }

        return NextResponse.json({
            success: true,
            state: result.state,
        });
    } catch (error) {
        console.error('Error playing card:', error);
        return NextResponse.json(
            { error: 'Fehler beim Spielen' },
            { status: 500 }
        );
    }
}

// Helper function to play bot turns
async function playBotTurn(roomId: string) {
    const room = getRoom(roomId);
    if (!room || room.status !== 'PLAYING') return;

    const currentPlayer = room.players[room.currentTurn];
    if (!currentPlayer.isBot) return;

    // Get bot's move
    const cardIndex = getBotMove(
        currentPlayer.hand,
        room.trick,
        room.trump,
        room.players,
        room.currentTurn
    );

    // Play the card
    const result = playCard(roomId, currentPlayer.id, cardIndex);

    if (result.success && result.state) {
        // Broadcast
        await pusherServer.trigger(
            getRoomChannel(roomId),
            PUSHER_EVENTS.CARD_PLAYED,
            { state: result.state }
        );

        if (result.trickComplete && result.trickWinner) {
            await pusherServer.trigger(
                getRoomChannel(roomId),
                PUSHER_EVENTS.TRICK_WON,
                {
                    winner: result.trickWinner,
                    state: result.state
                }
            );
        }

        // Continue if next is also bot
        if (result.state.status === 'PLAYING') {
            const nextPlayer = result.state.players[result.state.currentTurn];
            if (nextPlayer.isBot) {
                setTimeout(() => playBotTurn(roomId), 1000);
            }
        }
    }
}
