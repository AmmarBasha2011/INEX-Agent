/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { Send, Menu, Plus, MessageSquare, X, Activity, Clock, Coins, ChevronDown, Bot, Zap, Timer, Copy, Download, Brain, Flame, Rocket, Sparkles, Check, RefreshCw, AlertTriangle, CheckCheck, Loader2, Calculator, Wrench } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const AI_LEVELS = [
  { id: 'very-fast', name: 'Very Fast', model: 'gemini-flash-lite-latest', inPrice: 0.075, outPrice: 0.30, icon: Zap, color: 'text-yellow-400', desc: 'Lowest latency, basic tasks' },
  { id: 'fast', name: 'Fast', model: 'gemini-2.5-flash', inPrice: 0.075, outPrice: 0.30, icon: Zap, color: 'text-amber-400', desc: 'Balanced speed and capability' },
  { id: 'medium', name: 'Medium', model: 'gemini-2.5-pro', inPrice: 1.25, outPrice: 5.00, icon: Brain, color: 'text-blue-400', desc: 'High reasoning, standard speed' },
  { id: 'hard', name: 'Hard', model: 'gemini-3-flash-preview', inPrice: 0.075, outPrice: 0.30, icon: Flame, color: 'text-orange-400', desc: 'Advanced reasoning, fast' },
  { id: 'extreme', name: 'Extreme', model: 'gemini-3-pro-preview', inPrice: 1.25, outPrice: 5.00, icon: Rocket, color: 'text-red-500', desc: 'Maximum capability, complex tasks' },
  { id: 'new', name: 'New', model: 'gemini-3.1-pro-preview', inPrice: 1.25, outPrice: 5.00, icon: Sparkles, color: 'text-rose-500', desc: 'Latest experimental model' },
];

const calculatorTool: FunctionDeclaration = {
  name: 'calculator',
  description: 'Evaluates a mathematical expression. Use this for any math calculations.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      expression: {
        type: Type.STRING,
        description: 'The math expression to evaluate, e.g., "2 + 2 * 4"'
      }
    },
    required: ['expression']
  }
};

type MessageStatus = 'sending' | 'sent' | 'processing' | 'done' | 'error' | 'waiting_approval';

