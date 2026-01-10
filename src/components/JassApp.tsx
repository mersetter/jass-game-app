'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Pusher from 'pusher-js';
import { GameState, Player, PlayedCard, Suit, SUITS } from '@/lib/types';
import { Lobby } from './Lobby';
import { GameTable } from './GameTable';
import {
    dealCards,
    getTrickWinner,
    calculateTrickPoints,
    isValidMove,
    getBotMove,
    sortHand
} from '@/lib/game-engine';

// Pusher Events
const EVENTS = {
    PLAYER_JOINED: 'player-joined',
    PLAYER_LEFT: 'player-left',
    GAME_STARTED: 'game-started',
    CARD_PLAYED: 'card-played',
    GAME_STATE: 'game-state',
    REQUEST_STATE: 'request-state',
};

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
    // Identity
    const [roomId, setRoomId] = useState<string | null>(null);
    const [playerId, setPlayerId] = useState<string | null>(null);
    const [playerName, setPlayerName] = useState<string>('');

    // Game State (managed client-side)
    const [gameState, setGameState] = useState<GameState | null>(null);

    // UI State
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notification, setNotification] = useState<string | null>(null);

    // Refs for callbacks
    const gameStateRef = useRef(gameState);
    const playerIdRef = useRef(playerId);

    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);

    useEffect(() => {
        playerIdRef.current = playerId;
    }, [playerId]);

    // Check if current player is host
    const isHost = gameState?.hostId === playerId;

    // Show notification temporarily
    const showNotification = useCallback((message: string) => {
        setNotification(message);
        setTimeout(() => setNotification(null), 3000);
    }, []);

    // Broadcast state to all players (host only)
    const broadcastState = useCallback(async (state: GameState, event: string = EVENTS.GAME_STATE) => {
        if (!roomId) return;
        try {
            await fetch('/api/pusher/trigger', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roomId,
                    event,
                    data: { state },
                }),
            });
        } catch (err) {
            console.error('Failed to broadcast:', err);
        }
    }, [roomId]);

    // Subscribe to Pusher channel
    useEffect(() => {
        if (!roomId) return;

        const pusher = getPusher();
        const channel = pusher.subscribe(`jass-room-${roomId}`);

        // Handle incoming state updates (for non-hosts)
        channel.bind(EVENTS.GAME_STATE, (data: { state: GameState }) => {
            // Only non-hosts accept state updates
            if (!isHost || !gameStateRef.current) {
                setGameState(data.state);
            }
        });

        channel.bind(EVENTS.PLAYER_JOINED, (data: { player: Player; state: GameState }) => {
            setGameState(data.state);
            if (data.player.id !== playerIdRef.current) {
                showNotification(`${data.player.name} ist beigetreten!`);
            }
        });

        channel.bind(EVENTS.GAME_STARTED, (data: { state: GameState }) => {
            setGameState(data.state);
            showNotification('Spiel gestartet! 🎮');
        });

        channel.bind(EVENTS.CARD_PLAYED, (data: { state: GameState; playerId: string }) => {
            setGameState(data.state);
        });

        // Host responds to state requests from joining players
        channel.bind(EVENTS.REQUEST_STATE, () => {
            if (isHost && gameStateRef.current) {
                broadcastState(gameStateRef.current);
            }
        });

        return () => {
            channel.unbind_all();
            pusher.unsubscribe(`jass-room-${roomId}`);
        };
    }, [roomId, isHost, showNotification, broadcastState]);

    // Create a new room
    const handleCreateRoom = async (name: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/room', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerName: name }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Fehler beim Erstellen');
            }

            // Create initial game state
            const initialState: GameState = {
                roomId: data.roomId,
                status: 'LOBBY',
                players: [{
                    id: data.playerId,
                    name: data.playerName,
                    team: 1,
                    hand: [],
                    isBot: false,
                    isConnected: true,
                }],
                trump: null,
                trick: [],
                currentTurn: 0,
                scores: { team1: 0, team2: 0 },
                roundScores: { team1: 0, team2: 0 },
                hostId: data.playerId,
            };

            setRoomId(data.roomId);
            setPlayerId(data.playerId);
            setPlayerName(data.playerName);
            setGameState(initialState);

            // Broadcast initial state
            setTimeout(() => broadcastState(initialState), 500);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
        } finally {
            setIsLoading(false);
        }
    };

    // Join an existing room
    const handleJoinRoom = async (code: string, name: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/room/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId: code, playerName: name }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Fehler beim Beitreten');
            }

            setRoomId(data.roomId);
            setPlayerId(data.playerId);
            setPlayerName(data.playerName);

            // Create player object
            const newPlayer: Player = {
                id: data.playerId,
                name: data.playerName,
                team: 2, // Will be adjusted by host
                hand: [],
                isBot: false,
                isConnected: true,
            };

            // Broadcast join request - host will add player and broadcast new state
            await fetch('/api/pusher/trigger', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roomId: data.roomId,
                    event: EVENTS.PLAYER_JOINED,
                    data: { player: newPlayer, requestJoin: true },
                }),
            });

            // Wait a moment then request current state
            setTimeout(async () => {
                await fetch('/api/pusher/trigger', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        roomId: data.roomId,
                        event: EVENTS.REQUEST_STATE,
                        data: {},
                    }),
                });
            }, 1000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle player join request (host only)
    useEffect(() => {
        if (!roomId || !isHost) return;

        const pusher = getPusher();
        const channel = pusher.channel(`jass-room-${roomId}`);
        if (!channel) return;

        const handleJoinRequest = (data: { player: Player; requestJoin?: boolean }) => {
            if (!data.requestJoin || !gameStateRef.current) return;

            const state = gameStateRef.current;
            if (state.status !== 'LOBBY') return;
            if (state.players.length >= 4) return;
            if (state.players.some(p => p.id === data.player.id)) return;

            // Assign team
            const team = (state.players.length % 2) + 1 as 1 | 2;
            const newPlayer = { ...data.player, team };

            const newState: GameState = {
                ...state,
                players: [...state.players, newPlayer],
            };

            setGameState(newState);
            broadcastState(newState);

            // Also send player joined notification
            fetch('/api/pusher/trigger', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roomId,
                    event: EVENTS.PLAYER_JOINED,
                    data: { player: newPlayer, state: newState },
                }),
            });
        };

        channel.bind(EVENTS.PLAYER_JOINED, handleJoinRequest);

        return () => {
            channel.unbind(EVENTS.PLAYER_JOINED, handleJoinRequest);
        };
    }, [roomId, isHost, broadcastState]);

    // Start the game (host only)
    const handleStartGame = async () => {
        if (!gameState || !isHost) return;

        // Add bots if needed
        let players = [...gameState.players];
        while (players.length < 4) {
            const botNum = players.length + 1;
            const team = (players.length % 2) + 1 as 1 | 2;
            players.push({
                id: `bot-${botNum}-${Date.now()}`,
                name: `Bot ${botNum}`,
                team,
                hand: [],
                isBot: true,
                isConnected: true,
            });
        }

        // Deal cards
        players = dealCards(players);

        // Random trump
        const trump = SUITS[Math.floor(Math.random() * SUITS.length)];

        const newState: GameState = {
            ...gameState,
            status: 'PLAYING',
            players,
            trump,
            trick: [],
            currentTurn: 0,
            roundScores: { team1: 0, team2: 0 },
        };

        setGameState(newState);

        // Broadcast game started
        await fetch('/api/pusher/trigger', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                roomId,
                event: EVENTS.GAME_STARTED,
                data: { state: newState },
            }),
        });

        // If first player is bot, trigger bot move
        if (newState.players[0].isBot) {
            setTimeout(() => playBotTurn(newState), 1500);
        }
    };

    // Play a card
    const handlePlayCard = async (cardIndex: number) => {
        if (!gameState || !playerId) return;
        if (gameState.status !== 'PLAYING') return;

        const playerIdx = gameState.players.findIndex(p => p.id === playerId);
        if (playerIdx === -1) return;
        if (playerIdx !== gameState.currentTurn) {
            showNotification('Nicht dein Zug!');
            return;
        }

        const player = gameState.players[playerIdx];
        const card = player.hand[cardIndex];
        if (!card) return;

        // Validate move
        if (!isValidMove(card, player.hand, gameState.trick, gameState.trump)) {
            showNotification('Ungültiger Zug!');
            return;
        }

        // Play the card
        const newPlayers = gameState.players.map((p, i) => {
            if (i !== playerIdx) return p;
            return {
                ...p,
                hand: p.hand.filter((_, idx) => idx !== cardIndex),
            };
        });

        const newTrick = [...gameState.trick, { playerId, card }];

        let newState: GameState = {
            ...gameState,
            players: newPlayers,
            trick: newTrick,
            currentTurn: (gameState.currentTurn + 1) % 4,
        };

        // Check if trick is complete
        if (newTrick.length === 4) {
            newState = resolveTrick(newState);
        }

        setGameState(newState);

        // Broadcast
        await fetch('/api/pusher/trigger', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                roomId,
                event: EVENTS.CARD_PLAYED,
                data: { state: newState, playerId },
            }),
        });

        // If next player is bot, trigger bot move
        if (newState.status === 'PLAYING' && newState.players[newState.currentTurn]?.isBot) {
            setTimeout(() => playBotTurn(newState), 1000);
        }
    };

    // Resolve a completed trick
    const resolveTrick = (state: GameState): GameState => {
        const trick = state.trick;
        const winnerIdxInTrick = getTrickWinner(trick, state.trump);
        const winnerPlayerId = trick[winnerIdxInTrick].playerId;
        const winnerPlayerIdx = state.players.findIndex(p => p.id === winnerPlayerId);
        const winnerPlayer = state.players[winnerPlayerIdx];

        const isLastTrick = state.players.every(p => p.hand.length === 0);
        const points = calculateTrickPoints(trick, state.trump, isLastTrick);

        // Update scores
        const newScores = { ...state.scores };
        const newRoundScores = { ...state.roundScores };

        if (winnerPlayer.team === 1) {
            newScores.team1 += points;
            newRoundScores.team1 += points;
        } else {
            newScores.team2 += points;
            newRoundScores.team2 += points;
        }

        let newStatus = state.status;
        if (isLastTrick) {
            newStatus = newScores.team1 >= 1000 || newScores.team2 >= 1000 ? 'GAME_OVER' : 'ROUND_END';
        }

        return {
            ...state,
            trick: [],
            currentTurn: winnerPlayerIdx,
            scores: newScores,
            roundScores: newRoundScores,
            status: newStatus,
            lastTrickWinner: {
                playerName: winnerPlayer.name,
                points,
            },
        };
    };

    // Play bot turn
    const playBotTurn = async (state: GameState) => {
        if (state.status !== 'PLAYING') return;

        const currentPlayer = state.players[state.currentTurn];
        if (!currentPlayer.isBot) return;

        const cardIndex = getBotMove(
            currentPlayer.hand,
            state.trick,
            state.trump,
            state.players,
            state.currentTurn
        );

        const card = currentPlayer.hand[cardIndex];

        // Play the card
        const newPlayers = state.players.map((p, i) => {
            if (i !== state.currentTurn) return p;
            return {
                ...p,
                hand: p.hand.filter((_, idx) => idx !== cardIndex),
            };
        });

        const newTrick = [...state.trick, { playerId: currentPlayer.id, card }];

        let newState: GameState = {
            ...state,
            players: newPlayers,
            trick: newTrick,
            currentTurn: (state.currentTurn + 1) % 4,
        };

        // Check if trick is complete
        if (newTrick.length === 4) {
            // Wait a moment to show full trick
            setGameState({ ...newState });
            await new Promise(r => setTimeout(r, 1500));
            newState = resolveTrick(newState);
        }

        setGameState(newState);

        // Broadcast
        await fetch('/api/pusher/trigger', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                roomId,
                event: EVENTS.CARD_PLAYED,
                data: { state: newState, playerId: currentPlayer.id },
            }),
        });

        // Continue if next is also bot
        if (newState.status === 'PLAYING' && newState.players[newState.currentTurn]?.isBot) {
            setTimeout(() => playBotTurn(newState), 1000);
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
