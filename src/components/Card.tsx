'use client';

import React from 'react';
import { Card as CardType, SUIT_SYMBOLS, RANK_NAMES } from '@/lib/types';

interface CardProps {
    card: CardType;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    animationDelay?: number;
}

export function Card({ card, onClick, disabled, className = '', animationDelay = 0 }: CardProps) {
    const isRed = card.suit === 'HEARTS' || card.suit === 'DIAMONDS';
    const symbol = SUIT_SYMBOLS[card.suit];
    const rank = RANK_NAMES[card.rank];

    return (
        <div
            className={`playing-card ${isRed ? 'red' : 'black'} ${disabled ? 'disabled' : ''} ${className}`}
            onClick={disabled ? undefined : onClick}
            style={{ animationDelay: `${animationDelay}ms` }}
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-label={`${rank} ${card.suit}`}
        >
            {/* Top left corner */}
            <div className="card-corner">
                <span className="card-rank">{rank}</span>
                <span className="card-suit-small">{symbol}</span>
            </div>

            {/* Center symbol */}
            <span className="card-center">{symbol}</span>

            {/* Bottom right corner (rotated) */}
            <div className="card-corner bottom">
                <span className="card-rank">{rank}</span>
                <span className="card-suit-small">{symbol}</span>
            </div>
        </div>
    );
}

interface CardBackProps {
    className?: string;
}

export function CardBack({ className = '' }: CardBackProps) {
    return <div className={`card-back ${className}`} />;
}
