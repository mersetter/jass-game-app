
import React from 'react';
import { Card as CardType, SUIT_COLORS, SUIT_SYMBOLS } from '@/lib/jass';

interface CardProps {
    card: CardType;
    onClick?: () => void;
    className?: string;
    disabled?: boolean;
}

export function Card({ card, onClick, className = '', disabled }: CardProps) {
    const color = SUIT_COLORS[card.suit]; // 'red' or 'black'
    const symbol = SUIT_SYMBOLS[card.suit]; // Unicode

    return (
        <div
            className={`playing-card ${color} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={!disabled ? onClick : undefined}
        >
            <div className="card-top">
                <span className="card-rank">{card.rank}</span>
                <span className="card-suit">{symbol}</span>
            </div>
            <div className="card-center">
                {symbol}
            </div>
            <div className="card-bottom">
                <span className="card-rank">{card.rank}</span>
                <span className="card-suit">{symbol}</span>
            </div>
        </div>
    );
}
