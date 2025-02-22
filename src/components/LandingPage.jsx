import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const [taskName, setTaskName] = useState('');
  const navigate = useNavigate();

  const handleCreateRoom = (e) => {
    e.preventDefault();
    if (taskName.trim()) {
      const newRoomId = Math.random().toString(36).substring(2, 8);
      // Navigate to the room with isCreator flag and task name
      navigate(`/room/${newRoomId}?isCreator=true&task=${encodeURIComponent(taskName)}`);
    }
  };

  return (
    <div className="landing-page">
      <h1>Planning Poker</h1>
      <div className="create-room-form">
        <h2>Criar Nova Sala</h2>
        <form onSubmit={handleCreateRoom}>
          <div className="form-group">
            <label htmlFor="taskName">Nome da Tarefa:</label>
            <input
              type="text"
              id="taskName"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="Digite o nome da tarefa"
              required
            />
          </div>
          <button type="submit" className="create-room-button">
            Criar Sala
          </button>
        </form>
      </div>
    </div>
  );
};

export default LandingPage; 