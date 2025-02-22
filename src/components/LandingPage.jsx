import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/global.css';
import { FaUser } from 'react-icons/fa';

const LandingPage = () => {
  const [taskName, setTaskName] = useState('');
  const navigate = useNavigate();

  const handleCreateRoom = (e) => {
    e.preventDefault();
    if (taskName.trim()) {
      const newRoomId = Math.random().toString(36).substring(2, 8);
      navigate(`/room/${newRoomId}?isCreator=true&task=${encodeURIComponent(taskName)}`);
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
        <div className="user-section">
          {/* Empty div to maintain layout */}
        </div>
      </header>
      
      <div className="container">
        <div className="card">
          <h2 style={{ color: 'var(--primary)', marginBottom: '2rem' }}>Criar Nova Sala</h2>
          <form onSubmit={handleCreateRoom} className="create-room-form">
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label 
                htmlFor="taskName" 
                style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem',
                  color: 'var(--text-dark)',
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
              />
            </div>
            <button type="submit" className="button-primary">
              Criar Sala
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LandingPage; 