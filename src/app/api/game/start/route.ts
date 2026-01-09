// ============================================
// JASS.IO - Start Game API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { startGame } from '@/lib/game-store';
import { pusherServer, getRoomChannel, PUSHER_EVENTS } from '@/lib/pusher';

// POST /api/game/start - Start the game
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { roomId, playerId } = body;

        if (!roomId || !playerId) {
            return NextResponse.json(
                { error: 'Room ID und Player ID erforderlich' },
                { status: 400 }
            );
        }

        const result = startGame(roomId, playerId);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            );
        }

        // Broadcast game started
        await pusherServer.trigger(
            getRoomChannel(roomId),
            PUSHER_EVENTS.GAME_STARTED,
            { state: result.state }
        );

        return NextResponse.json({
            success: true,
            state: result.state,
        });
    } catch (error) {
        console.error('Error starting game:', error);
        return NextResponse.json(
            { error: 'Fehler beim Starten' },
            { status: 500 }
        );
    }
}
