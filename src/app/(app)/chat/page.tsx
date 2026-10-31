'use client';

import { useState } from 'react';
import { Send, Plus, Bot, User, Loader2 } from 'lucide-react';

export default function ChatPage() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([]);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!message.trim() || loading) return;
    const userMsg = message;
    setMessages([...messages, { role: 'user', content: userMsg }]);
    setMessage('');
    setLoading(true);
    
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, { role: 'user', content: userMsg }], model: 'kilo-auto/free' })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.content || 'Response received' }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error: Failed to get response' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">AI Chat</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg">
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 bg-zinc-900 rounded-xl border border-zinc-800">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-zinc-500">
            <div className="text-center">
              <Bot className="w-12 h-12 mx-auto mb-4" />
              <p>Start a conversation with the Ultra AI Super App</p>
              <p className="text-sm mt-2">Multi-model • Agent-powered • REA Integrated</p>
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
              )}
              <div className={`max-w-[70%] p-4 rounded-xl ${msg.role === 'user' ? 'bg-purple-600' : 'bg-zinc-800'}`}>
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5" />
                </div>
              )}
            </div>
          ))
        )}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div className="bg-zinc-800 p-4 rounded-xl">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type your message..."
          disabled={loading}
          className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-none focus:border-purple-500 disabled:opacity-50"
        />
        <button onClick={handleSend} disabled={loading} className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl disabled:opacity-50">
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
