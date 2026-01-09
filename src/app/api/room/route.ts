// ============================================
// JASS.IO - Room API
// POST: Create room, GET: Get room info
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { generateRoomCode } from '@/lib/game-engine';
import { createRoom, getRoom, addPlayer } from '@/lib/game-store';
import { pusherServer, getRoomChannel, PUSHER_EVENTS } from '@/lib/pusher';

// POST /api/room - Create a new room
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

        // Create room
        createRoom(roomId, playerId);

        // Add the creator as first player
        const result = addPlayer(roomId, playerId, playerName.trim());

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            );
        }

        return NextResponse.json({
            roomId,
            playerId,
            state: result.state,
        });
    } catch (error) {
        console.error('Error creating room:', error);
        return NextResponse.json(
            { error: 'Fehler beim Erstellen des Raums' },
            { status: 500 }
        );
    }
}

// GET /api/room?id=ROOMID - Get room info
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const roomId = searchParams.get('id');

        if (!roomId) {
            return NextResponse.json(
                { error: 'Room ID erforderlich' },
                { status: 400 }
            );
        }

        const room = getRoom(roomId);
        if (!room) {
            return NextResponse.json(
                { error: 'Raum nicht gefunden' },
                { status: 404 }
            );
        }

        return NextResponse.json({ state: room });
    } catch (error) {
        console.error('Error getting room:', error);
        return NextResponse.json(
            { error: 'Fehler beim Abrufen des Raums' },
            { status: 500 }
        );
    }
}
