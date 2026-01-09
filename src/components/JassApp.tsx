
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    createDeck, Player, Card, Suit, PlayedCard, Mode,
    getTrickWinner, isValidMove, getCardValue
} from '@/lib/jass';
import { GameTable } from './GameTable';

// Constants
const DELAY_BETWEEN_TRICKS = 2000;
const BOT_THINK_TIME = 1000;

export default function JassApp() {
    const [gameState, setGameState] = useState<'LOBBY' | 'PLAYING' | 'FINISHED'>('LOBBY');
    const [players, setPlayers] = useState<Player[]>([]);
    const [myPlayerId, setMyPlayerId] = useState<string>('me');
    const [trump, setTrump] = useState<Suit | null>(null);
    const [trick, setTrick] = useState<PlayedCard[]>([]);
    const [currentTurn, setCurrentTurn] = useState<number>(0);
    const [lastTrickWinner, setLastTrickWinner] = useState<{ name: string, score: number } | undefined>(undefined);
    const [scores, setScores] = useState<{ team1: number, team2: number }>({ team1: 0, team2: 0 }); // Team 1: P0 & P2, Team 2: P1 & P3

    const [notification, setNotification] = useState<string>('');

    // LOBBY: Setup game
    const startGame = (type: 'vs_bots' | 'online') => {
        if (type === 'vs_bots') {
            const newPlayers: Player[] = [
                { id: 'me', name: 'You', isBot: false, hand: [], team: 1 },
                { id: 'bot1', name: 'Hansi (Bot)', isBot: true, hand: [], team: 2 },
                { id: 'bot2', name: 'Fritz (Partner)', isBot: true, hand: [], team: 1 },
                { id: 'bot3', name: 'Ruedi (Bot)', isBot: true, hand: [], team: 2 },
            ];
            setPlayers(newPlayers);
            startRound(newPlayers);
        } else {
            // Online scaffold - not fully implemented in this demo
            alert("Online multiplayer requires a backend server. Starting vs Bots for demo.");
            startGame('vs_bots');
        }
    };

    const startRound = (currentPlayers: Player[]) => {
        const deck = createDeck();

        // Distribute 9 cards each
        const updatedPlayers = currentPlayers.map((p, idx) => ({
            ...p,
            hand: deck.slice(idx * 9, (idx + 1) * 9).sort((a, b) => a.suit.localeCompare(b.suit)) // Simple sort
        }));

        setPlayers(updatedPlayers);
        setGameState('PLAYING');
        setTrick([]);
        setCurrentTurn(0); // Player 0 starts

        // Choose Trump Randomly for now
        const suits: Suit[] = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'];
        const randomTrump = suits[Math.floor(Math.random() * suits.length)];
        setTrump(randomTrump);
        setNotification(`Trump is ${randomTrump}!`);
    };

    // Turn orchestration
    useEffect(() => {
        if (gameState !== 'PLAYING') return;

        // Check if trick is full
        if (trick.length === 4) {
            const timer = setTimeout(() => {
                resolveTrick();
            }, DELAY_BETWEEN_TRICKS);
            return () => clearTimeout(timer);
        }

        // Check if current player is Bot
        const player = players[currentTurn];
        if (player && player.isBot && trick.length < 4) {
            const timer = setTimeout(() => {
                playBotTurn(player);
            }, BOT_THINK_TIME);
            return () => clearTimeout(timer);
        }
    }, [gameState, currentTurn, trick, players]);

    const playBotTurn = (bot: Player) => {
        // Simple logic: Valid moves
        const validMoves = bot.hand.map((c, idx) => ({ card: c, idx })).filter(m => isValidMove(m.card, bot.hand, trick, trump));

        if (validMoves.length === 0) {
            console.error("Bot has no valid moves? Logic error.");
            return;
        }

        // Pick random valid move (or improving logic: play highest if winning, lowest if losing)
        const move = validMoves[Math.floor(Math.random() * validMoves.length)];
        handlePlayCard(currentTurn, move.idx);
    };

    const handlePlayCard = (playerIdx: number, cardIdx: number) => {
        const player = players[playerIdx];
        const card = player.hand[cardIdx];

        if (!isValidMove(card, player.hand, trick, trump)) {
            setNotification("Invalid Move! Must follow suit.");
            return;
        }
        setNotification("");

        // Update Player Hand (Remove card)
        const newHand = [...player.hand];
        newHand.splice(cardIdx, 1);
        const newPlayers = [...players];
        newPlayers[playerIdx] = { ...player, hand: newHand };
        setPlayers(newPlayers);

        // Add to Trick
        const newTrick = [...trick, { playerId: player.id, card }];
        setTrick(newTrick);

        // Next Turn (if trick not full)
        if (newTrick.length < 4) {
            setCurrentTurn((currentTurn + 1) % 4);
        }
    };

    const resolveTrick = () => {
        const leadSuit = trick[0].card.suit;
        // Calculate winner
        // Winner is relative index in trick. trick[0] is who started the trick.
        // getTrickWinner returns index in the TRICK array.
        // We need to map that back to player index.
        // Actually, trick contains PlayedCard { playerId }.

        const winnerIdxInTrick = getTrickWinner(trick, trump, leadSuit);
        const winnerCard = trick[winnerIdxInTrick];
        const winnerPlayerIdx = players.findIndex(p => p.id === winnerCard.playerId);

        // Calculate Points
        const points = trick.reduce((sum, p) => sum + getCardValue(p.card, trump, 'TRUMP'), 0) + (players[0].hand.length === 0 ? 5 : 0); // +5 for last match? logic check.
        // Usually +5 is for the *last trick of the round*.
        // Check if hand is empty AFTER this trick. Yes, if hands are empty now.

        // Update Score
        const winnerTeam = players[winnerPlayerIdx].team;
        setScores(prev => ({
            ...prev,
            [winnerTeam === 1 ? 'team1' : 'team2']: prev[winnerTeam === 1 ? 'team1' : 'team2'] + points
        }));

        setLastTrickWinner({ name: players[winnerPlayerIdx].name, score: points });

        // Winner starts next trick
        setTrick([]);
        setCurrentTurn(winnerPlayerIdx);

        // Check if round finished
        if (players[0].hand.length === 0) {
            setNotification("Round Finished!");
            setGameState('FINISHED');
        }
    };

    // Rendering
    if (gameState === 'LOBBY') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
                <h1 className="text-6xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-white">
                    Jass.io
                </h1>
                <div className="flex gap-4">
                    <button onClick={() => startGame('vs_bots')} className="btn btn-primary text-xl px-8 py-4">
                        Play vs Bots
                    </button>
                    <button onClick={() => startGame('online')} className="btn btn-outline text-xl px-8 py-4">
                        Create Online Game
                    </button>
                </div>
            </div>
        );
    } else if (gameState === 'FINISHED') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
                <h1 className="text-4xl mb-4">Game Over</h1>
                <div className="text-2xl mb-8 grid grid-cols-2 gap-8">
                    <div className="glass p-8 rounded text-center">
                        <div className="text-gray-400">Team You</div>
                        <div className="text-6xl font-bold text-green-400">{scores.team1}</div>
                    </div>
                    <div className="glass p-8 rounded text-center">
                        <div className="text-gray-400">Team Opponents</div>
                        <div className="text-6xl font-bold text-red-400">{scores.team2}</div>
                    </div>
                </div>
                <button onClick={() => setGameState('LOBBY')} className="btn btn-primary">Back to Menu</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-900 flex flex-col p-4">
            {/* Header */}
            <div className="flex justify-between items-center mb-4 glass p-4 rounded-lg">
                <div className="font-bold text-xl">PRO JASS</div>
                <div className="flex gap-8 text-xl font-mono">
                    <div className="text-green-400">WE: {scores.team1}</div>
                    <div className="text-red-400">THEY: {scores.team2}</div>
                </div>
                <div>{notification && <span className="text-yellow-400 animate-pulse">{notification}</span>}</div>
            </div>

            {/* Game Table */}
            <div className="flex-grow flex items-center justify-center">
                <GameTable
                    players={players}
                    myPlayerId={myPlayerId}
                    trick={trick}
                    trump={trump}
                    currentTurn={currentTurn}
                    onPlayCard={(cIdx) => handlePlayCard(players.findIndex(p => p.id === myPlayerId), cIdx)}
                    lastTrickWinner={lastTrickWinner}
                />
            </div>
        </div>
    );
}
