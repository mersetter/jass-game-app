'use client';

import React, { useState } from 'react';
import { GameState, Player } from '@/lib/types';

interface LobbyProps {
    roomId: string | null;
    gameState: GameState | null;
    playerId: string | null;
    isHost: boolean;
    onCreateRoom: (playerName: string) => void;
    onJoinRoom: (roomId: string, playerName: string) => void;
    onStartGame: () => void;
    isLoading: boolean;
    error: string | null;
}

export function Lobby({
    roomId,
    gameState,
    playerId,
    isHost,
    onCreateRoom,
    onJoinRoom,
    onStartGame,
    isLoading,
    error,
}: LobbyProps) {
    const [mode, setMode] = useState<'home' | 'create' | 'join'>('home');
    const [playerName, setPlayerName] = useState('');
    const [joinCode, setJoinCode] = useState('');

    // If in a room, show lobby
    if (roomId && gameState) {
        return (
            <div className="lobby-container">
                {/* Logo */}
                <div className="logo">
                    <span className="logo-swiss">🇨🇭</span>
                    <h1 className="text-display logo-text">JASS.IO</h1>
                </div>

                {/* Room Code */}
                <div className="glass-card p-8 flex flex-col items-center gap-6">
                    <div className="text-caption">Raum Code</div>
                    <div className="room-code">{roomId}</div>
                    <p className="text-muted text-center">
                        Teile diesen Code mit deinen Freunden
                    </p>

                    {/* Players Grid */}
                    <div className="players-grid">
                        {[0, 1, 2, 3].map((slot) => {
                            const player = gameState.players[slot];
                            return (
                                <div
                                    key={slot}
                                    className={`player-slot ${player ? 'filled' : 'empty'}`}
                                >
                                    {player ? (
                                        <>
                                            <div className="player-name">
                                                {player.name}
                                                {player.id === playerId && ' (Du)'}
                                                {player.isBot && ' 🤖'}
                                            </div>
                                            <div className="player-team">
                                                Team {player.team === 1 ? 'Rot' : 'Blau'}
                                            </div>
                                        </>
                                    ) : (
                                        <span>Wartet...</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Start Button (Host only) */}
                    {isHost && (
                        <button
                            className="btn btn-primary btn-lg w-full"
                            onClick={onStartGame}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <span className="spinner" />
                            ) : gameState.players.length < 4 ? (
                                `Spiel starten (mit ${4 - gameState.players.length} Bot${4 - gameState.players.length > 1 ? 's' : ''
                                })`
                            ) : (
                                'Spiel starten!'
                            )}
                        </button>
                    )}

                    {!isHost && (
                        <div className="text-muted text-center">
                            Warte bis der Host das Spiel startet...
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Home Screen
    if (mode === 'home') {
        return (
            <div className="lobby-container">
                {/* Logo */}
                <div className="logo">
                    <span className="logo-swiss">🇨🇭</span>
                    <h1 className="text-display logo-text">JASS.IO</h1>
                    <p className="text-muted mt-2">Schweizer Kartenspiel Online</p>
                </div>

                {/* Buttons */}
                <div className="flex flex-col gap-4 w-full max-w-xs">
                    <button
                        className="btn btn-primary btn-lg"
                        onClick={() => setMode('create')}
                    >
                        🎮 Neues Spiel
                    </button>
                    <button
                        className="btn btn-secondary btn-lg"
                        onClick={() => setMode('join')}
                    >
                        🔗 Spiel beitreten
                    </button>
                </div>

                {/* Footer */}
                <div className="text-caption mt-8">Online Multiplayer • Schieber Jass</div>
            </div>
        );
    }

    // Create Room Screen
    if (mode === 'create') {
        return (
            <div className="lobby-container">
                <div className="logo">
                    <span className="logo-swiss">🇨🇭</span>
                    <h1 className="text-headline logo-text">Neues Spiel</h1>
                </div>

                <div className="glass-card p-8 flex flex-col gap-6 w-full max-w-md">
                    <div>
                        <label className="text-caption mb-2 block">Dein Name</label>
                        <input
                            type="text"
                            className="input input-lg"
                            placeholder="z.B. Hans"
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value)}
                            maxLength={20}
                            autoFocus
                        />
                    </div>

                    {error && (
                        <div className="text-red-400 text-center">{error}</div>
                    )}

                    <div className="flex gap-3">
                        <button
                            className="btn btn-secondary flex-1"
                            onClick={() => setMode('home')}
                        >
                            Zurück
                        </button>
                        <button
                            className="btn btn-primary flex-1"
                            onClick={() => onCreateRoom(playerName)}
                            disabled={!playerName.trim() || isLoading}
                        >
                            {isLoading ? <span className="spinner" /> : 'Erstellen'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Join Room Screen
    if (mode === 'join') {
        return (
            <div className="lobby-container">
                <div className="logo">
                    <span className="logo-swiss">🇨🇭</span>
                    <h1 className="text-headline logo-text">Spiel beitreten</h1>
                </div>

                <div className="glass-card p-8 flex flex-col gap-6 w-full max-w-md">
                    <div>
                        <label className="text-caption mb-2 block">Raum Code</label>
                        <input
                            type="text"
                            className="input input-lg text-center"
                            placeholder="ABC123"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                            maxLength={6}
                            autoFocus
                            style={{ letterSpacing: '0.25em', fontFamily: 'monospace' }}
                        />
                    </div>

                    <div>
                        <label className="text-caption mb-2 block">Dein Name</label>
                        <input
                            type="text"
                            className="input input-lg"
                            placeholder="z.B. Hans"
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value)}
                            maxLength={20}
                        />
                    </div>

                    {error && (
                        <div className="text-red-400 text-center">{error}</div>
                    )}

                    <div className="flex gap-3">
                        <button
                            className="btn btn-secondary flex-1"
                            onClick={() => setMode('home')}
                        >
                            Zurück
                        </button>
                        <button
                            className="btn btn-gold flex-1"
                            onClick={() => onJoinRoom(joinCode, playerName)}
                            disabled={!playerName.trim() || joinCode.length < 6 || isLoading}
                        >
                            {isLoading ? <span className="spinner" /> : 'Beitreten'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
