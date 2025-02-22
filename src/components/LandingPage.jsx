import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/global.css';
import { FaUser, FaPlus } from 'react-icons/fa';

const LandingPage = () => {
  const [taskName, setTaskName] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const navigate = useNavigate();

  const handleCreateRoom = (e) => {
    e.preventDefault();
    if (taskName.trim()) {
      const newRoomId = Math.random().toString(36).substring(2, 8);
      navigate(`/room/${newRoomId}?isCreator=true&task=${encodeURIComponent(taskName)}&description=${encodeURIComponent(taskDescription)}`);
    }
  };

  return (
    <div>
      <header className="app-header">
        <div className="logo-section">
          <img src="/smarttalks.avif" alt="Smart Talks Logo" />
        </div>
        <div className="title-section">
          <h1>Poquer de Planejamento</h1>
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
            <div className="user-icon">
              <FaUser />
            </div>
          </div>
        </div>
      </header>
      
      <div className="container">
        <div className="card" style={{ 
          width: '90%',
          margin: '3rem auto',
          padding: '3rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <h2 style={{ 
            color: 'var(--text-light)', 
            marginBottom: '2rem',
            fontSize: '2.5rem',
            fontWeight: '500'
          }}>
            Criar Novo Jogo
          </h2>
          
          <div style={{
            width: '70%',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}>
            <div className="form-group">
              <label 
                htmlFor="taskName" 
                style={{ 
                  display: 'block', 
                  marginBottom: '0.75rem',
                  color: 'var(--text-light)',
                  fontSize: '1.25rem',
                  fontWeight: '500'
                }}
              >
                Nome da Tarefa:
              </label>
              <input
                className="input-field"
                type="text"
                id="taskName"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="Digite o nome da tarefa"
                required
                style={{
                  width: '100%',
                  padding: '1.2rem',
                  fontSize: '1.1rem',
                  backgroundColor: 'rgba(0, 0, 0, 0.2)'
                }}
              />
            </div>

            <div className="form-group">
              <label 
                htmlFor="taskDescription" 
                style={{ 
                  display: 'block', 
                  marginBottom: '0.75rem',
                  color: 'var(--text-light)',
                  fontSize: '1.25rem',
                  fontWeight: '500'
                }}
              >
                Descrição:
              </label>
              <textarea
                className="input-field"
                id="taskDescription"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Digite a descrição da tarefa"
                style={{ 
                  width: '100%',
                  minHeight: '120px',
                  resize: 'vertical',
                  padding: '1.2rem',
                  fontSize: '1.1rem',
                  backgroundColor: 'rgba(0, 0, 0, 0.2)'
                }}
              />
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginTop: '1rem'
            }}>
              <button 
                type="submit" 
                className="button-primary"
                style={{
                  padding: '1.2rem 4rem',
                  fontSize: '1.2rem',
                  letterSpacing: '1px'
                }}
                onClick={handleCreateRoom}
              >
                CRIAR JOGO
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage; 