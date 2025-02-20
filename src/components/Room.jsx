import React, { useState, useEffect } from 'react';
import VotingCard from './VotingCard';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

const SOCKET_SERVER_URL = 'http://localhost:3001';

const Room = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  const [userName, setUserName] = useState('');
  const [isNameSubmitted, setIsNameSubmitted] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [userVote, setUserVote] = useState(null);
  const [allVotesRevealed, setAllVotesRevealed] = useState(false);
  const [error, setError] = useState(null);

  const pointOptions = [1, 2, 3, 5, 8];

  // Generate a random room ID if we're not already in a room
  useEffect(() => {
    if (!roomId) {
      const newRoomId = Math.random().toString(36).substring(2, 8);
      navigate(`/room/${newRoomId}`);
    }
  }, [roomId, navigate]);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(SOCKET_SERVER_URL, {
      transports: ['websocket'],
      cors: {
        origin: "http://localhost:3000"
      }
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setSocket(newSocket);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setError('Failed to connect to server');
    });

    return () => {
      if (newSocket) newSocket.close();
    };
  }, []);

  // Set up socket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('roomUpdate', (updatedParticipants) => {
      console.log('Room update received:', updatedParticipants);
      setParticipants(updatedParticipants);
    });

    socket.on('votesRevealed', () => {
      setAllVotesRevealed(true);
    });

    return () => {
      socket.off('roomUpdate');
      socket.off('votesRevealed');
    };
  }, [socket]);

  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (userName.trim() && socket) {
      setIsNameSubmitted(true);
      socket.emit('joinRoom', {
        roomId,
        userName: userName.trim()
      });
    }
  };

  const handleVote = (points) => {
    if (socket) {
      setUserVote(points);
      socket.emit('vote', {
        roomId,
        userName,
        vote: points
      });
    }
  };

  const revealVotes = () => {
    if (socket) {
      socket.emit('revealVotes', { roomId });
    }
  };

  const copyRoomLink = () => {
    const roomLink = window.location.href;
    navigator.clipboard.writeText(roomLink);
    alert('Room link copied to clipboard!');
  };

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  if (!isNameSubmitted) {
    return (
      <div className="name-entry">
        <h2>Enter your name to join the room</h2>
        <form onSubmit={handleNameSubmit}>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Your name"
            required
          />
          <button type="submit">Join Room</button>
        </form>
      </div>
    );
  }

  return (
    <div className="room">
      <h2>Planning Poker Room</h2>
      <div className="room-info">
        <button onClick={copyRoomLink} className="share-button">
          Share Room Link
        </button>
      </div>
      
      <div className="participants">
        <h3>Participants:</h3>
        <ul>
          {participants.map(participant => (
            <li key={participant.name}>
              {participant.name}: {allVotesRevealed && participant.vote ? participant.vote : participant.vote ? '✓' : 'Not voted'}
            </li>
          ))}
        </ul>
      </div>

      <div className="voting-area">
        <h3>Select your estimate:</h3>
        <div className="voting-cards">
          {pointOptions.map(points => (
            <VotingCard
              key={points}
              points={points}
              selected={userVote === points}
              onClick={() => handleVote(points)}
            />
          ))}
        </div>
      </div>

      {!allVotesRevealed && participants.every(p => p.vote !== null) && participants.length > 0 && (
        <button onClick={revealVotes}>Reveal All Votes</button>
      )}
    </div>
  );
};

export default Room; 