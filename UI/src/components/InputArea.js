import React from 'react';
import { ArrowRight, RotateCcw } from 'lucide-react';

function InputArea({ input, onInputChange, onSendMessage, onReset, loading, showSuggestions, suggestionsComponent }) {
  const inputRef = React.useRef(null);

  // Auto-focus on mount
  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Keep focus after loading finishes
  React.useEffect(() => {
    if (!loading) {
      inputRef.current?.focus();
    }
  }, [loading]);

  const handleSubmit = (e) => {
    onSendMessage(e);
    // Force focus back immediately
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  };

  return (
    <div className="relative w-full">
      {suggestionsComponent && showSuggestions && (
        <div className="absolute bottom-full left-0 right-0 mb-2 z-20">
          {suggestionsComponent}
        </div>
      )}
      <form onSubmit={handleSubmit} className="relative flex items-end gap-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-2 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all shadow-lg">
        {/* Reset Button */}
        <button
          type="button"
          onClick={onReset}
          className="p-3 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          title="Start New Chat"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => {
            onInputChange(e);
            // Auto-resize height
            e.target.style.height = 'auto';
            const newHeight = Math.min(e.target.scrollHeight, 150);
            e.target.style.height = newHeight + 'px';
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder="Type variable, scenario, or question..."
          disabled={loading}
          autoFocus
          rows={1}
          className="flex-1 max-h-[150px] min-h-[44px] py-2.5 px-2 bg-transparent border-0 focus:ring-0 text-white placeholder:text-slate-500 text-base resize-none custom-scrollbar"
        />
        <button
          type="submit"
          disabled={loading || (!input.trim())}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-all shadow-md shrink-0"
        >
          {loading ? (
            <div className="animate-spin h-5 w-5 border-2 border-white/20 border-t-white rounded-full" />
          ) : (
            <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
          )}
        </button>
      </form>
    </div>
  );
}

export default InputArea;
