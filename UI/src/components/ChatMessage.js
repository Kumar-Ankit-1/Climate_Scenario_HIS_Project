import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, CircleUser } from 'lucide-react';

const ChatMessage = ({ message }) => {
  const isUser = message.role === 'user';
  const AvatarIcon = isUser ? CircleUser : Bot;

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div className={`flex max-w-[85%] md:max-w-[75%] gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start`}>

        {/* Avatar */}
        <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-lg relative overflow-hidden transition-all duration-300 ${isUser
          ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
          : 'bg-gradient-to-br from-emerald-400 to-cyan-600 text-white'
          }`}>
          <AvatarIcon className="w-5 h-5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]" strokeWidth={2} />
          {/* Shine Effect */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />
        </div>

        {/* Message Bubble */}
        <div className={`relative group rounded-2xl p-4 shadow-lg text-sm md:text-base leading-relaxed ${isUser
          ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-sm'
          : 'bg-slate-900/80 backdrop-blur-md border border-white/10 text-slate-200 rounded-tl-sm shadow-indigo-500/5'
          }`}>
          {isUser ? (
            <div className="whitespace-pre-wrap font-medium text-white">{message.content}</div>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-slate-950/50 prose-pre:border prose-pre:border-white/10">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
