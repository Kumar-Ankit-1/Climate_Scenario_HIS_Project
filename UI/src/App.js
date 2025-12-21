import React, { useState } from 'react';
import ChatInterface from './components/ChatInterface';
import LandingPage from './components/LandingPage';
import ManualProcess from './components/ManualProcess/ManualProcess';
import './App.css';

function App() {
  const [view, setView] = useState('landing'); // 'landing' | 'chat' | 'manual'

  return (
    <div className="app">
      {view === 'landing' && (
        <LandingPage
          onStart={() => setView('chat')}
          onManual={() => setView('manual')}
        />
      )}
      {view === 'chat' && (
        <ChatInterface onBack={() => setView('landing')} />
      )}
      {view === 'manual' && (
        <ManualProcess onBack={() => setView('landing')} />
      )}
    </div>
  );
}

export default App;
