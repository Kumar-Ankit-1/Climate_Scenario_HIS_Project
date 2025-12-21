import React from 'react';
import './ChatMessage.css';

function ChatMessage({ message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`message ${isUser ? 'user-message' : 'bot-message'}`}>
      <div className="message-content">
        {isUser ? (
          <div className="user-text">{message.content}</div>
        ) : (
          <div className="bot-text">{message.content}</div>
        )}
      </div>
    </div>
  );
}

export default ChatMessage;
