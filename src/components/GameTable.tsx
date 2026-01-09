
import React from 'react';
import { Player, PlayedCard, Suit, SUITS, SUIT_SYMBOLS } from '@/lib/jass';
import { Card } from './Card';

interface GameTableProps {
    players: Player[];
    myPlayerId: string;
    trick: PlayedCard[]; // Cards currently on table
    trump: Suit | null;
    currentTurn: number; // player index
    onPlayCard: (cardIdx: number) => void;
    lastTrickWinner?: { name: string, score: number };
}

export function GameTable(props: GameTableProps) {
    const { players, myPlayerId, trick, trump, currentTurn, onPlayCard, lastTrickWinner } = props;

    // Find my index
    const myIndex = players.findIndex(p => p.id === myPlayerId);
    if (myIndex === -1) return <div>Error: Player not found</div>;

    // Helper to get relative position
    const getRelativePos = (idx: number) => (idx - myIndex + 4) % 4;

    // Positions: 0=Bottom, 1=Right, 2=Top, 3=Left
    const getPositionClass = (idx: number) => {
        const rel = getRelativePos(idx);
        switch (rel) {
            case 0: return 'bottom-user';
            case 1: return 'right-player';
            case 2: return 'top-player';
            case 3: return 'left-player';
            default: return '';
        }
    };

    return (
        <div className="relative w-full h-[600px] bg-[var(--table-green)] rounded-xl shadow-inner overflow-hidden border-8 border-[var(--table-green-dark)]">
            {/* Table Texture/Center */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-64 rounded-full border-4 border-white/10 opacity-30"></div>
            </div>

            {/* Trump Indicator */}
            <div className="absolute top-4 left-4 glass p-4 rounded-lg text-white">
                <div className="text-sm uppercase tracking-widest text-white/70 mb-1">Trumpf</div>
                <div className="text-3xl font-bold flex items-center gap-2">
                    {trump ? <span className={trump === 'HEARTS' || trump === 'DIAMONDS' ? 'text-red-500' : 'text-white'}>{SUIT_SYMBOLS[trump]} {trump}</span> : 'Undecided'}
                </div>
            </div>

            {/* Last Trick Info */}
            {lastTrickWinner && (
                <div className="absolute top-4 right-4 glass p-4 rounded-lg text-white text-right animate-fade-in">
                    <div className="text-xs text-white/70">Last Trick</div>
                    <div className="font-bold">{lastTrickWinner.name} (+{lastTrickWinner.score})</div>
                </div>
            )}

            {/* Players */}
            {players.map((p, idx) => {
                const rel = getRelativePos(idx);
                const isMyTurn = currentTurn === idx;

                // Layout styles
                let posStyle: React.CSSProperties = {};
                if (rel === 0) posStyle = { bottom: '20px', left: '50%', transform: 'translateX(-50%)' };
                if (rel === 1) posStyle = { right: '20px', top: '50%', transform: 'translateY(-50%)' }; // Right
                if (rel === 2) posStyle = { top: '20px', left: '50%', transform: 'translateX(-50%)' }; // Top
                if (rel === 3) posStyle = { left: '20px', top: '50%', transform: 'translateY(-50%)' }; // Left

                return (
                    <div key={p.id} className="absolute flex flex-col items-center" style={posStyle}>
                        {/* Avatar/Name */}
                        <div className={`p-2 rounded-lg glass mb-2 transition-all duration-300 ${isMyTurn ? 'ring-2 ring-yellow-400 bg-white/10' : ''}`}>
                            <span className="font-bold">{p.name} {rel === 0 ? '(You)' : ''}</span>
                        </div>

                        {/* Hand */}
                        <div className="flex -space-x-8">
                            {p.hand.map((card, cIdx) => (
                                <div key={`${card.suit}-${card.rank}`} className="transform transition-transform hover:-translate-y-4">
                                    {rel === 0 ? (
                                        <Card
                                            card={card}
                                            onClick={() => isMyTurn && onPlayCard(cIdx)}
                                            disabled={!isMyTurn}
                                            className={isMyTurn ? 'cursor-pointer hover:shadow-yellow-400/50 hover:shadow-lg' : ''}
                                        />
                                    ) : (
                                        // Back of card for others
                                        <div className="playing-card bg-blue-900 border-2 border-white rounded shadow-md w-[60px] h-[84px]"></div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}

            {/* Center (Played Cards) */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48">
                {trick.map((played, idx) => {
                    // Visualize them played in a circle/cross?
                    // Need to map played.playerId to relative position
                    const pIdx = players.findIndex(p => p.id === played.playerId);
                    const rel = getRelativePos(pIdx);

                    let trickStyle: React.CSSProperties = { position: 'absolute', transition: 'all 0.5s ease-out' };
                    if (rel === 0) trickStyle = { bottom: 0, left: '50%', transform: 'translateX(-50%)' };
                    if (rel === 1) trickStyle = { right: 0, top: '50%', transform: 'translateY(-50%) rotate(-90deg)' };
                    if (rel === 2) trickStyle = { top: 0, left: '50%', transform: 'translateX(-50%) rotate(180deg)' };
                    if (rel === 3) trickStyle = { left: 0, top: '50%', transform: 'translateY(-50%) rotate(90deg)' };

                    return (
                        <div key={idx} style={trickStyle}>
                            <Card card={played.card} />
                        </div>
                    );
                })}
            </div>

        </div>
    );
}
