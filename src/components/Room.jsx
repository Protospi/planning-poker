import React, { useState, useEffect } from 'react';
import VotingCard from './VotingCard';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import '../styles/global.css';
import { FaUser } from 'react-icons/fa';

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

          case 'RESET_VOTES':
            setAllVotesRevealed(false);
            setUserVote(null);
            setParticipants(prev =>
              prev.map(p => ({ ...p, vote: null }))
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
    if (broadcastChannel && !allVotesRevealed) {
      setUserVote(points);
      setParticipants(prev =>
        prev.map(p => p.name === userName ? { ...p, vote: points } : p)
      );
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

  const resetVotes = () => {
    if (broadcastChannel) {
      setAllVotesRevealed(false);
      setUserVote(null);
      setParticipants(prev =>
        prev.map(p => ({ ...p, vote: null }))
      );
      
      broadcastChannel.postMessage({
        type: 'RESET_VOTES'
      });
    }
  };

  if (!isNameSubmitted) {
    return (
      <div>
        <header className="app-header">
          <div className="logo-section">
            <img src="/smarttalks.avif" alt="Smart Talks Logo" />
          </div>
          <div className="title-section">
            <h1>Poquer de Planejamento</h1>
          </div>
          <div className="user-section">
            {/* Empty div to maintain layout */}
          </div>
        </header>
        
        <div className="container">
          <div className="card">
            <h2 style={{ color: 'var(--primary)', marginBottom: '2rem' }}>
              {!hasExistingScrumMaster && isCreator ? 'Digite o Nome do Scrum Master' : 'Entre na Sala de Planning Poker'}
            </h2>
            <form onSubmit={handleNameSubmit}>
              <input
                className="input-field"
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder={!hasExistingScrumMaster && isCreator ? "Digite o nome do Scrum Master" : "Digite seu nome"}
                required
              />
              <button type="submit" className="button-primary" style={{ marginTop: '1rem' }}>
                {!hasExistingScrumMaster && isCreator ? 'Entrar como Scrum Master' : 'Entrar na Sala'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="app-header">
        <div className="logo-section">
          <img src="/smarttalks.avif" alt="Smart Talks Logo" />
        </div>
        <div className="title-section">
          <h1>Poquer de Planejamento</h1>
        </div>
        <div className="user-section">
          <span>{userName}</span>
          <div className="user-icon">
            <FaUser />
          </div>
        </div>
      </header>

      <div className="container">
        <div className="card">
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '2rem'
          }}>
            <h2 style={{ color: 'var(--primary)', margin: 0 }}>
              Tarefa: {decodeURIComponent(taskName)}
            </h2>
            <button onClick={copyRoomLink} className="button-primary">
              Compartilhar Link da Sala
            </button>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 2fr',
            gap: '2rem'
          }}>
            <div className="participants-section">
              <h3 style={{ color: 'var(--primary)' }}>Participantes</h3>
              <ul style={{ 
                listStyle: 'none', 
                padding: 0,
                margin: 0 
              }}>
                {participants.map(participant => (
                  <li key={participant.name} style={{
                    background: 'var(--background)',
                    padding: '1rem',
                    borderRadius: '8px',
                    marginBottom: '0.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <span>{participant.name}</span>
                      <span style={{
                        background: participant.isScrumMaster ? 'var(--primary)' : 'var(--primary-light)',
                        color: 'white',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        marginLeft: '0.5rem'
                      }}>
                        {participant.isScrumMaster ? 'Scrum Master' : 'Membro do Time'}
                      </span>
                    </div>
                    <div style={{ color: 'var(--primary)' }}>
                      {allVotesRevealed ? 
                        (participant.vote !== null ? participant.vote : 'Sem voto') : 
                        (participant.vote ? '✓' : 'Não votou')}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="voting-section">
              <h3 style={{ color: 'var(--primary)' }}>Sua Estimativa</h3>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                gap: '1rem',
                marginTop: '1rem',
                opacity: allVotesRevealed ? '0.6' : '1'
              }}>
                {pointOptions.map(points => (
                  <button
                    key={points}
                    onClick={() => handleVote(points)}
                    disabled={allVotesRevealed}
                    style={{
                      background: userVote === points ? 'var(--gradient-1)' : 'white',
                      color: userVote === points ? 'white' : 'var(--primary)',
                      border: `2px solid ${userVote === points ? 'transparent' : 'var(--primary)'}`,
                      borderRadius: '8px',
                      padding: '1rem',
                      fontSize: '1.2rem',
                      fontWeight: 'bold',
                      cursor: allVotesRevealed ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      opacity: allVotesRevealed ? '0.7' : '1'
                    }}
                  >
                    {points}
                  </button>
                ))}
              </div>

              {allVotesRevealed && (
                <div style={{
                  background: 'var(--gradient-1)',
                  color: 'white',
                  padding: '1.5rem',
                  borderRadius: '8px',
                  marginTop: '2rem'
                }}>
                  <h4 style={{ margin: '0 0 1rem 0' }}>Resultado da Votação</h4>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', gap: '2rem' }}>
                      <p style={{ margin: 0 }}>Votos: {participants.filter(p => p.vote !== null).length} / {participants.length}</p>
                      <p style={{ margin: 0 }}>Média: {calculateAverage()}</p>
                    </div>
                    {isScrumMaster && (
                      <button 
                        onClick={resetVotes} 
                        className="button-secondary"
                      >
                        Nova Votação
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {isScrumMaster && !allVotesRevealed && participants.every(p => p.vote !== null) && participants.length > 0 && (
            <button 
              onClick={revealVotes} 
              className="button-primary"
              style={{ marginTop: '2rem', width: '100%' }}
            >
              Revelar Todos os Votos
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Room; 