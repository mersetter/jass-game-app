'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Pusher from 'pusher-js';
import { GameState } from '@/lib/types';
import { Lobby } from './Lobby';
import { GameTable } from './GameTable';
import { PUSHER_EVENTS } from '@/lib/pusher';

// Initialize Pusher client
let pusherClient: Pusher | null = null;

function getPusher(): Pusher {
    if (!pusherClient) {
        pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        });
    }
    return pusherClient;
}

export default function JassApp() {
    // State
    const [roomId, setRoomId] = useState<string | null>(null);
    const [playerId, setPlayerId] = useState<string | null>(null);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notification, setNotification] = useState<string | null>(null);

    // Check if current player is host
    const isHost = gameState?.hostId === playerId;

    // Show notification temporarily
    const showNotification = useCallback((message: string) => {
        setNotification(message);
        setTimeout(() => setNotification(null), 3000);
    }, []);

    // Subscribe to Pusher channel
    useEffect(() => {
        if (!roomId) return;

        const pusher = getPusher();
        const channel = pusher.subscribe(`jass-room-${roomId}`);

        channel.bind(PUSHER_EVENTS.PLAYER_JOINED, (data: { state: GameState }) => {
            setGameState(data.state);
            const newPlayer = data.state.players[data.state.players.length - 1];
            if (newPlayer.id !== playerId) {
                showNotification(`${newPlayer.name} ist beigetreten!`);
            }
        });

        channel.bind(PUSHER_EVENTS.GAME_STARTED, (data: { state: GameState }) => {
            setGameState(data.state);
            showNotification('Spiel gestartet! 🎮');
        });

        channel.bind(PUSHER_EVENTS.CARD_PLAYED, (data: { state: GameState }) => {
            setGameState(data.state);
        });

        channel.bind(PUSHER_EVENTS.TRICK_WON, (data: { winner: { playerName: string; points: number }; state: GameState }) => {
            setGameState(data.state);
            showNotification(`${data.winner.playerName} gewinnt den Stich! (+${data.winner.points})`);
        });

        channel.bind(PUSHER_EVENTS.ROUND_END, (data: { state: GameState }) => {
            setGameState(data.state);
            showNotification('Runde beendet!');
        });

        channel.bind(PUSHER_EVENTS.GAME_OVER, (data: { state: GameState }) => {
            setGameState(data.state);
            const winner = data.state.scores.team1 >= 1000 ? 'Team Rot' : 'Team Blau';
            showNotification(`🏆 ${winner} gewinnt das Spiel!`);
        });

        return () => {
            channel.unbind_all();
            pusher.unsubscribe(`jass-room-${roomId}`);
        };
    }, [roomId, playerId, showNotification]);

    // Create a new room
    const handleCreateRoom = async (playerName: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/room', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerName }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Fehler beim Erstellen');
            }

            setRoomId(data.roomId);
            setPlayerId(data.playerId);
            setGameState(data.state);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
        } finally {
            setIsLoading(false);
        }
    };

    // Join an existing room
    const handleJoinRoom = async (code: string, playerName: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/room/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId: code, playerName }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Fehler beim Beitreten');
            }

            setRoomId(code.toUpperCase());
            setPlayerId(data.playerId);
            setGameState(data.state);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
        } finally {
            setIsLoading(false);
        }
    };

    // Start the game
    const handleStartGame = async () => {
        if (!roomId || !playerId) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/game/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId, playerId }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Fehler beim Starten');
            }

            setGameState(data.state);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
        } finally {
            setIsLoading(false);
        }
    };

    // Play a card
    const handlePlayCard = async (cardIndex: number) => {
        if (!roomId || !playerId) return;

        try {
            const response = await fetch('/api/game/play', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId, playerId, cardIndex }),
            });

            const data = await response.json();

            if (!response.ok) {
                showNotification(data.error || 'Ungültiger Zug');
                return;
            }

            setGameState(data.state);
        } catch (err) {
            showNotification('Verbindungsfehler');
        }
    };

    // Render based on game status
    const renderContent = () => {
        if (!gameState || gameState.status === 'LOBBY') {
            return (
                <Lobby
                    roomId={roomId}
                    gameState={gameState}
                    playerId={playerId}
                    isHost={isHost}
                    onCreateRoom={handleCreateRoom}
                    onJoinRoom={handleJoinRoom}
                    onStartGame={handleStartGame}
                    isLoading={isLoading}
                    error={error}
                />
            );
        }

        if (gameState.status === 'PLAYING' || gameState.status === 'ROUND_END') {
            return (
                <GameTable
                    players={gameState.players}
                    myPlayerId={playerId!}
                    trick={gameState.trick}
                    trump={gameState.trump}
                    currentTurn={gameState.currentTurn}
                    onPlayCard={handlePlayCard}
                    lastTrickWinner={gameState.lastTrickWinner}
                    scores={gameState.scores}
                />
            );
        }

        if (gameState.status === 'GAME_OVER') {
            const winner = gameState.scores.team1 >= 1000 ? 1 : 2;
            const myTeam = gameState.players.find((p) => p.id === playerId)?.team;
            const didWin = myTeam === winner;

            return (
                <div className="lobby-container">
                    <div className="glass-card p-8 text-center">
                        <div className="text-6xl mb-4">{didWin ? '🏆' : '😢'}</div>
                        <h1 className="text-headline mb-2">
                            {didWin ? 'Gewonnen!' : 'Verloren!'}
                        </h1>
                        <p className="text-muted mb-6">
                            Team {winner === 1 ? 'Rot' : 'Blau'} gewinnt mit{' '}
                            {winner === 1 ? gameState.scores.team1 : gameState.scores.team2} Punkten!
                        </p>
                        <div className="flex gap-6 justify-center mb-6">
                            <div className="score-item">
                                <span className="score-label">Team Rot</span>
                                <span className="score-value team-you">{gameState.scores.team1}</span>
                            </div>
                            <div className="score-item">
                                <span className="score-label">Team Blau</span>
                                <span className="score-value team-them">{gameState.scores.team2}</span>
                            </div>
                        </div>
                        <button
                            className="btn btn-primary btn-lg"
                            onClick={() => {
                                setRoomId(null);
                                setPlayerId(null);
                                setGameState(null);
                            }}
                        >
                            Neues Spiel
                        </button>
                    </div>
                </div>
            );
        }

        return null;
    };

    return (
        <main className="min-h-screen">
            {renderContent()}

            {/* Global Notification */}
            {notification && (
                <div className="notification success">{notification}</div>
            )}
        </main>
    );
}