type Message = {
  id: string;
  role: 'user' | 'model' | 'function';
  text: string;
  timestamp: number;
  tokens?: { prompt: number; candidates: number; total: number };
  cost?: number;
  duration?: number; // in milliseconds
  status: MessageStatus;
  pendingToolCall?: { id?: string, name: string, args: any };
  toolResult?: { id?: string, name: string, result: any };
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
      <div className="relative group rounded-xl overflow-hidden my-4 border border-white/10 bg-black/40 shadow-lg backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
          <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">{lang}</span>
          <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <button onClick={handleCopy} className="p-2 md:p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-all active:scale-95" title="Copy">
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button onClick={handleDownload} className="p-2 md:p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-all active:scale-95" title="Download">
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="p-4 overflow-x-auto text-sm text-zinc-200 bg-transparent m-0 border-0 custom-scrollbar">
          <code className={className} {...props}>
            {children}
          </code>
        </div>
      </div>
    );
  }
  return <code className={`${className} bg-white/10 px-1.5 py-0.5 rounded-md text-blue-300 font-mono text-[0.9em]`} {...props}>{children}</code>;
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

  const isDangerous = ['extreme', 'new'].includes(selectedLevel);

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
      const contents = history.map(m => {
        if (m.role === 'model' && m.pendingToolCall) {
          return {
            role: 'model',
            parts: [
              ...(m.text ? [{ text: m.text }] : []),
              { functionCall: { id: m.pendingToolCall.id, name: m.pendingToolCall.name, args: m.pendingToolCall.args } }
            ]
          };
        }
        if (m.role === 'function' && m.toolResult) {
          return {
            role: 'user', // API expects functionResponse to be from 'user' role
            parts: [{
              functionResponse: {
                id: m.toolResult.id,
                name: m.toolResult.name,
                response: { result: m.toolResult.result }
              }
            }]
          };
        }
        return { role: m.role, parts: [{ text: m.text }] };
      });

      const config: any = {
        systemInstruction: "You are INEX Agent, an advanced AI assistant. Format your responses using markdown.",
        tools: [{ functionDeclarations: [calculatorTool] }]
      };

      const stream = await ai.models.generateContentStream({
        model: selectedLevelObj.model,
        contents: contents,
        config: config
      });

      let currentText = '';
      let pTokens = 0;
      let cTokens = 0;
      let functionCallFound: any = null;

      for await (const chunk of stream) {
        if (chunk.text) {
          currentText += chunk.text;
        }

        // @ts-ignore
        if (chunk.functionCalls && chunk.functionCalls.length > 0) {
          // @ts-ignore
          functionCallFound = chunk.functionCalls[0];
          break; // Stop processing, need user approval
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

      if (functionCallFound) {
        setConversations(prev => prev.map(c => {
          if (c.id === convId) {
            return {
              ...c,
              messages: c.messages.map(m => m.id === modelMessageId ? { 
                ...m, 
                text: currentText,
                pendingToolCall: {
                  id: functionCallFound.id,
                  name: functionCallFound.name,
                  args: functionCallFound.args
                },
                status: 'waiting_approval'
              } : m)
            };
          }
          return c;
        }));
        setIsLoading(false);
        return; // Pause execution here
      }

      // Estimate tokens if API didn't provide them
      if (pTokens === 0) {
        pTokens = Math.ceil(contents.reduce((acc, c) => acc + (c.parts[0].text ? c.parts[0].text.length : 10), 0) / 4);
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

  const handleApproveTool = async (convId: string, msgId: string) => {
    const conv = conversations.find(c => c.id === convId);
    if (!conv) return;
    const msg = conv.messages.find(m => m.id === msgId);
    if (!msg || !msg.pendingToolCall) return;

    const call = msg.pendingToolCall;
    let result;
    try {
      if (call.name === 'calculator') {
        // Safe evaluation for basic math
        result = Function('"use strict";return (' + call.args.expression + ')')();
      } else {
        result = "Tool not supported.";
      }
    } catch (e) {
      result = "Error evaluating expression";
    }

    const toolResMsg: Message = {
      id: `tool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: 'function',
      text: `Calculated: ${result}`,
      timestamp: Date.now(),
      status: 'done',
      toolResult: { id: call.id, name: call.name, result: result }
    };

    const updatedHistory = conv.messages.map(m => m.id === msgId ? { ...m, status: 'done' as MessageStatus } : m).concat(toolResMsg);

    setConversations(prev => prev.map(c => c.id === convId ? {
      ...c,
      messages: updatedHistory
    } : c));

    await runAI(convId, updatedHistory);
  };

  const handleRejectTool = async (convId: string, msgId: string) => {
    const conv = conversations.find(c => c.id === convId);
    if (!conv) return;
    const msg = conv.messages.find(m => m.id === msgId);
    if (!msg || !msg.pendingToolCall) return;

    const call = msg.pendingToolCall;
    const toolResMsg: Message = {
      id: `tool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: 'function',
      text: `User rejected tool execution.`,
      timestamp: Date.now(),
      status: 'done',
      toolResult: { id: call.id, name: call.name, result: "User denied permission to run this tool." }
    };

    const updatedHistory = conv.messages.map(m => m.id === msgId ? { ...m, status: 'done' as MessageStatus } : m).concat(toolResMsg);

    setConversations(prev => prev.map(c => c.id === convId ? {
      ...c,
      messages: updatedHistory
    } : c));

    await runAI(convId, updatedHistory);
  };

  const handleRegenerate = async (msgId: string) => {
    if (isLoading || !activeId) return;
    const currentConv = conversations.find(c => c.id === activeId);
    if (!currentConv) return;

    const msgIndex = currentConv.messages.findIndex(m => m.id === msgId);
    if (msgIndex === -1) return;

    const history = currentConv.messages.slice(0, msgIndex);
    
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

  const StatusIcon = ({ status, role }: { status: MessageStatus, role: 'user' | 'model' | 'function' }) => {
    if (role === 'user') {
      if (status === 'sending') return <Clock className="w-3 h-3 text-blue-300" />;
      if (status === 'sent') return <CheckCheck className="w-3.5 h-3.5 text-blue-300" />;
      return null;
    } else {
      if (status === 'processing') return <Loader2 className={`w-3 h-3 animate-spin ${isDangerous ? 'text-red-400' : 'text-blue-400'}`} />;
      if (status === 'waiting_approval') return <Clock className="w-3 h-3 text-yellow-400 animate-pulse" />;
      if (status === 'error') return <AlertTriangle className="w-3 h-3 text-red-400" />;
      if (status === 'done') return <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />;
      return null;
    }
  };

  const ToolOutputViewer = ({ name, result }: { name: string, result: any }) => {
    const [expanded, setExpanded] = useState(false);
    return (
      <div className="mt-2 rounded-xl overflow-hidden border border-white/10 bg-black/20 backdrop-blur-md">
        <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-white/5 transition-colors">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-emerald-400" />
            <span>{name} output</span>
          </div>
          <motion.div animate={{ rotate: expanded ? 180 : 0 }}>
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }} 
              animate={{ height: 'auto', opacity: 1 }} 
              exit={{ height: 0, opacity: 0 }}
              className="px-3 py-2 border-t border-white/10 text-xs bg-black/40 overflow-hidden"
            >
              <pre className="text-zinc-300 overflow-x-auto">{JSON.stringify(result, null, 2)}</pre>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="flex h-[100dvh] w-full bg-black text-zinc-100 font-sans overflow-hidden selection:bg-blue-500/30 relative">
      
      {/* Liquid Glass Background Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className={`absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full mix-blend-screen filter blur-[100px] opacity-30 animate-blob ${isDangerous ? 'bg-red-600' : 'bg-blue-600'}`}></div>
        <div className={`absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] rounded-full mix-blend-screen filter blur-[100px] opacity-30 animate-blob animation-delay-2000 ${isDangerous ? 'bg-orange-600' : 'bg-violet-600'}`}></div>
        <div className={`absolute bottom-[-20%] left-[20%] w-[60vw] h-[60vw] rounded-full mix-blend-screen filter blur-[100px] opacity-30 animate-blob animation-delay-4000 ${isDangerous ? 'bg-rose-600' : 'bg-indigo-600'}`}></div>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-md"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <div className={`fixed md:relative z-50 w-[80%] max-w-[300px] md:w-72 h-full glass-panel border-r-0 border-r-white/10 flex flex-col transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0 pt-safe">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-lg ${isDangerous ? 'bg-red-600 shadow-red-900/20' : 'bg-blue-600 shadow-blue-900/20'}`}>
              <Bot className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-white">INEX Agent</h1>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden p-2 -mr-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 active:bg-white/5">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-3 shrink-0">
          <button 
            onClick={createNewConversation} 
            className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white py-2.5 rounded-xl font-medium transition-colors active:scale-95 border border-white/10"
          >
            <Plus className="w-4 h-4" /> New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-1 pb-4 custom-scrollbar">
          <div className="px-3 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Conversations</div>
          {conversations.map((conv) => (
            <button 
              key={conv.id} 
              onClick={() => { setActiveId(conv.id); setSidebarOpen(false); }} 
              className={`w-full text-left px-3 py-3 rounded-xl text-sm truncate transition-all flex items-center gap-3 ${activeId === conv.id ? 'bg-white/10 text-white shadow-sm border border-white/10' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent active:bg-white/5'}`}
            >
              <MessageSquare className={`w-4 h-4 shrink-0 ${activeId === conv.id ? (isDangerous ? 'text-red-400' : 'text-blue-400') : 'opacity-70'}`} />
              <span className="truncate text-[15px] md:text-sm">{conv.title}</span>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-white/10 bg-black/20 shrink-0 pb-safe">
          <div className="flex items-center justify-between bg-black/40 px-4 py-3 rounded-xl border border-white/5 shadow-inner">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Coins className="w-4 h-4 text-emerald-400" />
              <span>Balance</span>
            </div>
            <span className="font-mono text-emerald-400 font-medium">${balance.toFixed(4)}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Header */}
        <header className={`h-14 border-b flex items-center justify-between px-3 md:px-4 shrink-0 z-20 pt-safe ${isDangerous ? 'glass-panel-danger border-red-500/30' : 'glass-panel border-white/10'}`}>
          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors active:bg-white/5">
              <Menu className="w-6 h-6" />
            </button>
            {isDangerous && (
              <div className="hidden md:flex items-center gap-1.5 px-2 py-1 bg-red-500/20 border border-red-500/30 rounded-md text-red-200 text-xs font-medium animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" />
                High Cost Model Active
              </div>
            )}
          </div>

          {/* Model Selector */}
          <div className="relative">
            <button 
              onClick={() => setShowLevelSelector(!showLevelSelector)} 
              className={`flex items-center gap-2 border px-3 py-1.5 rounded-full text-[14px] font-medium transition-all active:scale-95 ${isDangerous ? 'bg-red-950/40 border-red-500/30 text-red-100 hover:bg-red-900/40' : 'bg-white/5 border-white/10 text-zinc-200 hover:bg-white/10'}`}
            >
              {React.createElement(selectedLevelObj.icon, { className: `w-4 h-4 ${selectedLevelObj.color}` })}
              <span>{selectedLevelObj.name}</span>
              <ChevronDown className={`w-4 h-4 text-zinc-400 ml-0.5 transition-transform ${showLevelSelector ? 'rotate-180' : ''}`} />
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
                    className="absolute right-0 top-full mt-2 w-[280px] glass-panel rounded-2xl shadow-2xl z-30 overflow-hidden"
                  >
                    <div className="p-1.5 grid grid-cols-1 gap-0.5 max-h-[60vh] overflow-y-auto custom-scrollbar">
                      {AI_LEVELS.map(level => {
                        const Icon = level.icon;
                        const isLevelDangerous = ['extreme', 'new'].includes(level.id);
                        return (
                          <button
                            key={level.id}
                            onClick={() => { setSelectedLevel(level.id); setShowLevelSelector(false); }}
                            className={`w-full text-left p-2.5 rounded-xl flex items-center gap-3 transition-colors ${selectedLevel === level.id ? 'bg-white/10' : 'hover:bg-white/5 active:bg-white/10'}`}
                          >
                            <div className={`p-1.5 rounded-lg bg-black/40 border border-white/10 shrink-0 ${selectedLevel === level.id ? level.color : 'text-zinc-400'}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className={`font-medium text-[14px] ${selectedLevel === level.id ? 'text-zinc-100' : 'text-zinc-300'}`}>{level.name}</span>
                                {selectedLevel === level.id && <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isLevelDangerous ? 'bg-red-500' : 'bg-blue-500'}`} />}
                              </div>
                              <p className="text-[11px] text-zinc-400 mt-0.5 truncate">{level.desc}</p>
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
              <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-4 border ${isDangerous ? 'bg-red-600/10 border-red-500/20' : 'bg-blue-600/10 border-blue-500/20'}`}>
                <Bot className={`w-8 h-8 ${isDangerous ? 'text-red-500' : 'text-blue-500'}`} />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">INEX Agent</h2>
              <p className="text-zinc-400 text-[14px] leading-relaxed">
                Select your AI level from the top right and start chatting.
              </p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {activeConversation?.messages.map((msg, index) => {
                if (msg.role === 'function') {
                  return (
                    <div key={msg.id} className="flex justify-start">
                      <div className="max-w-[85%] md:max-w-[75%]">
                        <ToolOutputViewer name={msg.toolResult?.name || 'Tool'} result={msg.toolResult?.result} />
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] md:max-w-[75%] px-4 py-3 rounded-2xl backdrop-blur-md border ${
                        msg.role === 'user'
                          ? `text-white rounded-br-sm ${isDangerous ? 'bg-red-600/80 border-red-500/50' : 'bg-blue-600/80 border-blue-500/50'}`
                          : msg.status === 'error' 
                            ? 'bg-red-950/40 text-red-200 rounded-bl-sm border-red-900/50'
                            : 'bg-white/5 text-zinc-200 rounded-bl-sm border-white/10'
                      }`}
                    >
                      {msg.role === 'model' ? (
                        <div className="markdown-body text-[15px] leading-relaxed break-words">
                          {msg.text ? (
                            <>
                              <Markdown components={{ code: CodeBlock }}>{msg.text}</Markdown>
                              {/* Typewriter Cursor */}
                              {isLoading && index === activeConversation.messages.length - 1 && msg.status !== 'error' && msg.status !== 'waiting_approval' && (
                                <span className="typewriter-cursor" />
                              )}
                            </>
                          ) : (
                            msg.status !== 'waiting_approval' && <span className="typewriter-cursor" />
                          )}
                          
                          {/* Tool Approval UI */}
                          {msg.pendingToolCall && msg.status === 'waiting_approval' && (
                            <div className="mt-4 p-4 rounded-xl bg-black/40 border border-white/10 backdrop-blur-md">
                              <div className="flex items-center gap-2 text-blue-400 mb-2">
                                <Wrench className="w-4 h-4" />
                                <span className="text-sm font-semibold">Tool Approval Required</span>
                              </div>
                              <p className="text-[13px] text-zinc-300 mb-2">The AI wants to use <strong>{msg.pendingToolCall.name}</strong></p>
                              <pre className="text-[11px] bg-black/60 p-2 rounded-lg text-zinc-400 mb-4 overflow-x-auto border border-white/5">
                                {JSON.stringify(msg.pendingToolCall.args, null, 2)}
                              </pre>
                              <div className="flex gap-2">
                                <button onClick={() => activeId && handleApproveTool(activeId, msg.id)} className="flex-1 py-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg text-sm font-medium transition-colors active:scale-95">Approve</button>
                                <button onClick={() => activeId && handleRejectTool(activeId, msg.id)} className="flex-1 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-sm font-medium transition-colors active:scale-95">Reject</button>
                              </div>
                            </div>
                          )}

                          {/* Regenerate Button for Errors */}
                          {msg.status === 'error' && (
                            <div className="mt-4 flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-red-400" />
                              <button 
                                onClick={() => handleRegenerate(msg.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/50 hover:bg-red-900/80 text-red-200 rounded-lg text-sm font-medium transition-colors active:scale-95 border border-red-500/30"
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
                    <div className={`flex flex-wrap items-center gap-3 mt-1.5 px-1 text-[11px] font-medium ${msg.role === 'user' ? (isDangerous ? 'text-red-300/80' : 'text-blue-300/80') + ' flex-row-reverse' : 'text-zinc-500'}`}>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3 opacity-70" /> {formatTime(msg.timestamp)}</span>
                      
                      {/* Status Indicator */}
                      <span className="flex items-center gap-1">
                        <StatusIcon status={msg.status} role={msg.role} />
                        <span className="capitalize">{msg.status.replace('_', ' ')}</span>
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
                      {msg.status !== 'error' && msg.status !== 'waiting_approval' && (
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
                );
              })}
            </div>
          )}
          <div ref={messagesEndRef} className="h-2" />
        </div>

        {/* Input Area */}
        <div className={`flex-none p-3 pb-safe z-20 ${isDangerous ? 'glass-panel-danger border-t-red-500/30' : 'glass-panel border-t-white/10'}`}>
          <div className="max-w-3xl mx-auto flex items-end gap-2">
            <div className={`flex-1 rounded-3xl border transition-colors flex items-end bg-black/40 backdrop-blur-md ${isDangerous ? 'border-red-500/30 focus-within:border-red-500/60' : 'border-white/10 focus-within:border-white/30'}`}>
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
                  ? (isDangerous ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'bg-blue-600 text-white shadow-lg shadow-blue-600/20')
                  : 'bg-white/5 text-zinc-600 border border-white/10'
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
