import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Room from './components/Room';
import './styles/Room.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/room/:roomId" element={<Room />} />
          <Route path="/" element={<Room />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
