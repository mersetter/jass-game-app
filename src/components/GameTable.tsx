'use client';

import React from 'react';
import { Player, PlayedCard, Suit, SUIT_SYMBOLS } from '@/lib/types';
import { Card, CardBack } from './Card';

interface GameTableProps {
    players: Player[];
    myPlayerId: string;
    trick: PlayedCard[];
    trump: Suit | null;
    currentTurn: number;
    onPlayCard: (cardIndex: number) => void;
    lastTrickWinner?: { playerName: string; points: number };
    scores: { team1: number; team2: number };
}

export function GameTable({
    players,
    myPlayerId,
    trick,
    trump,
    currentTurn,
    onPlayCard,
    lastTrickWinner,
    scores,
}: GameTableProps) {
    // Find my index
    const myIndex = players.findIndex((p) => p.id === myPlayerId);
    if (myIndex === -1) {
        return <div className="text-center p-8">Lade Spiel...</div>;
    }

    // Get relative position (0=bottom, 1=right, 2=top, 3=left)
    const getRelativePos = (idx: number) => (idx - myIndex + 4) % 4;

    const myPlayer = players[myIndex];
    const isMyTurn = currentTurn === myIndex;

    return (
        <div className="flex flex-col items-center gap-4 w-full max-w-4xl mx-auto p-4">
            {/* Score Panel */}
            <div className="glass score-panel">
                <div className="score-item">
                    <span className="score-label">Wir</span>
                    <span className="score-value team-you">{scores.team1}</span>
                </div>
                <div className="score-item">
                    <span className="score-label">Sie</span>
                    <span className="score-value team-them">{scores.team2}</span>
                </div>
            </div>

            {/* Game Table */}
            <div className="game-table">
                {/* Table center decoration */}
                <div className="table-center" />

                {/* Trump Indicator */}
                <div className="trump-indicator glass">
                    <div className="trump-label">Trumpf</div>
                    <div className={`trump-value ${trump === 'HEARTS' || trump === 'DIAMONDS' ? 'red' : ''}`}>
                        {trump ? (
                            <>
                                <span>{SUIT_SYMBOLS[trump]}</span>
                            </>
                        ) : (
                            'Wähle...'
                        )}
                    </div>
                </div>

                {/* Last Trick Winner */}
                {lastTrickWinner && (
                    <div className="absolute top-4 right-4 glass p-3 rounded-lg animate-fade-in">
                        <div className="text-xs text-muted">Letzter Stich</div>
                        <div className="font-bold">{lastTrickWinner.playerName}</div>
                        <div className="text-emerald-400">+{lastTrickWinner.points}</div>
                    </div>
                )}

                {/* Players around the table */}
                {players.map((player, idx) => {
                    const rel = getRelativePos(idx);
                    const isTurn = currentTurn === idx;
                    const isMe = player.id === myPlayerId;

                    // Position classes
                    const positionClass =
                        rel === 0
                            ? 'bottom'
                            : rel === 1
                                ? 'right'
                                : rel === 2
                                    ? 'top'
                                    : 'left';

                    return (
                        <div key={player.id} className={`player-spot ${positionClass}`}>
                            {/* Player badge */}
                            <div className={`player-badge glass ${isTurn ? 'active' : 'waiting'}`}>
                                {player.name}
                                {isMe && ' (Du)'}
                                {player.isBot && ' 🤖'}
                            </div>

                            {/* Hand - only show for positions that aren't bottom (me) */}
                            {rel !== 0 && (
                                <div className="flex" style={{ gap: '-10px' }}>
                                    {player.hand.map((_, cIdx) => (
                                        <CardBack
                                            key={cIdx}
                                            className="transform hover:scale-105 transition-transform"
                                            // @ts-expect-error we're using style for margin
                                            style={{ marginLeft: cIdx > 0 ? '-15px' : 0 }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Trick Area (Center) */}
                <div className="trick-area">
                    {trick.map((played, idx) => {
                        const pIdx = players.findIndex((p) => p.id === played.playerId);
                        const rel = getRelativePos(pIdx);

                        // Position within trick area
                        const trickPositions: Record<number, React.CSSProperties> = {
                            0: { bottom: 0, left: '50%', transform: 'translateX(-50%)' },
                            1: { right: 0, top: '50%', transform: 'translateY(-50%)' },
                            2: { top: 0, left: '50%', transform: 'translateX(-50%)' },
                            3: { left: 0, top: '50%', transform: 'translateY(-50%)' },
                        };

                        return (
                            <div
                                key={idx}
                                className="absolute animate-play"
                                style={trickPositions[rel]}
                            >
                                <Card card={played.card} disabled />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* My Hand (Bottom) */}
            <div className="hand mt-4">
                {myPlayer.hand.map((card, idx) => (
                    <Card
                        key={`${card.suit}-${card.rank}`}
                        card={card}
                        onClick={() => onPlayCard(idx)}
                        disabled={!isMyTurn}
                        className={isMyTurn ? 'cursor-pointer' : ''}
                        animationDelay={idx * 50}
                    />
                ))}
            </div>

            {/* Turn Indicator */}
            {isMyTurn && (
                <div className="notification info" style={{ position: 'relative', top: 0, transform: 'none', animation: 'none' }}>
                    🎯 Du bist dran! Spiele eine Karte.
                </div>
            )}
        </div>
    );
}
