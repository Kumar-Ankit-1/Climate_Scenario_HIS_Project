import React from 'react';
import './InputArea.css';

function InputArea({ input, onInputChange, onSendMessage, loading, showSuggestions, suggestionsComponent }) {
  return (
    <div className="input-area">
      {suggestionsComponent && showSuggestions && (
        <div className="suggestions-wrapper">
          {suggestionsComponent}
        </div>
      )}
      <form onSubmit={onSendMessage} className="input-form">
        <input
          type="text"
          value={input}
          onChange={onInputChange}
          placeholder="Type variable name, scenario, or ask a question..."
          disabled={loading}
          className="message-input"
        />
        <button
          type="submit"
          disabled={loading || (!input.trim())}
          className="send-button"
        >
          {loading ? '⏳' : '📤'}
        </button>
      </form>
    </div>
  );
}

export default InputArea;
