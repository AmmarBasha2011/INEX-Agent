/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Send, Menu, Plus, MessageSquare, X, Activity, Clock, Coins, ChevronDown, Bot, Zap, Wrench, Globe, Search, ChevronRight, Timer, Copy, Download, Brain, Flame, Rocket, Sparkles, MapPin, Terminal, Check } from 'lucide-react';
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

const AVAILABLE_TOOLS = [
  { id: 'web-search', name: 'Web Search', icon: Globe, desc: 'Search the live web for current info' },
  { id: 'google-maps', name: 'Google Maps', icon: MapPin, desc: 'Find places and geographic data' },
  { id: 'code-execution', name: 'Code Execution', icon: Terminal, desc: 'Run Python code to solve math/logic' },
];

type Message = {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  tokens?: { prompt: number; candidates: number; total: number };
  cost?: number;
  duration?: number; // in milliseconds
  searchQueries?: string[];
  searchResults?: { title: string; uri: string }[];
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
      <motion.div 
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="relative group rounded-xl overflow-hidden my-4 border border-slate-700/60 bg-[#0f172a] shadow-lg"
      >
        <div className="flex items-center justify-between px-4 py-2 bg-slate-800/80 border-b border-slate-700/60 backdrop-blur-sm">
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">{lang}</span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={handleCopy} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all active:scale-95" title="Copy">
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button onClick={handleDownload} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all active:scale-95" title="Download">
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="p-4 overflow-x-auto text-sm text-slate-300 bg-transparent m-0 border-0 custom-scrollbar">
          <code className={className} {...props}>
            {children}
          </code>
        </div>
      </motion.div>
    );
  }
  return <code className={`${className} bg-slate-800/60 px-1.5 py-0.5 rounded-md text-blue-300 font-mono text-[0.9em]`} {...props}>{children}</code>;
};

