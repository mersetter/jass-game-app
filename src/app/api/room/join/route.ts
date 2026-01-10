// ============================================
// JASS.IO - Join Room API (Stateless)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// POST /api/room/join - Join a room (just validate and generate player ID)
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

        return NextResponse.json({
            success: true,
            playerId,
            roomId: roomId.toUpperCase(),
            playerName: playerName.trim(),
        });
    } catch (error) {
        console.error('Error joining room:', error);
        return NextResponse.json(
            { error: 'Fehler beim Beitreten' },
            { status: 500 }
        );
    }
}
