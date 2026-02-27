/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Send, Menu, Plus, MessageSquare, X, Activity, Clock, Coins, ChevronDown, Bot, Zap, Timer, Copy, Download, Brain, Flame, Rocket, Sparkles, Check, RefreshCw, AlertTriangle, CheckCheck, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const AI_LEVELS = [
  { id: 'very-fast', name: 'Very Fast', model: 'gemini-flash-lite-latest', inPrice: 0.075, outPrice: 0.30, icon: Zap, color: 'text-yellow-400', desc: 'Lowest latency, basic tasks' },
  { id: 'fast', name: 'Fast', model: 'gemini-2.5-flash', inPrice: 0.075, outPrice: 0.30, icon: Zap, color: 'text-amber-400', desc: 'Balanced speed and capability' },
  { id: 'medium', name: 'Medium', model: 'gemini-2.5-pro', inPrice: 1.25, outPrice: 5.00, icon: Brain, color: 'text-blue-400', desc: 'High reasoning, standard speed' },
  { id: 'hard', name: 'Hard', model: 'gemini-3-flash-preview', inPrice: 0.075, outPrice: 0.30, icon: Flame, color: 'text-orange-400', desc: 'Advanced reasoning, fast' },
  { id: 'extreme', name: 'Extreme', model: 'gemini-3-pro-preview', inPrice: 1.25, outPrice: 5.00, icon: Rocket, color: 'text-purple-400', desc: 'Maximum capability, complex tasks' },
  { id: 'new', name: 'New', model: 'gemini-3.1-pro-preview', inPrice: 1.25, outPrice: 5.00, icon: Sparkles, color: 'text-emerald-400', desc: 'Latest experimental model' },
];

type MessageStatus = 'sending' | 'sent' | 'processing' | 'done' | 'error';

type Message = {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  tokens?: { prompt: number; candidates: number; total: number };
  cost?: number;
  duration?: number; // in milliseconds
  status: MessageStatus;
};

type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
};

