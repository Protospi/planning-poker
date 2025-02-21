import React, { useState, useEffect } from 'react';
import VotingCard from './VotingCard';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

const Room = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const isCreator = queryParams.get('isCreator') === 'true';
  const taskName = queryParams.get('task');
  
  const [userName, setUserName] = useState('');
  const [isNameSubmitted, setIsNameSubmitted] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [userVote, setUserVote] = useState(null);
  const [allVotesRevealed, setAllVotesRevealed] = useState(false);
  const [broadcastChannel, setBroadcastChannel] = useState(null);
  const [scrumMasterName, setScrumMasterName] = useState(null);
  const [hasExistingScrumMaster, setHasExistingScrumMaster] = useState(false);

  const pointOptions = [1, 2, 3, 5, 8];
  const isScrumMaster = userName === scrumMasterName;

  // Remove the random room ID generation since rooms are now created from landing page
  useEffect(() => {
    if (!roomId) {
      navigate('/');
    }
  }, [roomId, navigate]);

  // Initialize BroadcastChannel
  useEffect(() => {
    if (roomId) {
      const channel = new BroadcastChannel(`poker-room-${roomId}`);
      setBroadcastChannel(channel);

      // Request current participants when joining
      channel.postMessage({
        type: 'REQUEST_STATE'
      });

      channel.onmessage = (event) => {
        const { type, data } = event.data;
        
        switch (type) {
          case 'REQUEST_STATE':
            // If we're already in the room, send our state
            if (isNameSubmitted) {
              channel.postMessage({
                type: 'SYNC_STATE',
                data: {
                  participants: participants,
                  allVotesRevealed: allVotesRevealed,
                  scrumMasterName: scrumMasterName
                }
              });
            }
            break;

          case 'SYNC_STATE':
            // Update our state with the received state
            if (data.participants.length > 0) {
              // Create a merged list combining received participants and our current list
              const allParticipants = new Set([
                ...data.participants.map(p => JSON.stringify(p)),
                ...participants.map(p => JSON.stringify(p))
              ]);
              
              const updatedParticipants = Array.from(allParticipants).map(p => JSON.parse(p));
              
              setParticipants(updatedParticipants);
              setAllVotesRevealed(data.allVotesRevealed);
              if (data.scrumMasterName) {
                setScrumMasterName(data.scrumMasterName);
                setHasExistingScrumMaster(true);
              }
            }
            break;

          case 'JOIN_ROOM':
            setParticipants(prev => {
              // Don't add duplicates
              if (!prev.find(p => p.name === data.userName)) {
                const newParticipant = { 
                  name: data.userName, 
                  vote: null, 
                  isScrumMaster: data.isScrumMaster 
                };
                
                const updatedParticipants = [...prev, newParticipant];
                
                // If we're already in the room, send our complete state back
                if (isNameSubmitted) {
                  // Small delay to ensure the joining client is ready to receive
                  setTimeout(() => {
                    channel.postMessage({
                      type: 'SYNC_STATE',
                      data: {
                        participants: updatedParticipants,
                        allVotesRevealed: allVotesRevealed,
                        scrumMasterName: scrumMasterName
                      }
                    });
                  }, 100);
                }
                
                return updatedParticipants;
              }
              return prev;
            });
            
            if (data.isScrumMaster) {
              setScrumMasterName(data.userName);
              setHasExistingScrumMaster(true);
            }
            break;

          case 'VOTE':
            setParticipants(prev =>
              prev.map(p => p.name === data.userName ? { ...p, vote: data.vote } : p)
            );
            break;

          case 'REVEAL_VOTES':
            setAllVotesRevealed(true);
            break;

          case 'LEAVE_ROOM':
            setParticipants(prev => 
              prev.filter(p => p.name !== data.userName)
            );
            break;

          default:
            break;
        }
      };

      // Clean up when component unmounts
      return () => {
        if (isNameSubmitted) {
          channel.postMessage({
            type: 'LEAVE_ROOM',
            data: { userName }
          });
        }
        channel.close();
      };
    }
  }, [roomId, isNameSubmitted, userName]);

  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (userName.trim() && broadcastChannel) {
      const trimmedName = userName.trim();
      
      // Check if the name is already taken
      if (participants.some(p => p.name === trimmedName)) {
        alert('This name is already taken. Please choose another name.');
        return;
      }

      setIsNameSubmitted(true);
      
      // Only set as Scrum Master if creator AND no existing Scrum Master
      const shouldBeScrumMaster = isCreator && !hasExistingScrumMaster;
      
      if (shouldBeScrumMaster) {
        setScrumMasterName(trimmedName);
      }

      const newParticipant = { 
        name: trimmedName, 
        vote: null,
        isScrumMaster: shouldBeScrumMaster
      };

      // Add ourselves to participants
      setParticipants(prev => [...prev, newParticipant]);

      // Broadcast our join
      broadcastChannel.postMessage({
        type: 'JOIN_ROOM',
        data: { 
          userName: trimmedName,
          isScrumMaster: shouldBeScrumMaster
        }
      });

      // Request current state from others
      broadcastChannel.postMessage({
        type: 'REQUEST_STATE'
      });
    }
  };

  const handleVote = (points) => {
    if (broadcastChannel) {
      setUserVote(points);
      // Update local state
      setParticipants(prev =>
        prev.map(p => p.name === userName ? { ...p, vote: points } : p)
      );
      // Broadcast vote
      broadcastChannel.postMessage({
        type: 'VOTE',
        data: { userName, vote: points }
      });
    }
  };

  const revealVotes = () => {
    if (broadcastChannel) {
      setAllVotesRevealed(true);
      broadcastChannel.postMessage({
        type: 'REVEAL_VOTES'
      });
    }
  };

  const copyRoomLink = () => {
    const roomLink = window.location.href;
    navigator.clipboard.writeText(roomLink);
    alert('Room link copied to clipboard!');
  };

  // Move calculateAverage inside the component
  const calculateAverage = () => {
    const votes = participants
      .filter(p => p.vote !== null)
      .map(p => p.vote);
    if (votes.length === 0) return '-';
    const average = votes.reduce((a, b) => a + b, 0) / votes.length;
    return average.toFixed(1);
  };

  if (!isNameSubmitted) {
    return (
      <div className="name-entry">
        <h2>{!hasExistingScrumMaster && isCreator ? 'Enter Scrum Master Name' : 'Join the Planning Poker Room'}</h2>
        <form onSubmit={handleNameSubmit}>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder={!hasExistingScrumMaster && isCreator ? "Enter Scrum Master name" : "Enter your name"}
            required
          />
          <button type="submit">
            {!hasExistingScrumMaster && isCreator ? 'Join as Scrum Master' : 'Join Room'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="room">
      <div className="room-header">
        <h2>Planning Poker Room</h2>
        <div className="task-name">
          <h3>Task: {decodeURIComponent(taskName)}</h3>
        </div>
      </div>
      <div className="room-info">
        <button onClick={copyRoomLink} className="share-button">
          Share Room Link
        </button>
        <span className={`role-badge ${isScrumMaster ? 'scrum-master' : 'team-member'}`}>
          {isScrumMaster ? 'Scrum Master' : 'Team Member'}
        </span>
      </div>
      
      <div className="participants">
        <h3>Participants:</h3>
        <ul>
          {participants.map(participant => (
            <li key={participant.name} className="participant-item">
              <div className="participant-info">
                <span className="participant-name">{participant.name}</span>
                <span className={`role-badge ${participant.isScrumMaster ? 'scrum-master' : 'team-member'}`}>
                  {participant.isScrumMaster ? 'Scrum Master' : 'Team Member'}
                </span>
              </div>
              <div className="vote-status">
                {allVotesRevealed ? 
                  (participant.vote !== null ? participant.vote : 'No vote') : 
                  (participant.vote ? '✓' : 'Not voted')}
              </div>
            </li>
          ))}
        </ul>
        {allVotesRevealed && (
          <div className="vote-summary">
            <h4>Voting Results</h4>
            <div className="vote-stats">
              <p>Votes: {participants.filter(p => p.vote !== null).length} / {participants.length}</p>
              <p>Average: {calculateAverage()}</p>
            </div>
          </div>
        )}
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

      {isScrumMaster && !allVotesRevealed && participants.every(p => p.vote !== null) && participants.length > 0 && (
        <button onClick={revealVotes} className="reveal-button">
          Reveal All Votes
        </button>
      )}
    </div>
  );
};

export default Room; 