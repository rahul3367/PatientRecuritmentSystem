import React from 'react';
import { formatPercent } from '../../utils/formatters';

export function MatchScoreBadge({ score, isRadial = false, size = 64, showLabel = true }) {
  const numericScore = typeof score === 'number' ? score : parseFloat(score) || 0;
  
  let scoreCategory = 'match-score-low';
  let strokeColor = '#e11d48'; // Danger

  if (numericScore >= 90.0) {
    scoreCategory = 'match-score-high';
    strokeColor = '#059669'; // Emerald
  } else if (numericScore >= 60.0) {
    scoreCategory = 'match-score-mid';
    strokeColor = '#d97706'; // Amber
  }

  if (isRadial) {
    const strokeWidth = 5;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (numericScore / 100) * circumference;

    return (
      <div className="score-circle" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <div className="score-circle-text">
          <span style={{ fontSize: size * 0.26, color: 'var(--slate-900)' }}>
            {numericScore.toFixed(0)}%
          </span>
          {showLabel && size >= 70 && (
            <span style={{ fontSize: size * 0.13, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Match
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <span className={`match-score-pill ${scoreCategory}`}>
      <span>{formatPercent(numericScore, 1)}</span>
      {showLabel && <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', opacity: 0.85 }}>MATCH</span>}
    </span>
  );
}
