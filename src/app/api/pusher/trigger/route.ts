// ============================================
// JASS.IO - Pusher Broadcast API
// Triggers events to all room members
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { pusherServer, getRoomChannel } from '@/lib/pusher';

// POST /api/pusher/trigger - Broadcast event to room
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { roomId, event, data } = body;

        if (!roomId || !event) {
            return NextResponse.json(
                { error: 'roomId and event required' },
                { status: 400 }
            );
        }

        // Trigger the event to all subscribers
        await pusherServer.trigger(
            getRoomChannel(roomId),
            event,
            data
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error triggering pusher event:', error);
        return NextResponse.json(
            { error: 'Pusher trigger failed' },
            { status: 500 }
        );
    }
}
