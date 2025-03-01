import React, { useState, useEffect } from 'react';
import VotingCard from './VotingCard';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import '../styles/global.css';
import { FaUser, FaPlus } from 'react-icons/fa';

const Room = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [userName, setUserName] = useState('');
  const [isNameSubmitted, setIsNameSubmitted] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [userVote, setUserVote] = useState(null);
  const [allVotesRevealed, setAllVotesRevealed] = useState(false);
  const [broadcastChannel, setBroadcastChannel] = useState(null);
  const [scrumMasterName, setScrumMasterName] = useState(null);
  const [hasExistingScrumMaster, setHasExistingScrumMaster] = useState(false);
  const [aiParticipant, setAiParticipant] = useState({
    name: 'Izi',
    vote: null,
    isScrumMaster: false,
    explanation: null
  });
  const [gameStarted, setGameStarted] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [taskDescription, setTaskDescription] = useState('');

  const pointOptions = [1, 2, 3, 5, 8];
  const isScrumMaster = userName === scrumMasterName;

  // First, let's add these color variables at the top of the component
  const tagColors = {
    scrumMaster: '#ff6b6b',  // light red
    teamMember: '#69db7c',   // light green
    ai: 'var(--primary-light)'  // keeping purple for AI
  };

  // New function to fetch room data
  const fetchRoomData = async () => {
    try {
      // First fetch room details
      const roomResponse = await fetch('http://localhost:8000/api/scrumpoker/getRoom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roomId })
      });

      if (!roomResponse.ok) {
        throw new Error('Failed to fetch room data');
      }

      const roomData = await roomResponse.json();
      
      // Update task details
      setTaskName(roomData.taskName || '');
      setTaskDescription(roomData.taskDescription || '');
      
      // Update participants state with fetched data
      const updatedParticipants = roomData.votes.map(vote => ({
        name: vote.participant,
        vote: vote.value,
        isScrumMaster: vote.tag === 'SCRUM_MASTER',
        explanation: vote.explanation
      }));

      setParticipants(updatedParticipants);

      // Update other states based on fetched data
      const userParticipant = updatedParticipants.find(p => p.name === userName);
      if (userParticipant) {
        setUserVote(userParticipant.vote);
      }

      const scrumMaster = updatedParticipants.find(p => p.isScrumMaster);
      if (scrumMaster) {
        setScrumMasterName(scrumMaster.name);
        setHasExistingScrumMaster(true);
      }
    } catch (error) {
      console.error('Error fetching room data:', error);
    }
  };

  // Add useEffect to fetch data when component mounts and after votes
  useEffect(() => {
    if (isNameSubmitted) {
      fetchRoomData();
    }
  }, [isNameSubmitted]);

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

          case 'AI_JOINED_AND_VOTED':
            setParticipants(prev => {
              if (!prev.some(p => p.name === 'Izi')) {
                return [...prev, data.aiParticipant];
              }
              return prev;
            });
            break;

          case 'GAME_STARTED':
            setGameStarted(true);
            break;

          case 'PARTICIPANT_JOINED':
            if (isNameSubmitted) {
              fetchRoomData();
            }
            break;

          case 'VOTE_UPDATED':
            if (isNameSubmitted) {
              fetchRoomData();
            }
            break;

          case 'VOTES_REVEALED':
            if (isNameSubmitted) {
              fetchRoomData();
              setAllVotesRevealed(true);
            }
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

  // Modify handleVote to fetch updated data after voting
  const handleVote = async (points) => {
    if (!allVotesRevealed && gameStarted) {
      try {
        const response = await fetch('http://localhost:8000/api/scrumpoker/vote', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            roomId,
            participant: userName,
            vote: points
          })
        });

        if (!response.ok) {
          throw new Error('Failed to save vote');
        }

        // Get updated room data
        await fetchRoomData();

        // Broadcast to update other clients
        broadcastChannel.postMessage({
          type: 'VOTE_UPDATED',
          data: { roomId }
        });
      } catch (error) {
        console.error('Error saving vote:', error);
        alert('Failed to save vote. Please try again.');
      }
    }
  };

  // Modify AI voting effect
  useEffect(() => {
    const handleAIVoting = async () => {
      // Only the Scrum Master should trigger AI voting
      if (gameStarted &&
          !allVotesRevealed && 
          isScrumMaster &&  // Add this condition
          participants.length > 0 &&
          !participants.some(p => p.name === 'Izi') &&
          participants.every(p => p.name !== 'Izi' && p.vote !== null)) {

        try {
          const aiVoteResponse = await fetch('http://localhost:8000/api/scrumpoker/aiVote', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              roomId
            })
          });

          if (!aiVoteResponse.ok) {
            throw new Error('Failed to save AI vote');
          }

          const aiVoteData = await aiVoteResponse.json();
          
          const aiWithVote = {
            name: 'Izi',
            vote: aiVoteData.vote,
            isScrumMaster: false,
            explanation: aiVoteData.explanation,
            id: 'ai-participant'  // Add unique ID for AI
          };

          // Broadcast first
          if (broadcastChannel) {
            broadcastChannel.postMessage({
              type: 'AI_JOINED_AND_VOTED',
              data: { aiParticipant: aiWithVote }
            });
          }

          // Then update local state
          setParticipants(prev => {
            if (!prev.some(p => p.name === 'Izi')) {
              return [...prev, aiWithVote];
            }
            return prev;
          });

        } catch (error) {
          console.error('Error in AI voting process:', error);
        }
      }
    };

    handleAIVoting();
  }, [participants, gameStarted, allVotesRevealed, isScrumMaster, broadcastChannel, roomId]);

  const handleNameSubmit = async (e) => {
    e.preventDefault();
    if (userName.trim()) {
      const trimmedName = userName.trim();

      try {
        // First check if there are any existing participants
        const roomResponse = await fetch('http://localhost:8000/api/scrumpoker/getRoom', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ roomId })
        });

        if (!roomResponse.ok) {
          throw new Error('Failed to get room data');
        }

        const roomData = await roomResponse.json();
        const shouldBeScrumMaster = roomData.votes.length === 0; // First person becomes Scrum Master

        // Save participant to backend
        const response = await fetch('http://localhost:8000/api/scrumpoker/participant', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            roomId,
            participant: {
              name: trimmedName,
              role: shouldBeScrumMaster ? 'SCRUM_MASTER' : 'TEAM_MEMBER',
              vote: null
            }
          })
        });

        if (!response.ok) {
          throw new Error('Failed to save participant');
        }

        // Get updated room data
        await fetchRoomData();
        setIsNameSubmitted(true);

        if (shouldBeScrumMaster) {
          setScrumMasterName(trimmedName);
        }

        // Broadcast join to update other clients
        broadcastChannel.postMessage({
          type: 'PARTICIPANT_JOINED',
          data: { roomId }
        });

      } catch (error) {
        console.error('Error:', error);
        alert('Failed to join room. Please try again.');
      }
    }
  };

  const revealVotes = async () => {
    try {
      // Get final room data including AI vote
      const response = await fetch('http://localhost:8000/api/scrumpoker/getRoom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roomId })
      });

      if (!response.ok) {
        throw new Error('Failed to get final votes');
      }

      const roomData = await response.json();
      
      // Update local state with final data - make sure to include explanation
      const updatedParticipants = roomData.votes.map(vote => ({
        name: vote.participant,
        vote: vote.value,
        isScrumMaster: vote.tag === 'SCRUM_MASTER',
        explanation: vote.explanation
      }));

      setParticipants(updatedParticipants);
      setAllVotesRevealed(true);

      // Broadcast to update other clients
      broadcastChannel.postMessage({
        type: 'VOTES_REVEALED',
        data: { roomId }
      });
    } catch (error) {
      console.error('Error revealing votes:', error);
      alert('Failed to reveal votes. Please try again.');
    }
  };

  const copyRoomLink = () => {
    const roomLink = window.location.href;
    navigator.clipboard.writeText(roomLink);
    alert('Room link copied to clipboard!');
  };

  // Modify calculateAverage inside the component
  const calculateAverage = () => {
    const votes = participants
      .filter(p => p.vote !== null)
      .map(p => p.vote);
    if (votes.length === 0) return '-';
    
    const average = votes.reduce((a, b) => a + b, 0) / votes.length;
    
    // Round to nearest point value
    const pointOptions = [1, 2, 3, 5, 8];
    const roundedAverage = Math.round(average);
    
    // Find the closest valid point value
    const closestPoint = pointOptions.reduce((prev, curr) => {
      return Math.abs(curr - average) < Math.abs(prev - average) ? curr : prev;
    });
    
    return closestPoint.toString();
  };

  const resetVotes = async () => {
    if (broadcastChannel) {
      try {
        // Call backend to clean votes
        const response = await fetch('http://localhost:8000/api/scrumpoker/cleanVotes', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ roomId })
        });

        if (!response.ok) {
          throw new Error('Failed to clean votes');
        }

        // Update local state
        setAllVotesRevealed(false);
        setUserVote(null);
        setParticipants(prev =>
          prev.map(p => ({ ...p, vote: null }))
        );
        setAiParticipant(prev => ({
          ...prev,
          vote: null,
          explanation: null
        }));
        
        // Broadcast to update other clients
        broadcastChannel.postMessage({
          type: 'RESET_VOTES'
        });
        fetchRoomData();
      } catch (error) {
        console.error('Error cleaning votes:', error);
        alert('Failed to clean votes. Please try again.');
      }
    }
  };

  const startGame = () => {
    setGameStarted(true);
    broadcastChannel.postMessage({
      type: 'GAME_STARTED'
    });
  };

  if (!isNameSubmitted) {
    return (
      <div>
        <header className="app-header">
          <div className="logo-section">
            <img src="/smarttalks.avif" alt="Smart Talks Logo" />
          </div>
          <div className="title-section">
            <h1 style={{ color: 'var(--primary-light)' }}>Pôquer de Planejamento</h1>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2rem'
          }}>
            <button 
              onClick={() => navigate('/')} 
              className="button-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.8rem 1.2rem',
                fontSize: '0.9rem',
                letterSpacing: '0.5px'
              }}
            >
              <span>Novo jogo</span>
              <FaPlus />
            </button>
            <div className="user-section">
              <span>{userName || ''}</span>
              <div className="user-icon">
                <FaUser />
              </div>
            </div>
          </div>
        </header>
        
        <div className="container">
          <div className="card name-entry-card" style={{ 
            maxWidth: '500px', 
            margin: '4rem auto',
            textAlign: 'center',
            padding: '3rem'
          }}>
            <h2 style={{ 
              color: 'var(--text-light)', 
              marginBottom: '2rem',
              fontSize: '1.8rem' 
            }}>
              {!hasExistingScrumMaster ? 'Digite seu nome para entrar como Scrum Master' : 'Digite seu nome para entrar como membro do time'}
            </h2>
            <form onSubmit={handleNameSubmit} style={{ 
              maxWidth: '320px', 
              margin: '0 auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%'
            }}>
              <input
                className="input-field"
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder={!hasExistingScrumMaster ? "Digite seu nome" : "Digite seu nome"}
                required
                style={{
                  textAlign: 'center',
                  fontSize: '1.1rem',
                  padding: '1rem',
                  width: '100%'
                }}
              />
              <button 
                type="submit" 
                className="button-primary" 
                style={{ 
                  marginTop: '1.5rem',
                  width: 'auto',
                  padding: '1rem 2rem',
                  fontSize: '1.1rem'
                }}
              >
                {!hasExistingScrumMaster ? 'Entrar no Jogo' : 'Entrar no Jogo'}
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
          <h1 style={{ color: 'var(--primary-light)' }}>Pôquer de Planejamento</h1>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2rem'
        }}>
          <button 
            onClick={() => navigate('/')} 
            className="button-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.8rem 1.2rem',
              fontSize: '0.9rem',
              letterSpacing: '0.5px'
            }}
          >
            <span>Novo jogo</span>
            <FaPlus />
          </button>
          <div className="user-section">
            <span>{userName}</span>
            <div className="user-icon">
              <FaUser />
            </div>
          </div>
        </div>
      </header>

      <div className="container">
        <div className="card">
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
            }}>
              <h1 style={{ color: 'var(--primary-light)', margin: 0, fontSize: '1.6rem' }}>
                 {decodeURIComponent(taskName)}
              </h1>
              <button onClick={copyRoomLink} className="button-primary">
                Compartilhar Link da Sala
              </button>
            </div>
            
            {taskDescription && (
              <div style={{
                background: 'var(--background)',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)'
              }}>
                <h3 style={{ 
                  color: 'var(--text-light)',
                  margin: '0 0 0.5rem 0',
                  fontSize: '1rem'
                }}>
                </h3>
                <p style={{ 
                  margin: 0,
                  color: 'var(--text-light)',
                  whiteSpace: 'pre-wrap',
                  fontSize: '1.2rem'
                }}>
                  {decodeURIComponent(taskDescription)}
                </p>
              </div>
            )}
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
                  <li key={participant.id || participant.name + '-' + Math.random()} style={{
                    background: 'var(--background)',
                    padding: '1rem',
                    borderRadius: '8px',
                    marginBottom: '0.5rem',
                    display: 'flex',
                    fontSize: '1.2rem',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingRight: '1rem'
                  }}>
                    <div>
                      <span>{participant.name}</span>
                      <span style={{
                        background: participant.name === 'Izi' ? tagColors.ai :
                                   participant.isScrumMaster ? tagColors.scrumMaster :
                                   tagColors.teamMember,
                        color: 'white',
                        padding: '0.2rem 0.5rem 0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '1rem',
                        marginLeft: '0.5rem'
                      }}>
                        {participant.name === 'Izi' ? 'IA' :
                         participant.isScrumMaster ? 'Scrum Master' :
                         'Membro do Time'}
                      </span>
                    </div>
                    <div style={{ color: 'var(--primary-light)', fontSize: '1.3rem' }}>
                      {allVotesRevealed ? 
                        (participant.vote !== null ? participant.vote : 'Sem voto') : 
                        (participant.vote ? '✓' : 'Não votou')}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="voting-section">
              <h3 style={{ color: 'var(--primary)' }}>Estimativa de Esforço</h3>
              {isScrumMaster && !gameStarted && (
                <div style={{ marginBottom: '2rem' }}>
                  <button 
                    onClick={startGame} 
                    className="button-primary"
                    style={{
                      width: '100%',
                      padding: '1rem',
                      fontSize: '1.2rem'
                    }}
                  >
                    Iniciar Votação
                  </button>
                </div>
              )}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                gap: '1rem',
                marginTop: '1rem',
                opacity: !gameStarted || allVotesRevealed ? '0.6' : '1'
              }}>
                {pointOptions.map(points => (
                  <button
                    key={points}
                    onClick={() => handleVote(points)}
                    disabled={!gameStarted || allVotesRevealed}
                    style={{
                      background: userVote === points ? 'var(--gradient-1)' : 'white',
                      color: userVote === points ? 'white' : 'var(--primary)',
                      border: `2px solid ${userVote === points ? 'transparent' : 'var(--primary)'}`,
                      borderRadius: '8px',
                      padding: '1rem',
                      fontSize: '1.3rem',
                      fontWeight: 'bold',
                      cursor: !gameStarted || allVotesRevealed ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      opacity: !gameStarted || allVotesRevealed ? '0.7' : '1'
                    }}
                  >
                    {points}
                  </button>
                ))}
              </div>

              {gameStarted && !allVotesRevealed && (
                <div style={{
                  marginTop: '1rem',
                  textAlign: 'center',
                  color: 'var(--text-light)'
                }}>
                  {participants.some(p => p.vote === null) ? 
                    'Aguardando votos dos participantes...' : 
                    participants.some(p => p.name === 'Izi') ?
                      'Todos votaram! Aguardando Scrum Master revelar os votos.' :
                      'IA está analisando e votando...'}
                </div>
              )}

              {allVotesRevealed && (
                <div style={{
                  background: 'var(--primary-light)',
                  color: 'white',
                  padding: '1.5rem',
                  borderRadius: '8px',
                  marginTop: '2rem',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <h3 style={{ margin: '0 0 1rem 0' }}>Resultado da Votação</h3>
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: '1rem'
                  }}>
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
                          style={{
                            backgroundColor: 'var(--background)',  // This is the black background
                            color: 'var(--text-light)',           // Light text color
                            border: '1px solid var(--border-color)', // Optional border
                            padding: '0.5rem 1rem',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          Nova Votação
                        </button>
                      )}
                    </div>
                    
                    {/* Show AI explanation */}
                    {participants.some(p => p.name === 'Izi') && (
                      <div style={{
                        background: 'rgba(255,255,255,0.15)',
                        padding: '1.5rem',
                        borderRadius: '8px',
                        marginTop: '1rem'
                      }}>
                        <h4 style={{ 
                          margin: '0 0 0.5rem 0',
                          color: 'white',
                          fontSize: '1.2rem'
                        }}>
                          Análise da IA
                        </h4>
                        <p style={{ 
                          margin: 0,
                          fontSize: '1.1rem',
                          lineHeight: '1.5'
                        }}>
                          {participants.find(p => p.name === 'Izi')?.explanation || 'Aguardando análise...'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {isScrumMaster && gameStarted && !allVotesRevealed && 
            participants.every(p => p.name !== 'Izi' && p.vote !== null) && (
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