const ToolUsageViewer = ({ queries, results }: { queries?: string[], results?: {title: string, uri: string}[] }) => {
  const [expanded, setExpanded] = useState(false);
  if (!queries?.length && !results?.length) return null;
  
  return (
    <motion.div layout className="mt-3 bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors">
        <div className="flex items-center gap-2">
          <Globe className="w-3.5 h-3.5 text-blue-400" />
          <span>Web Search Used</span>
        </div>
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-3.5 h-3.5" />
        </motion.div>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }}
            className="px-3 py-2 border-t border-slate-700 text-xs space-y-3 bg-slate-900/50 overflow-hidden"
          >
            {queries && queries.length > 0 && (
              <div>
                <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Input (Queries)</span>
                <ul className="mt-1.5 space-y-1.5">
                  {queries.map((q, i) => (
                    <li key={i} className="text-slate-300 flex items-start gap-1.5 bg-slate-800/50 p-1.5 rounded border border-slate-700/50">
                      <Search className="w-3 h-3 mt-0.5 text-slate-500 shrink-0"/> 
                      <span className="leading-tight">{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {results && results.length > 0 && (
              <div>
                <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Output (Results)</span>
                <ul className="mt-1.5 space-y-1.5">
                  {results.map((r, i) => (
                    <li key={i} className="truncate bg-slate-800/50 p-1.5 rounded border border-slate-700/50">
                      <a href={r.uri} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline flex items-center gap-1.5">
                        <Globe className="w-3 h-3 shrink-0 text-blue-500/70" />
                        <span className="truncate leading-tight">{r.title}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default function App() {
  const [balance, setBalance] = useState<number>(2.0000);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string>('fast');
  const [showLevelSelector, setShowLevelSelector] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Tools state
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [showToolsMenu, setShowToolsMenu] = useState(false);

  // Initialize first conversation if empty
  useEffect(() => {
    if (conversations.length === 0) {
      createNewConversation();
    }
  }, []);

  const createNewConversation = () => {
    const newConv: Conversation = {
      id: Date.now().toString(),
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

  const toggleTool = (toolId: string) => {
    setSelectedTools(prev => 
      prev.includes(toolId) ? prev.filter(t => t !== toolId) : [...prev, toolId]
    );
    setShowToolsMenu(false);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !activeId) return;

    const userText = input.trim();
    const timestamp = Date.now();
    const userMessage: Message = { id: Date.now().toString(), role: 'user', text: userText, timestamp };

    let currentConv = conversations.find(c => c.id === activeId);
    if (!currentConv) return;

    // Update conversation with user message
    currentConv = {
      ...currentConv,
      messages: [...currentConv.messages, userMessage],
      updatedAt: timestamp,
      title: currentConv.messages.length === 0 ? userText.slice(0, 30) + (userText.length > 30 ? '...' : '') : currentConv.title
    };
    
    setConversations(prev => prev.map(c => c.id === currentConv!.id ? currentConv! : c));
    setInput('');
    setIsLoading(true);

    const modelMessageId = (Date.now() + 1).toString();
    const emptyModelMessage: Message = { id: modelMessageId, role: 'model', text: '', timestamp: Date.now() };

    currentConv = {
      ...currentConv,
      messages: [...currentConv.messages, emptyModelMessage]
    };
    setConversations(prev => prev.map(c => c.id === currentConv!.id ? currentConv! : c));

    const startTime = Date.now();

    try {
      const contents = currentConv.messages.slice(0, -1).map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const config: any = {
        systemInstruction: "You are INEX Agent, an advanced AI assistant. Format your responses using markdown.",
        tools: []
      };

      if (selectedTools.includes('web-search')) {
        config.tools.push({ googleSearch: {} });
      }
      if (selectedTools.includes('google-maps')) {
        config.tools.push({ googleMaps: {} });
      }
      if (selectedTools.includes('code-execution')) {
        config.tools.push({ codeExecution: {} });
      }

      if (config.tools.length === 0) {
        delete config.tools;
      }

      const stream = await ai.models.generateContentStream({
        model: selectedLevelObj.model,
        contents: contents,
        config: config
      });

      let currentText = '';
      let pTokens = 0;
      let cTokens = 0;
      let searchQueries: string[] = [];
      let searchResults: {title: string, uri: string}[] = [];

      for await (const chunk of stream) {
        if (chunk.text) {
          currentText += chunk.text;
        }
        
        // Extract grounding metadata if present
        // @ts-ignore
        const gm = chunk.groundingMetadata;
        if (gm) {
          if (gm.webSearchQueries) {
            searchQueries = gm.webSearchQueries;
          }
          if (gm.groundingChunks) {
            searchResults = gm.groundingChunks
              .filter((c: any) => c.web?.uri && c.web?.title)
              .map((c: any) => ({ uri: c.web.uri, title: c.web.title }));
          }
        }

        // @ts-ignore
        if (chunk.usageMetadata) {
          // @ts-ignore
          pTokens = chunk.usageMetadata.promptTokenCount || pTokens;
          // @ts-ignore
          cTokens = chunk.usageMetadata.candidatesTokenCount || cTokens;
        }

        setConversations(prev => prev.map(c => {
          if (c.id === currentConv!.id) {
            return {
              ...c,
              messages: c.messages.map(m => m.id === modelMessageId ? { 
                ...m, 
                text: currentText,
                searchQueries: searchQueries.length > 0 ? searchQueries : undefined,
                searchResults: searchResults.length > 0 ? searchResults : undefined
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
        if (c.id === currentConv!.id) {
          return {
            ...c,
            messages: c.messages.map(m => m.id === modelMessageId ? { 
              ...m, 
              text: currentText,
              tokens: { prompt: pTokens, candidates: cTokens, total: totalTokens },
              cost: cost,
              duration: duration,
              searchQueries: searchQueries.length > 0 ? searchQueries : undefined,
              searchResults: searchResults.length > 0 ? searchResults : undefined
            } : m)
          };
        }
        return c;
      }));

    } catch (error) {
      console.error("Error sending message:", error);
      setConversations(prev => prev.map(c => {
        if (c.id === currentConv!.id) {
          return {
            ...c,
            messages: c.messages.map(m => m.id === modelMessageId ? { ...m, text: 'Sorry, I encountered an error. Please try again.' } : m)
          };
        }
        return c;
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex h-[100dvh] bg-slate-950 text-slate-200 font-sans overflow-hidden selection:bg-blue-500/30">
      
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
      <div className={`fixed md:relative z-50 w-72 h-full bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/50">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">INEX Agent</h1>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden p-2 -mr-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 shrink-0">
          <motion.button 
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={createNewConversation} 
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-blue-900/20"
          >
            <Plus className="w-4 h-4" /> New Chat
          </motion.button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-1 pb-4 custom-scrollbar">
          <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Conversations</div>
          <AnimatePresence>
            {conversations.map((conv, i) => (
              <motion.button 
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                key={conv.id} 
                onClick={() => { setActiveId(conv.id); setSidebarOpen(false); }} 
                className={`w-full text-left px-3 py-3 rounded-xl text-sm truncate transition-all flex items-center gap-3 ${activeId === conv.id ? 'bg-slate-800 text-white shadow-sm border border-slate-700' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'}`}
              >
                <MessageSquare className={`w-4 h-4 shrink-0 ${activeId === conv.id ? 'text-blue-400' : 'opacity-70'}`} />
                <span className="truncate">{conv.title}</span>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        <div className="p-5 border-t border-slate-800 bg-slate-900/80 shrink-0">
          <div className="flex items-center justify-between bg-slate-950 px-4 py-3 rounded-xl border border-slate-800 shadow-inner">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Coins className="w-4 h-4 text-emerald-500" />
              <span>Balance</span>
            </div>
            <span className="font-mono text-emerald-400 font-medium">${balance.toFixed(4)}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative bg-[#0B1120]">
        {/* Header */}
        <header className="h-16 border-b border-slate-800/60 bg-[#0B1120]/80 backdrop-blur-md flex items-center justify-between px-4 shrink-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden md:flex items-center gap-2">
              <span className="text-slate-400 text-sm font-medium">Model Level:</span>
            </div>
          </div>

          {/* Model Selector */}
          <div className="relative">
            <motion.button 
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => setShowLevelSelector(!showLevelSelector)} 
              className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-800 hover:border-slate-600 transition-all shadow-sm"
            >
              {React.createElement(selectedLevelObj.icon, { className: `w-4 h-4 ${selectedLevelObj.color}` })}
              {selectedLevelObj.name}
              <motion.div animate={{ rotate: showLevelSelector ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown className="w-4 h-4 text-slate-500 ml-1" />
              </motion.div>
            </motion.button>

            <AnimatePresence>
              {showLevelSelector && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowLevelSelector(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95, filter: 'blur(10px)' }} 
                    animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }} 
                    exit={{ opacity: 0, y: 10, scale: 0.95, filter: 'blur(10px)' }}
                    className="absolute right-0 top-full mt-3 w-[340px] bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl z-30 overflow-hidden"
                  >
                    <div className="p-2 grid grid-cols-1 gap-1">
                      {AI_LEVELS.map(level => {
                        const Icon = level.icon;
                        return (
                          <button
                            key={level.id}
                            onClick={() => { setSelectedLevel(level.id); setShowLevelSelector(false); }}
                            className={`w-full text-left p-3 rounded-xl flex items-start gap-3 transition-all duration-200 ${selectedLevel === level.id ? 'bg-blue-600/10 border border-blue-500/30 shadow-inner' : 'border border-transparent hover:bg-slate-800/80'}`}
                          >
                            <div className={`p-2 rounded-lg bg-slate-950 shadow-sm border border-slate-800 ${selectedLevel === level.id ? level.color : 'text-slate-400'}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className={`font-semibold ${selectedLevel === level.id ? 'text-slate-200' : 'text-slate-300'}`}>{level.name}</span>
                                {selectedLevel === level.id && <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />}
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">{level.desc}</p>
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
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar scroll-smooth">
          {activeConversation?.messages.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto px-4"
            >
              <motion.div 
                animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="w-20 h-20 rounded-3xl bg-blue-900/30 flex items-center justify-center mb-6 border border-blue-500/20 shadow-2xl shadow-blue-500/10"
              >
                <Bot className="w-10 h-10 text-blue-400" />
              </motion.div>
              <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">Welcome to INEX Agent</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                You have $2.00 free credit to start. Select your AI level from the top right, add tools, and start chatting!
              </p>
            </motion.div>
          ) : (
            <AnimatePresence initial={false}>
              {activeConversation?.messages.map((msg) => (
                <motion.div
                  layout
                  key={msg.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[90%] md:max-w-[80%] px-5 py-4 rounded-3xl ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-sm shadow-lg shadow-blue-900/20'
                        : 'bg-slate-900 text-slate-200 rounded-tl-sm shadow-md border border-slate-800/80'
                    }`}
                  >
                    {msg.role === 'model' ? (
                      <div className="markdown-body text-[15px] leading-relaxed">
                        {msg.text ? <Markdown components={{ code: CodeBlock }}>{msg.text}</Markdown> : <span className="animate-pulse">...</span>}
                        <ToolUsageViewer queries={msg.searchQueries} results={msg.searchResults} />
                      </div>
                    ) : (
                      <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    )}
                  </div>
                  
                  {/* Metadata Footer */}
                  <div className={`flex flex-wrap items-center gap-3 mt-2 px-2 text-[10px] font-medium ${msg.role === 'user' ? 'text-slate-500 flex-row-reverse' : 'text-slate-500'}`}>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3 opacity-70" /> {formatTime(msg.timestamp)}</span>
                    {msg.duration !== undefined && (
                      <span className="flex items-center gap-1 text-blue-400/80"><Timer className="w-3 h-3 opacity-70" /> {(msg.duration / 1000).toFixed(1)}s</span>
                    )}
                    {msg.tokens && (
                      <span className="flex items-center gap-1"><Activity className="w-3 h-3 opacity-70" /> {msg.tokens.total} tkns</span>
                    )}
                    {msg.cost !== undefined && (
                      <span className="flex items-center gap-1 text-emerald-500/80"><Coins className="w-3 h-3 opacity-70" /> ${msg.cost.toFixed(6)}</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-[#0B1120] border-t border-slate-800/60 shrink-0 pb-safe">
          <motion.div layout className="max-w-4xl mx-auto flex flex-col gap-3 relative">
            
            {/* Selected Tools Display */}
            <AnimatePresence>
              {selectedTools.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="flex flex-wrap items-center gap-2 px-2"
                >
                  {selectedTools.map(toolId => {
                    const tool = AVAILABLE_TOOLS.find(t => t.id === toolId);
                    if (!tool) return null;
                    const Icon = tool.icon;
                    return (
                      <motion.span 
                        layout
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        key={tool.id} 
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-medium shadow-sm backdrop-blur-sm"
                      >
                        <Icon className="w-3.5 h-3.5 text-blue-400" />
                        {tool.name}
                        <button onClick={() => toggleTool(tool.id)} className="ml-1 hover:text-white hover:bg-slate-700 rounded-full p-0.5 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </motion.span>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div 
              layout
              className="flex items-end gap-2 bg-slate-900/80 backdrop-blur-xl p-2 rounded-[2rem] border border-slate-700/60 shadow-2xl shadow-blue-900/10 focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all"
            >
              
              {/* Tools Menu Button */}
              <div className="relative">
                <button
                  onClick={() => setShowToolsMenu(!showToolsMenu)}
                  className={`p-3 rounded-full flex items-center justify-center transition-all ${showToolsMenu || selectedTools.length > 0 ? 'text-blue-400 bg-blue-900/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                >
                  <Wrench className="w-5 h-5" />
                </button>
                
                <AnimatePresence>
                  {showToolsMenu && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setShowToolsMenu(false)} />
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95, filter: 'blur(10px)' }} 
                        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }} 
                        exit={{ opacity: 0, y: 10, scale: 0.95, filter: 'blur(10px)' }}
                        className="absolute bottom-full left-0 mb-4 w-72 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl z-30 overflow-hidden"
                      >
                        <div className="p-2 space-y-1">
                          <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Available Tools</div>
                          {AVAILABLE_TOOLS.map(tool => {
                            const Icon = tool.icon;
                            const isSelected = selectedTools.includes(tool.id);
                            return (
                              <button
                                key={tool.id}
                                onClick={() => toggleTool(tool.id)}
                                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-sm transition-all duration-200 ${isSelected ? 'bg-blue-600/10 border border-blue-500/30' : 'border border-transparent hover:bg-slate-800/80'}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`p-1.5 rounded-md ${isSelected ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-400'}`}>
                                    <Icon className="w-4 h-4" />
                                  </div>
                                  <div className="text-left">
                                    <div className={`font-medium ${isSelected ? 'text-blue-100' : 'text-slate-300'}`}>{tool.name}</div>
                                    <div className="text-[10px] text-slate-500">{tool.desc}</div>
                                  </div>
                                </div>
                                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-600'}`}>
                                  {isSelected && <Check className="w-3 h-3 text-white" />}
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

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message INEX Agent..."
                className="flex-1 bg-transparent px-2 py-3.5 text-[15px] text-slate-200 placeholder-slate-500 focus:outline-none"
                disabled={isLoading}
              />
              <motion.button
                whileHover={{ scale: input.trim() && !isLoading ? 1.05 : 1 }}
                whileTap={{ scale: input.trim() && !isLoading ? 0.95 : 1 }}
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className={`p-3.5 rounded-full flex items-center justify-center transition-all ${
                  input.trim() && !isLoading
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'bg-slate-800 text-slate-600'
                }`}
              >
                <Send className="w-5 h-5 ml-0.5" />
              </motion.button>
            </motion.div>
            <div className="text-center text-[10px] text-slate-600 font-medium">
              AI can make mistakes. Verify important information.
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
