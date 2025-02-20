import React from 'react';

const VotingCard = ({ points, selected, onClick }) => {
  return (
    <div 
      className={`voting-card ${selected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <span>{points}</span>
    </div>
  );
};

export default VotingCard; 