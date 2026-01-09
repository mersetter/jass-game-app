// ============================================
// JASS.IO - Join Room API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { addPlayer, getRoom } from '@/lib/game-store';
import { pusherServer, getRoomChannel, PUSHER_EVENTS } from '@/lib/pusher';

// POST /api/room/join - Join an existing room
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { roomId, playerName } = body;

        if (!roomId || typeof roomId !== 'string') {
            return NextResponse.json(
                { error: 'Room ID erforderlich' },
                { status: 400 }
            );
        }

        if (!playerName || typeof playerName !== 'string') {
            return NextResponse.json(
                { error: 'Spielername erforderlich' },
                { status: 400 }
            );
        }

        // Generate player ID
        const playerId = uuidv4();

        // Try to join
        const result = addPlayer(roomId.toUpperCase(), playerId, playerName.trim());

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            );
        }

        // Broadcast to room that a player joined
        await pusherServer.trigger(
            getRoomChannel(roomId),
            PUSHER_EVENTS.PLAYER_JOINED,
            { state: result.state }
        );

        return NextResponse.json({
            success: true,
            playerId,
            state: result.state,
        });
    } catch (error) {
        console.error('Error joining room:', error);
        return NextResponse.json(
            { error: 'Fehler beim Beitreten' },
            { status: 500 }
        );
    }
}
