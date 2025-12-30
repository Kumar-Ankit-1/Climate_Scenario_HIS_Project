import React, { useState } from 'react';
import ChatInterface from './components/ChatInterface';
import LandingPage from './components/LandingPage';
import ManualProcess from './components/ManualProcess/ManualProcess';
import SmartSuggestions from './components/SmartSuggestions/SmartSuggestions';
import './App.css';

function App() {
  const [view, setView] = useState('landing'); // 'landing' | 'chat' | 'manual' | 'smart_suggestions'
  const [initialData, setInitialData] = useState(null);

  const handleShowDataProviders = (data) => {
    setInitialData(data);
    setView('manual');
  };

  return (
    <div className="app">
      {view === 'landing' && (
        <LandingPage
          onStart={() => setView('chat')}
          onManual={() => {
            setInitialData(null);
            setView('manual');
          }}
          onSmartSuggestions={() => setView('smart_suggestions')}
        />
      )}
      {view === 'chat' && (
        <ChatInterface
          onBack={() => setView('landing')}
          onCompare={() => {
            setInitialData(null);
            setView('manual');
          }}
        />
      )}
      {view === 'manual' && (
        <ManualProcess
          onBack={() => setView('landing')}
          initialData={initialData}
        />
      )}
      {view === 'smart_suggestions' && (
        <SmartSuggestions
          onBack={() => setView('landing')}
          onShowDataProviders={handleShowDataProviders}
        />
      )}
    </div>
  );
}

export default App;
