// ============================================
// JASS.IO - Room API (Stateless)
// Uses Pusher for state synchronization
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { generateRoomCode } from '@/lib/game-engine';

// POST /api/room - Create a new room (just generate IDs)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { playerName } = body;

        if (!playerName || typeof playerName !== 'string') {
            return NextResponse.json(
                { error: 'Spielername erforderlich' },
                { status: 400 }
            );
        }

        // Generate unique room ID and player ID
        const roomId = generateRoomCode();
        const playerId = uuidv4();

        // Return IDs - client will manage state
        return NextResponse.json({
            roomId,
            playerId,
            playerName: playerName.trim(),
        });
    } catch (error) {
        console.error('Error creating room:', error);
        return NextResponse.json(
            { error: 'Fehler beim Erstellen des Raums' },
            { status: 500 }
        );
    }
}