const CodeBlock = ({ node, inline, className, children, ...props }: any) => {
  const match = /language-(\w+)/.exec(className || '');
  const lang = match ? match[1] : '';
  const codeString = String(children).replace(/\n$/, '');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([codeString], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `snippet.${lang || 'txt'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!inline && match) {
    return (
      <div className="relative group rounded-xl overflow-hidden my-4 border border-zinc-800 bg-zinc-950 shadow-lg">
        <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
          <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">{lang}</span>
          <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <button onClick={handleCopy} className="p-2 md:p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all active:scale-95" title="Copy">
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button onClick={handleDownload} className="p-2 md:p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all active:scale-95" title="Download">
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="p-4 overflow-x-auto text-sm text-zinc-300 bg-transparent m-0 border-0 custom-scrollbar">
          <code className={className} {...props}>
            {children}
          </code>
        </div>
      </div>
    );
  }
  return <code className={`${className} bg-zinc-800 px-1.5 py-0.5 rounded-md text-blue-300 font-mono text-[0.9em]`} {...props}>{children}</code>;
};

export default function App() {
  const [balance, setBalance] = useState<number>(2.0000);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string>('fast');
  const [showLevelSelector, setShowLevelSelector] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize first conversation if empty
  useEffect(() => {
    if (conversations.length === 0) {
      createNewConversation();
    }
  }, []);

  const createNewConversation = () => {
    const newConv: Conversation = {
      id: `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: 'New Conversation',
      messages: [],
      updatedAt: Date.now()
    };
    setConversations(prev => [newConv, ...prev]);
    setActiveId(newConv.id);
    setSidebarOpen(false);
  };

  const activeConversation = conversations.find(c => c.id === activeId);
  const selectedLevelObj = AI_LEVELS.find(l => l.id === selectedLevel) || AI_LEVELS[1];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages, isLoading]);

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const runAI = async (convId: string, history: Message[]) => {
    setIsLoading(true);
    const modelMessageId = `model-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const emptyModelMessage: Message = { id: modelMessageId, role: 'model', text: '', timestamp: Date.now(), status: 'processing' };

    setConversations(prev => prev.map(c => c.id === convId ? {
      ...c,
      messages: [...c.messages, emptyModelMessage]
    } : c));

    const startTime = Date.now();

    try {
      const contents = history.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const config: any = {
        systemInstruction: "You are INEX Agent, an advanced AI assistant. Format your responses using markdown.",
      };

      const stream = await ai.models.generateContentStream({
        model: selectedLevelObj.model,
        contents: contents,
        config: config
      });

      let currentText = '';
      let pTokens = 0;
      let cTokens = 0;

      for await (const chunk of stream) {
        if (chunk.text) {
          currentText += chunk.text;
        }

        // @ts-ignore
        if (chunk.usageMetadata) {
          // @ts-ignore
          pTokens = chunk.usageMetadata.promptTokenCount || pTokens;
          // @ts-ignore
          cTokens = chunk.usageMetadata.candidatesTokenCount || cTokens;
        }

        setConversations(prev => prev.map(c => {
          if (c.id === convId) {
            return {
              ...c,
              messages: c.messages.map(m => m.id === modelMessageId ? { 
                ...m, 
                text: currentText,
                status: 'processing'
              } : m)
            };
          }
          return c;
        }));
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Estimate tokens if API didn't provide them
      if (pTokens === 0) {
        pTokens = Math.ceil(contents.reduce((acc, c) => acc + c.parts[0].text.length, 0) / 4);
      }
      if (cTokens === 0) {
        cTokens = Math.ceil(currentText.length / 4);
      }

      const totalTokens = pTokens + cTokens;
      const cost = (pTokens * (selectedLevelObj.inPrice / 1000000)) + (cTokens * (selectedLevelObj.outPrice / 1000000));

      setBalance(prev => Math.max(0, prev - cost));

      setConversations(prev => prev.map(c => {
        if (c.id === convId) {
          return {
            ...c,
            messages: c.messages.map(m => m.id === modelMessageId ? { 
              ...m, 
              text: currentText,
              tokens: { prompt: pTokens, candidates: cTokens, total: totalTokens },
              cost: cost,
              duration: duration,
              status: 'done'
            } : m)
          };
        }
        return c;
      }));

    } catch (error) {
      console.error("Error sending message:", error);
      setConversations(prev => prev.map(c => {
        if (c.id === convId) {
          return {
            ...c,
            messages: c.messages.map(m => m.id === modelMessageId ? { 
              ...m, 
              text: 'An error occurred while generating the response. Please try again or select a different model.',
              status: 'error'
            } : m)
          };
        }
        return c;
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !activeId) return;

    const userText = input.trim();
    const timestamp = Date.now();
    const userMessageId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const userMessage: Message = { id: userMessageId, role: 'user', text: userText, timestamp, status: 'sending' };

    let currentConv = conversations.find(c => c.id === activeId);
    if (!currentConv) return;

    const updatedMessages = [...currentConv.messages, userMessage];
    
    setConversations(prev => prev.map(c => c.id === activeId ? {
      ...c,
      messages: updatedMessages,
      updatedAt: timestamp,
      title: c.messages.length === 0 ? userText.slice(0, 30) + (userText.length > 30 ? '...' : '') : c.title
    } : c));
    
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Simulate network delay for user message 'sent' status
    setTimeout(() => {
      setConversations(prev => prev.map(c => c.id === activeId ? {
        ...c,
        messages: c.messages.map(m => m.id === userMessageId ? { ...m, status: 'sent' } : m)
      } : c));
    }, 300);

    await runAI(activeId, updatedMessages);
  };

  const handleRegenerate = async (msgId: string) => {
    if (isLoading || !activeId) return;
    const currentConv = conversations.find(c => c.id === activeId);
    if (!currentConv) return;

    const msgIndex = currentConv.messages.findIndex(m => m.id === msgId);
    if (msgIndex === -1) return;

    // We want to regenerate this model message. So we take history up to the message BEFORE this one.
    const history = currentConv.messages.slice(0, msgIndex);
    
    // Remove the error message
    setConversations(prev => prev.map(c => c.id === activeId ? {
      ...c,
      messages: history
    } : c));

    await runAI(activeId, history);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const StatusIcon = ({ status, role }: { status: MessageStatus, role: 'user' | 'model' }) => {
    if (role === 'user') {
      if (status === 'sending') return <Clock className="w-3 h-3 text-blue-300" />;
      if (status === 'sent') return <CheckCheck className="w-3.5 h-3.5 text-blue-300" />;
      return null;
    } else {
      if (status === 'processing') return <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />;
      if (status === 'error') return <AlertTriangle className="w-3 h-3 text-red-400" />;
      if (status === 'done') return <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />;
      return null;
    }
  };

  return (
    <div className="flex h-[100dvh] w-full bg-black text-zinc-100 font-sans overflow-hidden selection:bg-blue-500/30">
      
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <div className={`fixed md:relative z-50 w-[80%] max-w-[300px] md:w-72 h-full bg-zinc-950 border-r border-zinc-900 flex flex-col transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-4 border-b border-zinc-900 flex items-center justify-between shrink-0 pt-safe">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/20">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-white">INEX Agent</h1>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden p-2 -mr-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 active:bg-zinc-800">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-3 shrink-0">
          <button 
            onClick={createNewConversation} 
            className="w-full flex items-center justify-center gap-2 bg-zinc-100 hover:bg-white text-black py-2.5 rounded-xl font-medium transition-colors active:scale-95"
          >
            <Plus className="w-4 h-4" /> New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-1 pb-4 custom-scrollbar">
          <div className="px-3 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Conversations</div>
          {conversations.map((conv) => (
            <button 
              key={conv.id} 
              onClick={() => { setActiveId(conv.id); setSidebarOpen(false); }} 
              className={`w-full text-left px-3 py-3 rounded-xl text-sm truncate transition-all flex items-center gap-3 ${activeId === conv.id ? 'bg-zinc-900 text-white shadow-sm border border-zinc-800' : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200 border border-transparent active:bg-zinc-900'}`}
            >
              <MessageSquare className={`w-4 h-4 shrink-0 ${activeId === conv.id ? 'text-blue-400' : 'opacity-70'}`} />
              <span className="truncate text-[15px] md:text-sm">{conv.title}</span>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-zinc-900 bg-zinc-950 shrink-0 pb-safe">
          <div className="flex items-center justify-between bg-black px-4 py-3 rounded-xl border border-zinc-900 shadow-inner">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Coins className="w-4 h-4 text-emerald-500" />
              <span>Balance</span>
            </div>
            <span className="font-mono text-emerald-400 font-medium">${balance.toFixed(4)}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative bg-black">
        {/* Header */}
        <header className="h-14 border-b border-zinc-900 bg-black/90 backdrop-blur-md flex items-center justify-between px-3 md:px-4 shrink-0 z-20 pt-safe">
          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors active:bg-zinc-800">
              <Menu className="w-6 h-6" />
            </button>
          </div>

          {/* Model Selector */}
          <div className="relative">
            <button 
              onClick={() => setShowLevelSelector(!showLevelSelector)} 
              className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-full text-[14px] font-medium text-zinc-200 hover:bg-zinc-800 hover:border-zinc-700 transition-all active:scale-95"
            >
              {React.createElement(selectedLevelObj.icon, { className: `w-4 h-4 ${selectedLevelObj.color}` })}
              <span>{selectedLevelObj.name}</span>
              <ChevronDown className={`w-4 h-4 text-zinc-500 ml-0.5 transition-transform ${showLevelSelector ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showLevelSelector && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowLevelSelector(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-[280px] bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-30 overflow-hidden"
                  >
                    <div className="p-1.5 grid grid-cols-1 gap-0.5 max-h-[60vh] overflow-y-auto custom-scrollbar">
                      {AI_LEVELS.map(level => {
                        const Icon = level.icon;
                        return (
                          <button
                            key={level.id}
                            onClick={() => { setSelectedLevel(level.id); setShowLevelSelector(false); }}
                            className={`w-full text-left p-2.5 rounded-xl flex items-center gap-3 transition-colors ${selectedLevel === level.id ? 'bg-zinc-800' : 'hover:bg-zinc-800/50 active:bg-zinc-800'}`}
                          >
                            <div className={`p-1.5 rounded-lg bg-black border border-zinc-800 shrink-0 ${selectedLevel === level.id ? level.color : 'text-zinc-400'}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className={`font-medium text-[14px] ${selectedLevel === level.id ? 'text-zinc-100' : 'text-zinc-300'}`}>{level.name}</span>
                                {selectedLevel === level.id && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
                              </div>
                              <p className="text-[11px] text-zinc-500 mt-0.5 truncate">{level.desc}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar scroll-smooth">
          {activeConversation?.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto px-4">
              <div className="w-16 h-16 rounded-3xl bg-blue-600/10 flex items-center justify-center mb-4 border border-blue-500/20">
                <Bot className="w-8 h-8 text-blue-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">INEX Agent</h2>
              <p className="text-zinc-400 text-[14px] leading-relaxed">
                Select your AI level from the top right and start chatting.
              </p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {activeConversation?.messages.map((msg, index) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] md:max-w-[75%] px-4 py-3 rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : msg.status === 'error' 
                          ? 'bg-red-950/30 text-red-200 rounded-bl-sm border border-red-900/50'
                          : 'bg-zinc-900 text-zinc-200 rounded-bl-sm'
                    }`}
                  >
                    {msg.role === 'model' ? (
                      <div className="markdown-body text-[15px] leading-relaxed break-words">
                        {msg.text ? (
                          <>
                            <Markdown components={{ code: CodeBlock }}>{msg.text}</Markdown>
                            {/* Typewriter Cursor */}
                            {isLoading && index === activeConversation.messages.length - 1 && msg.status !== 'error' && (
                              <span className="typewriter-cursor" />
                            )}
                          </>
                        ) : (
                          <span className="typewriter-cursor" />
                        )}
                        
                        {/* Regenerate Button for Errors */}
                        {msg.status === 'error' && (
                          <div className="mt-4 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-400" />
                            <button 
                              onClick={() => handleRegenerate(msg.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/50 hover:bg-red-900/80 text-red-200 rounded-lg text-sm font-medium transition-colors active:scale-95"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              Regenerate
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                    )}
                  </div>
                  
                  {/* Metadata & Actions Footer */}
                  <div className={`flex flex-wrap items-center gap-3 mt-1.5 px-1 text-[11px] font-medium ${msg.role === 'user' ? 'text-blue-300/80 flex-row-reverse' : 'text-zinc-500'}`}>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3 opacity-70" /> {formatTime(msg.timestamp)}</span>
                    
                    {/* Status Indicator */}
                    <span className="flex items-center gap-1">
                      <StatusIcon status={msg.status} role={msg.role} />
                      <span className="capitalize">{msg.status}</span>
                    </span>

                    {msg.duration !== undefined && msg.status !== 'error' && (
                      <span className="flex items-center gap-1 text-blue-400/80"><Timer className="w-3 h-3 opacity-70" /> {(msg.duration / 1000).toFixed(1)}s</span>
                    )}
                    
                    {msg.tokens && msg.status !== 'error' && (
                      <span className="flex items-center gap-1"><Activity className="w-3 h-3 opacity-70" /> {msg.tokens.total} tkns</span>
                    )}
                    
                    {msg.cost !== undefined && msg.status !== 'error' && (
                      <span className="flex items-center gap-1 text-emerald-500/80"><Coins className="w-3 h-3 opacity-70" /> ${msg.cost.toFixed(6)}</span>
                    )}

                    {/* Copy Button */}
                    {msg.status !== 'error' && (
                      <button 
                        onClick={() => handleCopyMessage(msg.id, msg.text)}
                        className={`flex items-center gap-1 transition-colors active:scale-95 ml-1 ${msg.role === 'user' ? 'hover:text-white' : 'hover:text-zinc-300'}`}
                      >
                        {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        {copiedId === msg.id ? 'Copied' : 'Copy'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div ref={messagesEndRef} className="h-2" />
        </div>

        {/* Input Area */}
        <div className="flex-none p-3 bg-zinc-950 border-t border-zinc-900 pb-safe z-20">
          <div className="max-w-3xl mx-auto flex items-end gap-2">
            <div className="flex-1 bg-zinc-900 rounded-3xl border border-zinc-800 focus-within:border-zinc-700 transition-colors flex items-end">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                }}
                onKeyDown={handleKeyDown}
                placeholder="Message INEX Agent..."
                className="w-full bg-transparent px-4 py-3.5 max-h-[120px] text-[15px] text-zinc-200 placeholder-zinc-500 focus:outline-none resize-none hide-scrollbar"
                rows={1}
                disabled={isLoading}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className={`p-3.5 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95 ${
                input.trim() && !isLoading
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'bg-zinc-900 text-zinc-600 border border-zinc-800'
              }`}
            >
              <Send className="w-5 h-5 ml-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
