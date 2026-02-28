/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { Send, Menu, Plus, MessageSquare, X, Activity, Clock, Coins, ChevronDown, Bot, Zap, Timer, Copy, Download, Brain, Flame, Rocket, Sparkles, Check, RefreshCw, AlertTriangle, CheckCheck, Loader2, Calculator, Wrench, Square, Paperclip, FileText, XCircle, Globe, Settings as SettingsIcon, Pin, Edit2, Trash2, Image as ImageIcon, Mic, MoreVertical, Folder } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import SettingsModal, { Settings, loadSettings, saveSettings } from './SettingsModal';
import FileManagerModal, { getFileIcon } from './FileManagerModal';
import { MessageStatus, Attachment, Message, Conversation, FileNode } from './types';
import { 
  calculatorTool, webSearchTool, imageGenerationTool, audioGenerationTool, 
  saveMemoryTool, updateMemoryTool, deleteMemoryTool, 
  createFileTool, createFolderTool, deleteNodeTool, readFileTool, editFileTool, renameNodeTool, listFilesTool 
} from './tools';
import { 
  initDB, saveFileToDB, getFilesFromDB, deleteFileFromDB, 
  saveConversationToDB, getConversationsFromDB, deleteConversationFromDB 
} from './db';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const AI_LEVELS = [
  { id: 'very-fast', name: 'Very Fast', model: 'gemini-flash-lite-latest', inPrice: 0.075, outPrice: 0.30, icon: Zap, color: 'text-yellow-400', desc: 'Lowest latency, basic tasks', theme: { blob1: 'bg-yellow-500', blob2: 'bg-amber-500', blob3: 'bg-orange-500', border: 'border-yellow-500/30', focus: 'focus-within:border-yellow-500/60', bg: 'bg-yellow-600/80', bgLight: 'bg-yellow-600/10', text: 'text-yellow-400', isDangerous: false } },
  { id: 'fast', name: 'Fast', model: 'gemini-2.5-flash', inPrice: 0.075, outPrice: 0.30, icon: Zap, color: 'text-blue-400', desc: 'Balanced speed and capability', theme: { blob1: 'bg-blue-600', blob2: 'bg-cyan-600', blob3: 'bg-sky-600', border: 'border-blue-500/30', focus: 'focus-within:border-blue-500/60', bg: 'bg-blue-600/80', bgLight: 'bg-blue-600/10', text: 'text-blue-400', isDangerous: false } },
  { id: 'medium', name: 'Medium', model: 'gemini-2.5-pro', inPrice: 1.25, outPrice: 5.00, icon: Brain, color: 'text-purple-400', desc: 'High reasoning, standard speed', theme: { blob1: 'bg-purple-600', blob2: 'bg-fuchsia-600', blob3: 'bg-indigo-600', border: 'border-purple-500/30', focus: 'focus-within:border-purple-500/60', bg: 'bg-purple-600/80', bgLight: 'bg-purple-600/10', text: 'text-purple-400', isDangerous: false } },
  { id: 'hard', name: 'Hard', model: 'gemini-3-flash-preview', inPrice: 0.075, outPrice: 0.30, icon: Flame, color: 'text-orange-400', desc: 'Advanced reasoning, fast', theme: { blob1: 'bg-orange-600', blob2: 'bg-red-500', blob3: 'bg-amber-600', border: 'border-orange-500/30', focus: 'focus-within:border-orange-500/60', bg: 'bg-orange-600/80', bgLight: 'bg-orange-600/10', text: 'text-orange-400', isDangerous: false } },
  { id: 'extreme', name: 'Extreme', model: 'gemini-3-pro-preview', inPrice: 1.25, outPrice: 5.00, icon: Rocket, color: 'text-red-500', desc: 'Maximum capability, complex tasks', theme: { blob1: 'bg-red-600', blob2: 'bg-rose-600', blob3: 'bg-red-700', border: 'border-red-500/50', focus: 'focus-within:border-red-500/80', bg: 'bg-red-600/80', bgLight: 'bg-red-600/20', text: 'text-red-400', isDangerous: true } },
  { id: 'new', name: 'New', model: 'gemini-3.1-pro-preview', inPrice: 1.25, outPrice: 5.00, icon: Sparkles, color: 'text-emerald-400', desc: 'Latest experimental model', theme: { blob1: 'bg-emerald-600', blob2: 'bg-teal-600', blob3: 'bg-green-600', border: 'border-emerald-500/30', focus: 'focus-within:border-emerald-500/60', bg: 'bg-emerald-600/80', bgLight: 'bg-emerald-600/10', text: 'text-emerald-400', isDangerous: true } },
];

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

import { ToastContainer, ToastMessage, ToastType } from './components/Toast';

export default function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings());
  const [showSettings, setShowSettings] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  const addToast = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };
  const [balance, setBalance] = useState<number>(() => {
    const saved = localStorage.getItem('inex_balance');
    return saved ? parseFloat(saved) : 2.0000;
  });
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const saved = localStorage.getItem('inex_conversations');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeId, setActiveId] = useState<string | null>(() => {
    return localStorage.getItem('inex_activeId') || null;
  });
  const [files, setFiles] = useState<FileNode[]>(() => {
    const saved = localStorage.getItem('inex_files');
    return saved ? JSON.parse(saved) : [];
  });
  const [showFileManager, setShowFileManager] = useState(false);

  useEffect(() => { localStorage.setItem('inex_balance', balance.toString()); }, [balance]);
  useEffect(() => { if (activeId) localStorage.setItem('inex_activeId', activeId); else localStorage.removeItem('inex_activeId'); }, [activeId]);

  // Load data from DB on mount
  useEffect(() => {
    const loadData = async () => {
      const dbFiles = await getFilesFromDB();
      const dbConvs = await getConversationsFromDB();
      if (dbFiles) setFiles(dbFiles);
      if (dbConvs) setConversations(dbConvs);
      
      if (dbConvs.length === 0) {
        createNewConversation();
      }
    };
    loadData();
  }, []);

  // Save active conversation to DB (debounced)
  useEffect(() => {
    if (!activeId) return;
    const conv = conversations.find(c => c.id === activeId);
    if (!conv) return;

    const timeoutId = setTimeout(() => {
      saveConversationToDB(conv);
    }, 1000); // Debounce 1s

    return () => clearTimeout(timeoutId);
  }, [conversations, activeId]);

  const handleAddFile = async (file: FileNode) => {
    try {
      setFiles(prev => [...prev, file]);
      await saveFileToDB(file);
      addToast(`File "${file.name}" created successfully`, 'success');
    } catch (error) {
      console.error('Error adding file:', error);
      addToast('Failed to save file', 'error');
    }
  };

  const handleUpdateFile = async (file: FileNode) => {
    try {
      setFiles(prev => prev.map(f => f.id === file.id ? file : f));
      await saveFileToDB(file);
      addToast(`File "${file.name}" updated successfully`, 'success');
    } catch (error) {
      console.error('Error updating file:', error);
      addToast('Failed to update file', 'error');
    }
  };

  const handleDeleteFile = async (id: string) => {
    try {
      console.log('Deleting file:', id);
      // Recursive delete
      const getChildrenIds = (parentId: string): string[] => {
        const children = files.filter(f => f.parentId === parentId);
        return children.reduce((acc, child) => [...acc, child.id, ...getChildrenIds(child.id)], [] as string[]);
      };
      const idsToDelete = [id, ...getChildrenIds(id)];
      console.log('IDs to delete:', idsToDelete);
      
      setFiles(prev => prev.filter(f => !idsToDelete.includes(f.id)));
      
      await Promise.all(idsToDelete.map(delId => deleteFileFromDB(delId)));
      addToast('File deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting file:', error);
      addToast('Failed to delete file', 'error');
    }
  };

  const [selectedLevel, setSelectedLevel] = useState<string>('fast');
  const [showLevelSelector, setShowLevelSelector] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const selectedLevelObj = AI_LEVELS.find(l => l.id === selectedLevel) || AI_LEVELS[1];
  const theme = selectedLevelObj.theme;
  const isDangerous = theme.isDangerous;

  // Initialize first conversation if empty - moved to loadData
  // useEffect(() => {
  //   if (conversations.length === 0) {
  //     createNewConversation();
  //   }
  // }, []);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (attachments.length + files.length > 5) {
      alert('Maximum 5 files allowed.');
      return;
    }

    const validFiles = files.filter(f => f.size <= 100 * 1024 * 1024);
    if (validFiles.length < files.length) {
      alert('Some files exceed the 100MB limit and were skipped.');
    }

    const newAttachments = validFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      progress: 0
    }));

    setAttachments(prev => [...prev, ...newAttachments]);

    newAttachments.forEach(att => {
      const reader = new FileReader();
      reader.onprogress = (ev) => {
        if (ev.lengthComputable) {
          const progress = Math.round((ev.loaded / ev.total) * 100);
          setAttachments(prev => prev.map(a => a.id === att.id ? { ...a, progress } : a));
        }
      };
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setAttachments(prev => prev.map(a => a.id === att.id ? { ...a, progress: 100, base64, mimeType: att.file.type } : a));
      };
      reader.readAsDataURL(att.file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  };

  const filesRef = useRef(files);
  const settingsRef = useRef(settings);
  
  useEffect(() => { filesRef.current = files; }, [files]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const executeToolLogic = async (call: any) => {
    let result;
    let costToAdd = 0;
    const currentFiles = filesRef.current;
    const currentSettings = settingsRef.current;

    try {
      if (call.name === 'calculator') {
        result = Function('"use strict";return (' + call.args.expression + ')')();
      } else if (call.name === 'webSearch') {
        const res = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: call.args.query, apiKey: currentSettings.apiKeys.search[0] })
        });
        const data = await res.json();
        if (data.organic_results) {
          result = data.organic_results.slice(0, 3).map((r: any) => ({ title: r.title, link: r.link, snippet: r.snippet }));
        } else {
          result = data;
        }
      } else if (call.name === 'generateImage') {
        const imageAi = new GoogleGenAI({ apiKey: currentSettings.apiKeys.image[0] || process.env.GEMINI_API_KEY });
        const res = await imageAi.models.generateContent({
          model: call.args.model || 'gemini-2.5-flash-image',
          contents: call.args.prompt,
        });
        let base64Image = '';
        for (const part of res.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            base64Image = part.inlineData.data;
            break;
          }
        }
        if (base64Image) {
          result = { imageBase64: base64Image };
        } else {
          result = "Failed to generate image.";
        }
      } else if (call.name === 'generateAudio') {
        const audioAi = new GoogleGenAI({ apiKey: currentSettings.apiKeys.audio[0] || process.env.GEMINI_API_KEY });
        const res = await audioAi.models.generateContent({
          model: 'gemini-2.5-flash-preview-tts',
          contents: call.args.text,
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: call.args.voice || 'Kore' }
              }
            }
          }
        });
        const base64Audio = res.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
          try {
            const binaryStr = atob(base64Audio);
            const len = binaryStr.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) bytes[i] = binaryStr.charCodeAt(i);
            
            const pcm16 = new Int16Array(bytes.buffer);
            const wavHeader = new ArrayBuffer(44);
            const view = new DataView(wavHeader);
            
            const writeString = (offset: number, string: string) => {
              for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
            };
            
            writeString(0, 'RIFF');
            view.setUint32(4, 36 + pcm16.length * 2, true);
            writeString(8, 'WAVE');
            writeString(12, 'fmt ');
            view.setUint32(16, 16, true);
            view.setUint16(20, 1, true);
            view.setUint16(22, 1, true);
            view.setUint32(24, 24000, true);
            view.setUint32(28, 24000 * 2, true);
            view.setUint16(32, 2, true);
            view.setUint16(34, 16, true);
            writeString(36, 'data');
            view.setUint32(40, pcm16.length * 2, true);
            
            const wavBytes = new Uint8Array(44 + pcm16.length * 2);
            wavBytes.set(new Uint8Array(wavHeader), 0);
            wavBytes.set(new Uint8Array(pcm16.buffer), 44);
            
            let binary = '';
            const CHUNK_SIZE = 0x8000;
            for (let i = 0; i < wavBytes.length; i += CHUNK_SIZE) {
              binary += String.fromCharCode.apply(null, wavBytes.subarray(i, i + CHUNK_SIZE) as any);
            }
            const wavBase64 = btoa(binary);
            result = { audioBase64: wavBase64 };
          } catch (err) {
            console.error("Failed to convert PCM to WAV", err);
            result = { audioBase64: base64Audio };
          }
        } else {
          result = "Failed to generate audio.";
        }
      } else if (call.name === 'saveMemory') {
        const newMemory = {
          id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          content: call.args.content,
          createdAt: Date.now()
        };
        const newSettings = { ...currentSettings, memories: [...(currentSettings.memories || []), newMemory] };
        setSettings(newSettings);
        saveSettings(newSettings);
        result = `Memory saved successfully with ID: ${newMemory.id}`;
      } else if (call.name === 'updateMemory') {
        const memIndex = currentSettings.memories.findIndex(m => m.id === call.args.id);
        if (memIndex > -1) {
          const updatedMemories = [...currentSettings.memories];
          updatedMemories[memIndex].content = call.args.content;
          const newSettings = { ...currentSettings, memories: updatedMemories };
          setSettings(newSettings);
          saveSettings(newSettings);
          result = `Memory ${call.args.id} updated successfully.`;
        } else {
          result = `Memory with ID ${call.args.id} not found.`;
        }
      } else if (call.name === 'deleteMemory') {
        const memIndex = currentSettings.memories.findIndex(m => m.id === call.args.id);
        if (memIndex > -1) {
          const updatedMemories = currentSettings.memories.filter(m => m.id !== call.args.id);
          const newSettings = { ...currentSettings, memories: updatedMemories };
          setSettings(newSettings);
          saveSettings(newSettings);
          result = `Memory ${call.args.id} deleted successfully.`;
        } else {
          result = `Memory with ID ${call.args.id} not found.`;
        }
      } else if (['createFile', 'createFolder', 'deleteNode', 'readFile', 'editFile', 'renameNode', 'listFiles'].includes(call.name)) {
        if (call.name === 'createFile') {
          const newNode: FileNode = {
            id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: call.args.name,
            isFolder: false,
            parentId: call.args.parentId || null,
            content: call.args.content,
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          handleAddFile(newNode);
          result = `File created successfully with ID: ${newNode.id}`;
        } else if (call.name === 'createFolder') {
          const newNode: FileNode = {
            id: `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: call.args.name,
            isFolder: true,
            parentId: call.args.parentId || null,
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          handleAddFile(newNode);
          result = `Folder created successfully with ID: ${newNode.id}`;
        } else if (call.name === 'deleteNode') {
          const nodeExists = currentFiles.some(f => f.id === call.args.id);
          if (nodeExists) {
            handleDeleteFile(call.args.id);
            result = `Node and its children deleted successfully.`;
          } else {
            result = `Node with ID ${call.args.id} not found.`;
          }
        } else if (call.name === 'readFile') {
          const node = currentFiles.find(f => f.id === call.args.id);
          if (node && !node.isFolder) {
            result = node.content || "File is empty or binary.";
          } else {
            result = `File with ID ${call.args.id} not found or is a folder.`;
          }
        } else if (call.name === 'editFile') {
          const file = currentFiles.find(f => f.id === call.args.id);
          if (file && !file.isFolder) {
            handleUpdateFile({ ...file, content: call.args.content, updatedAt: Date.now() });
            result = `File ${call.args.id} edited successfully.`;
          } else {
            result = `File with ID ${call.args.id} not found or is a folder.`;
          }
        } else if (call.name === 'renameNode') {
          const file = currentFiles.find(f => f.id === call.args.id);
          if (file) {
            handleUpdateFile({ ...file, name: call.args.newName, updatedAt: Date.now() });
            result = `Node ${call.args.id} renamed to ${call.args.newName}.`;
          } else {
            result = `Node with ID ${call.args.id} not found.`;
          }
        } else if (call.name === 'listFiles') {
          const parentId = call.args.parentId || null;
          const children = currentFiles.filter(f => f.parentId === parentId).map(f => ({ id: f.id, name: f.name, isFolder: f.isFolder }));
          result = children.length > 0 ? children : "Folder is empty.";
        }
      } else {
        result = "Tool not supported.";
      }
    } catch (e) {
      result = "Error executing tool";
    }

    const getTokenCount = (obj: any) => {
      if (obj === undefined || obj === null) return 0;
      const str = typeof obj === 'string' ? obj : JSON.stringify(obj);
      return Math.ceil(str.length / 4);
    };

    const inputTokens = getTokenCount(call.args);
    const outputTokens = getTokenCount(result);
    const totalToolTokens = inputTokens + outputTokens;

    const getTokenCost = (tokens: number) => {
      return tokens * 0.0000025;
    };

    const inputTokensCost = getTokenCost(inputTokens);
    const outputTokensCost = getTokenCost(outputTokens);
    const totalTokenCost = inputTokensCost + outputTokensCost;

    if (call.name === 'webSearch') {
      costToAdd = (0.01 + totalTokenCost) * 1.1;
      if (currentSettings.apiKeys.search[0]) costToAdd = totalTokenCost * 1.1;
    } else if (call.name === 'calculator') {
      costToAdd = totalTokenCost * 1.1;
    } else if (call.name === 'generateImage') {
      const baseCost = call.args.model === 'gemini-3.1-flash-image-preview' ? 0.06 : 0.06;
      costToAdd = (baseCost + totalTokenCost) * 1.1;
      if (currentSettings.apiKeys.image[0]) costToAdd = totalTokenCost * 1.1;
    } else if (call.name === 'generateAudio') {
      const wordCount = call.args.text ? call.args.text.trim().split(/\s+/).length : 0;
      costToAdd = (0.01 + totalTokenCost + (wordCount * 0.005)) * 1.1;
      if (currentSettings.apiKeys.audio[0]) costToAdd = totalTokenCost * 1.1;
    } else if (['createFile', 'createFolder', 'deleteNode', 'readFile', 'editFile', 'renameNode', 'listFiles'].includes(call.name)) {
      costToAdd = (totalTokenCost + 0.005) * 1.1;
    } else if (['saveMemory', 'updateMemory', 'deleteMemory'].includes(call.name)) {
      costToAdd = (totalTokenCost + 0.005) * 1.1;
    }

    if (costToAdd > 0) {
      setBalance(prev => Math.max(0, prev - costToAdd));
    }

    return { result, costToAdd, inputTokens, outputTokens, totalToolTokens };
  };

  const runAI = async (convId: string, history: Message[]) => {
    setIsLoading(true);
    abortControllerRef.current = new AbortController();
    
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
            parts: [{ text: m.text ? m.text : `[Action: Calling tool ${m.pendingToolCall.name}]` }]
          };
        }
        if (m.role === 'function' && m.toolResult) {
          let resultText = '';
          if (m.toolResult.result?.audioBase64) {
            resultText = '[Audio Generated Successfully]';
          } else if (m.toolResult.result?.imageBase64) {
            resultText = '[Image Generated Successfully]';
          } else {
            resultText = typeof m.toolResult.result === 'string' ? m.toolResult.result : JSON.stringify(m.toolResult.result);
          }
          return {
            role: 'user',
            parts: [{ text: `[Tool Response from ${m.toolResult.name}]:\n${resultText}` }]
          };
        }
        
        const parts: any[] = [];
        if (m.text) parts.push({ text: m.text });
        if (m.attachments) {
          m.attachments.forEach(att => {
            parts.push({ inlineData: { data: att.base64, mimeType: att.mimeType } });
          });
        }
        return { role: m.role, parts };
      });

      const today = new Date().toISOString().split('T')[0];
      let sysInst = `You are INEX Agent, an advanced AI assistant. Format your responses using markdown.\nToday's Date: ${today}\n`;
      if (settings.name) sysInst += `User Name: ${settings.name}\n`;
      if (settings.email) sysInst += `User Email: ${settings.email}\n`;
      if (settings.phoneNumber) sysInst += `User Phone Number: ${settings.phoneNumber}\n`;
      if (settings.birthDate) sysInst += `User Birth Date: ${settings.birthDate}. Calculate their current age based on today's date. If they ask for age + 5, calculate it accordingly.\n`;
      if (settings.instructions) sysInst += `User Instructions: ${settings.instructions}\n`;
      
      if (settings.memoryEnabled) {
        sysInst += `\nCRITICAL INSTRUCTION FOR MEMORY: You MUST automatically use the 'saveMemory' tool to save any new personal facts, preferences, phone numbers, or details the user mentions about themselves. Do this proactively without asking for permission.\n`;
        if (settings.memories && settings.memories.length > 0) {
          sysInst += `\nUser Memories (You can use tools to add/update/delete these):\n`;
          settings.memories.forEach(m => { sysInst += `- [ID: ${m.id}] ${m.content}\n`; });
        }
      }
      if (settings.preferences && settings.preferences.length > 0) {
        sysInst += `\nUser Communication Preferences:\n`;
        settings.preferences.forEach(p => { sysInst += `- ${p}\n`; });
      }

      const activeTools = [calculatorTool, webSearchTool, imageGenerationTool, audioGenerationTool, createFileTool, createFolderTool, deleteNodeTool, readFileTool, editFileTool, renameNodeTool, listFilesTool];
      if (settings.memoryEnabled) {
        activeTools.push(saveMemoryTool, updateMemoryTool, deleteMemoryTool);
      }

      const config: any = {
        systemInstruction: sysInst,
        tools: [{ functionDeclarations: activeTools }]
      };

      const aiInstance = settings.apiKeys.text[0] ? new GoogleGenAI({ apiKey: settings.apiKeys.text[0] }) : ai;

      const stream = await aiInstance.models.generateContentStream({
        model: selectedLevelObj.model,
        contents: contents,
        config: config
      });

      let currentText = '';
      let pTokens = 0;
      let cTokens = 0;
      let functionCallFound: any = null;
      let isAborted = false;

      for await (const chunk of stream) {
        if (abortControllerRef.current?.signal.aborted) {
          isAborted = true;
          break;
        }

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

        // @ts-ignore
        if (chunk.functionCalls && chunk.functionCalls.length > 0) {
          // @ts-ignore
          functionCallFound = chunk.functionCalls[0];
          break; // Stop processing, need user approval
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

      if (isAborted) {
        setConversations(prev => prev.map(c => {
          if (c.id === convId) {
            return {
              ...c,
              messages: c.messages.map(m => m.id === modelMessageId ? { 
                ...m, 
                text: currentText + '\n\n*(Generation stopped by user)*',
                status: 'aborted'
              } : m)
            };
          }
          return c;
        }));
        setIsLoading(false);
        return;
      }

      if (functionCallFound) {
        // Estimate tokens if API didn't provide them (for function call scenario)
        if (pTokens === 0) {
          pTokens = Math.ceil(contents.reduce((acc, c) => {
            let size = 0;
            if (c.parts) {
              c.parts.forEach((p: any) => {
                if (p.text) size += p.text.length;
                if (p.inlineData) size += Math.ceil(p.inlineData.data.length / 4);
              });
            }
            return acc + size;
          }, 0) / 4);
        }
        if (cTokens === 0) {
          cTokens = Math.ceil(currentText.length / 4);
        }
        const totalTokens = pTokens + cTokens;

        const currentConv = conversations.find(c => c.id === convId);
        const mode = currentConv?.mode || 'manual';

        if (mode === 'auto') {
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
                  status: 'processing',
                  tokens: { prompt: pTokens, candidates: cTokens, total: totalTokens }
                } : m)
              };
            }
            return c;
          }));

          const call = { id: functionCallFound.id, name: functionCallFound.name, args: functionCallFound.args };
          const { result, costToAdd, inputTokens, outputTokens, totalToolTokens } = await executeToolLogic(call);

          const toolResMsg: Message = {
            id: `tool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            role: 'function',
            text: `Executed: ${call.name}`,
            timestamp: Date.now(),
            status: 'done',
            toolResult: { id: call.id, name: call.name, result: result, cost: costToAdd },
            tokens: { prompt: inputTokens, candidates: outputTokens, total: totalToolTokens }
          };

          const modelMsg: Message = {
             id: modelMessageId,
             role: 'model',
             text: currentText,
             timestamp: Date.now(), // approximate
             status: 'done',
             pendingToolCall: call,
             tokens: { prompt: pTokens, candidates: cTokens, total: totalTokens }
          };

          // We need to update the conversation with the completed model message AND the tool result
          // But wait, the model message is already in the state (as processing/waiting).
          // We need to update it to done, and append the tool result.
          
          const newHistory = [...history, modelMsg, toolResMsg];

          setConversations(prev => prev.map(c => c.id === convId ? {
            ...c,
            messages: c.messages.map(m => m.id === modelMessageId ? { ...m, status: 'done' as MessageStatus } : m).concat(toolResMsg)
          } : c));

          await runAI(convId, newHistory);
          return;
        }

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
                status: 'waiting_approval',
                tokens: { prompt: pTokens, candidates: cTokens, total: totalTokens }
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
        pTokens = Math.ceil(contents.reduce((acc, c) => {
          let size = 0;
          if (c.parts) {
            c.parts.forEach((p: any) => {
              if (p.text) size += p.text.length;
              if (p.inlineData) size += Math.ceil(p.inlineData.data.length / 4);
            });
          }
          return acc + size;
        }, 0) / 4);
      }
      if (cTokens === 0) {
        cTokens = Math.ceil(currentText.length / 4);
      }

      const totalTokens = pTokens + cTokens;
      const cost = (pTokens * (selectedLevelObj.inPrice / 1000000)) + (cTokens * (selectedLevelObj.outPrice / 1000000));
      const finalCost = settings.apiKeys.text[0] ? 0 : cost * 1.1; // Add 10%

      setBalance(prev => Math.max(0, prev - finalCost));

      setConversations(prev => prev.map(c => {
        if (c.id === convId) {
          return {
            ...c,
            messages: c.messages.map(m => m.id === modelMessageId ? { 
              ...m, 
              text: currentText,
              tokens: { prompt: pTokens, candidates: cTokens, total: totalTokens },
              cost: finalCost,
              duration: duration,
              status: 'done'
            } : m)
          };
        }
        return c;
      }));

    } catch (error: any) {
      if (error.name === 'AbortError' || abortControllerRef.current?.signal.aborted) {
        setConversations(prev => prev.map(c => {
          if (c.id === convId) {
            return {
              ...c,
              messages: c.messages.map(m => m.id === modelMessageId ? { 
                ...m, 
                text: m.text + '\n\n*(Generation stopped by user)*',
                status: 'aborted'
              } : m)
            };
          }
          return c;
        }));
      } else {
        console.error("Error sending message:", error);
        let errorMsg = 'An error occurred while generating the response. Please try again or select a different model.';
        if (error?.message?.includes('maximum number of tokens allowed') || error?.message?.includes('exceeds the maximum')) {
          errorMsg = 'Error: The input token count exceeds the maximum allowed by this model (1,048,576 tokens). Please start a new conversation or remove some attachments.';
        }
        setConversations(prev => prev.map(c => {
          if (c.id === convId) {
            return {
              ...c,
              messages: c.messages.map(m => m.id === modelMessageId ? { 
                ...m, 
                text: errorMsg,
                status: 'error'
              } : m)
            };
          }
          return c;
        }));
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleSend = async () => {
    // Only block send if input is empty AND no attachments are ready
    const hasReadyAttachments = attachments.length > 0 && attachments.every(a => a.progress === 100);
    if ((!input.trim() && !hasReadyAttachments) || isLoading || !activeId) return;

    // Wait for all attachments to finish uploading (converting to base64)
    if (attachments.some(a => a.progress < 100)) {
      alert("Please wait for files to finish uploading.");
      return;
    }

    const userText = input.trim();
    const timestamp = Date.now();
    const userMessageId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const messageAttachments = attachments.map(a => {
      let mime = a.mimeType || 'application/octet-stream';
      if (mime === 'application/json' || mime.includes('json')) mime = 'text/plain';
      return {
        name: a.file.name,
        mimeType: mime,
        base64: a.base64!
      };
    });

    const userMessage: Message = { 
      id: userMessageId, 
      role: 'user', 
      text: userText, 
      timestamp, 
      status: 'sending',
      attachments: messageAttachments.length > 0 ? messageAttachments : undefined
    };

    let currentConv = conversations.find(c => c.id === activeId);
    if (!currentConv) return;

    const updatedMessages = [...currentConv.messages, userMessage];
    
    setConversations(prev => prev.map(c => c.id === activeId ? {
      ...c,
      messages: updatedMessages,
      updatedAt: timestamp,
      title: c.messages.length === 0 ? (userText.slice(0, 30) || 'File Upload') + (userText.length > 30 ? '...' : '') : c.title
    } : c));
    
    setInput('');
    setAttachments([]);
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

    const userMsgCount = updatedMessages.filter(m => m.role === 'user').length;
    const isABTest = userMsgCount > 0 && userMsgCount % 10 === 0;

    if (isABTest) {
      await runABTest(activeId, updatedMessages);
    } else {
      await runAI(activeId, updatedMessages);
    }
  };

  const runABTest = async (convId: string, history: Message[]) => {
    setIsLoading(true);
    const modelMessageId = `model-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    setConversations(prev => prev.map(c => {
      if (c.id === convId) {
        return {
          ...c,
          updatedAt: Date.now(),
          messages: [...c.messages, { id: modelMessageId, role: 'model', text: '', status: 'processing', timestamp: Date.now() }]
        };
      }
      return c;
    }));

    try {
      const contents = history.map(m => {
        if (m.role === 'model' && m.pendingToolCall) {
          return {
            role: 'model',
            parts: [{ text: m.text ? m.text : `[Action: Calling tool ${m.pendingToolCall.name}]` }]
          };
        }
        if (m.role === 'function' && m.toolResult) {
          let resultText = '';
          if (m.toolResult.result?.audioBase64) {
            resultText = '[Audio Generated Successfully]';
          } else if (m.toolResult.result?.imageBase64) {
            resultText = '[Image Generated Successfully]';
          } else {
            resultText = typeof m.toolResult.result === 'string' ? m.toolResult.result : JSON.stringify(m.toolResult.result);
          }
          return {
            role: 'user',
            parts: [{ text: `[Tool Response from ${m.toolResult.name}]:\n${resultText}` }]
          };
        }
        
        const parts: any[] = [];
        if (m.text) parts.push({ text: m.text });
        if (m.attachments) {
          m.attachments.forEach(att => {
            parts.push({ inlineData: { data: att.base64, mimeType: att.mimeType } });
          });
        }
        return { role: m.role, parts };
      });

      const selectedLevelObj = AI_LEVELS.find(l => l.id === selectedLevel) || AI_LEVELS[0];
      const today = new Date().toISOString().split('T')[0];
      
      let sysInst = `You are INEX Agent, an advanced AI assistant. Format your responses using markdown.\nToday's Date: ${today}\n`;
      if (settings.name) sysInst += `User Name: ${settings.name}\n`;
      if (settings.email) sysInst += `User Email: ${settings.email}\n`;
      if (settings.phoneNumber) sysInst += `User Phone Number: ${settings.phoneNumber}\n`;
      if (settings.birthDate) sysInst += `User Birth Date: ${settings.birthDate}. Calculate their current age based on today's date. If they ask for age + 5, calculate it accordingly.\n`;
      if (settings.instructions) sysInst += `User Instructions: ${settings.instructions}\n`;
      
      if (settings.memoryEnabled) {
        sysInst += `\nCRITICAL INSTRUCTION FOR MEMORY: You MUST automatically use the 'saveMemory' tool to save any new personal facts, preferences, phone numbers, or details the user mentions about themselves. Do this proactively without asking for permission.\n`;
        if (settings.memories && settings.memories.length > 0) {
          sysInst += `\nUser Memories:\n`;
          settings.memories.forEach(m => { sysInst += `- [ID: ${m.id}] ${m.content}\n`; });
        }
      }
      if (settings.preferences && settings.preferences.length > 0) {
        sysInst += `\nUser Communication Preferences:\n`;
        settings.preferences.forEach(p => { sysInst += `- ${p}\n`; });
      }

      const activeTools = [calculatorTool, webSearchTool, imageGenerationTool, audioGenerationTool, createFileTool, createFolderTool, deleteNodeTool, readFileTool, editFileTool, renameNodeTool, listFilesTool];
      if (settings.memoryEnabled) {
        activeTools.push(saveMemoryTool, updateMemoryTool, deleteMemoryTool);
      }

      const configA = { systemInstruction: sysInst + "\n\nRespond with a highly concise, analytical, and direct tone.", tools: [{ functionDeclarations: activeTools }] };
      const configB = { systemInstruction: sysInst + "\n\nRespond with a warm, creative, and highly detailed tone.", tools: [{ functionDeclarations: activeTools }] };

      const aiInstance = settings.apiKeys.text[0] ? new GoogleGenAI({ apiKey: settings.apiKeys.text[0] }) : ai;

      const [resA, resB] = await Promise.all([
        aiInstance.models.generateContent({ model: selectedLevelObj.model, contents, config: configA }),
        aiInstance.models.generateContent({ model: selectedLevelObj.model, contents, config: configB })
      ]);

      setConversations(prev => prev.map(c => c.id === convId ? {
        ...c,
        messages: c.messages.map(m => m.id === modelMessageId ? {
          ...m,
          status: 'waiting_variant_selection',
          variants: [
            { id: 'A', text: resA.text || 'No response', tone: 'Concise & Analytical' },
            { id: 'B', text: resB.text || 'No response', tone: 'Warm & Detailed' }
          ]
        } : m)
      } : c));
    } catch (error) {
      console.error("A/B Test Error:", error);
      setConversations(prev => prev.map(c => c.id === convId ? {
        ...c,
        messages: c.messages.map(m => m.id === modelMessageId ? { ...m, text: 'Error generating variants.', status: 'error' } : m)
      } : c));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectVariant = (msgId: string, variant: { id: string, text: string, tone: string }) => {
    const newSettings = { ...settings, preferences: [...(settings.preferences || []), `User prefers ${variant.tone} tone.`] };
    setSettings(newSettings);
    saveSettings(newSettings);
    
    setConversations(prev => prev.map(c => c.id === activeId ? {
      ...c,
      messages: c.messages.map(m => m.id === msgId ? {
        ...m,
        text: variant.text,
        status: 'done',
        variants: undefined
      } : m)
    } : c));
  };

  const handleApproveTool = async (convId: string, msgId: string) => {
    const conv = conversations.find(c => c.id === convId);
    if (!conv) return;
    const msg = conv.messages.find(m => m.id === msgId);
    if (!msg || !msg.pendingToolCall) return;

    const call = msg.pendingToolCall;
    
    // Set status to processing while tool runs
    setConversations(prev => prev.map(c => c.id === convId ? {
      ...c,
      messages: c.messages.map(m => m.id === msgId ? { ...m, status: 'processing' as MessageStatus } : m)
    } : c));

    const { result, costToAdd, inputTokens, outputTokens, totalToolTokens } = await executeToolLogic(call);

    const toolResMsg: Message = {
      id: `tool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: 'function',
      text: `Executed: ${call.name}`,
      timestamp: Date.now(),
      status: 'done',
      toolResult: { id: call.id, name: call.name, result: result, cost: costToAdd },
      tokens: { prompt: inputTokens, candidates: outputTokens, total: totalToolTokens }
    };

    const updatedHistory = conv.messages.map(m => m.id === msgId ? { ...m, status: 'done' as MessageStatus } : m).concat(toolResMsg);

    setConversations(prev => prev.map(c => c.id === convId ? {
      ...c,
      messages: updatedHistory
    } : c));

    await runAI(convId, updatedHistory);
  };

  const toggleAutoMode = () => {
    if (!activeId) return;
    setConversations(prev => prev.map(c => c.id === activeId ? { ...c, mode: c.mode === 'auto' ? 'manual' : 'auto' } : c));
  };

  const handleRejectTool = async (convId: string, msgId: string) => {
    const conv = conversations.find(c => c.id === convId);
    if (!conv) return;
    const msg = conv.messages.find(m => m.id === msgId);
    if (!msg || !msg.pendingToolCall) return;

    const call = msg.pendingToolCall;
    const rejectionText = "User denied permission to run this tool.";
    const rejectionTokens = Math.ceil(rejectionText.length / 4);
    
    const toolResMsg: Message = {
      id: `tool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: 'function',
      text: `User rejected tool execution.`,
      timestamp: Date.now(),
      status: 'done',
      toolResult: { id: call.id, name: call.name, result: rejectionText },
      tokens: { prompt: 0, candidates: rejectionTokens, total: rejectionTokens }
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

  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showFileManagerSelect, setShowFileManagerSelect] = useState(false);

  const handleSelectFromFileManager = (file: FileNode) => {
    if (attachments.length >= 5) {
      alert("Maximum 5 files allowed.");
      return;
    }
    
    // Create a mock File object or just use the base64/content directly
    // For simplicity, we'll convert it to a File object
    let blob: Blob;
    if (file.base64 && file.mimeType) {
      const byteCharacters = atob(file.base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      blob = new Blob([byteArray], { type: file.mimeType });
    } else {
      blob = new Blob([file.content || ''], { type: 'text/plain' });
    }
    
    const newFile = new File([blob], file.name, { type: file.mimeType || 'text/plain' });
    
    if (newFile.size > 100 * 1024 * 1024) {
      alert(`File ${file.name} exceeds 100MB limit.`);
      return;
    }

    const newAtt: Attachment = {
      id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file: newFile,
      progress: 100,
      base64: file.base64 || btoa(unescape(encodeURIComponent(file.content || ''))),
      mimeType: file.mimeType || 'text/plain'
    };

    setAttachments(prev => [...prev, newAtt]);
    setShowFileManagerSelect(false);
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
      if (status === 'processing') return <Loader2 className={`w-3 h-3 animate-spin ${theme.text}`} />;
      if (status === 'waiting_approval') return <Clock className="w-3 h-3 text-yellow-400 animate-pulse" />;
      if (status === 'error') return <AlertTriangle className="w-3 h-3 text-red-400" />;
      if (status === 'done') return <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />;
      if (status === 'aborted') return <Square className="w-3 h-3 text-zinc-500" />;
      return null;
    }
  };

  const ToolOutputViewer = ({ name, result, cost }: { name: string, result: any, cost?: number }) => {
    const [expanded, setExpanded] = useState(false);
    let Icon = Calculator;
    if (name === 'webSearch') Icon = Globe;
    if (name === 'generateImage') Icon = ImageIcon;
    if (name === 'generateAudio') Icon = Mic;
    if (name.includes('Memory')) Icon = Brain;

    if (result?.imageBase64) {
      return (
        <div className="mt-2 rounded-xl overflow-hidden border border-white/10 bg-black/20 backdrop-blur-md p-2">
          <img src={`data:image/jpeg;base64,${result.imageBase64}`} alt="Generated" className="w-full rounded-lg" />
          <div className="mt-2 flex justify-between items-center">
            {cost !== undefined && cost > 0 ? (
              <span className="text-xs font-medium text-zinc-400 px-2">Cost: ${cost.toFixed(4)}</span>
            ) : <span />}
            <a href={`data:image/jpeg;base64,${result.imageBase64}`} download="generated-image.jpg" className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors active:scale-95 border border-white/10">
              <Download className="w-3.5 h-3.5" /> Download
            </a>
          </div>
        </div>
      );
    }

    if (result?.audioBase64) {
      return (
        <div className="mt-2 rounded-xl overflow-hidden border border-white/10 bg-black/20 backdrop-blur-md p-3">
          <audio controls src={`data:audio/wav;base64,${result.audioBase64}`} className="w-full" />
          <div className="mt-2 flex justify-between items-center">
            {cost !== undefined && cost > 0 ? (
              <span className="text-xs font-medium text-zinc-400 px-2">Cost: ${cost.toFixed(4)}</span>
            ) : <span />}
            <a href={`data:audio/wav;base64,${result.audioBase64}`} download="generated-audio.wav" className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors active:scale-95 border border-white/10">
              <Download className="w-3.5 h-3.5" /> Download Audio
            </a>
          </div>
        </div>
      );
    }

    return (
      <div className="mt-2 rounded-xl overflow-hidden border border-white/10 bg-black/20 backdrop-blur-md">
        <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-white/5 transition-colors">
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${theme.text}`} />
            <span className="capitalize">{name} output</span>
            {cost !== undefined && cost > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-md bg-white/10 text-[10px] font-mono text-zinc-400 border border-white/5">
                ${cost.toFixed(4)}
              </span>
            )}
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
              <pre className="text-zinc-300 overflow-x-auto whitespace-pre-wrap">{typeof result === 'string' ? result : JSON.stringify(result, null, 2)}</pre>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const togglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversations(prev => prev.map(c => c.id === id ? { ...c, pinned: !c.pinned } : c));
  };

  const deleteConv = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const editTitle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTitle = prompt('Enter new title:');
    if (newTitle) {
      setConversations(prev => prev.map(c => c.id === id ? { ...c, title: newTitle } : c));
    }
  };

  const exportConv = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const conv = conversations.find(c => c.id === id);
    if (!conv) return;
    const data = JSON.stringify(conv, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-[100dvh] w-full bg-black text-zinc-100 font-sans overflow-hidden selection:bg-blue-500/30 relative">
      
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        currentSettings={settings} 
        onSave={(s) => { setSettings(s); saveSettings(s); }} 
      />

      {showFileManager && (
        <FileManagerModal 
          files={files} 
          onAddFile={handleAddFile}
          onUpdateFile={handleUpdateFile}
          onDeleteFile={handleDeleteFile}
          onClose={() => setShowFileManager(false)} 
          onError={(msg) => addToast(msg, 'error')}
        />
      )}

      {showFileManagerSelect && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowFileManagerSelect(false)} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-md bg-[#111111] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[80vh]"
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Folder className="w-5 h-5 text-blue-400" />
                Select File
              </h2>
              <button onClick={() => setShowFileManagerSelect(false)} className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
              {files.filter(f => !f.isFolder).length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-sm">No files available.</div>
              ) : (
                <div className="space-y-1">
                  {files.filter(f => !f.isFolder).map(file => (
                    <button 
                      key={file.id}
                      onClick={() => handleSelectFromFileManager(file)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-colors text-left"
                    >
                      {getFileIcon(file)}
                      <span className="text-sm font-medium text-zinc-200 truncate">{file.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
      
      {/* Liquid Glass Background Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 transition-colors duration-1000">
        <div className={`absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full mix-blend-screen filter blur-[100px] opacity-30 animate-blob transition-colors duration-1000 ${theme.blob1}`}></div>
        <div className={`absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] rounded-full mix-blend-screen filter blur-[100px] opacity-30 animate-blob animation-delay-2000 transition-colors duration-1000 ${theme.blob2}`}></div>
        <div className={`absolute bottom-[-20%] left-[20%] w-[60vw] h-[60vw] rounded-full mix-blend-screen filter blur-[100px] opacity-30 animate-blob animation-delay-4000 transition-colors duration-1000 ${theme.blob3}`}></div>
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
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-lg transition-colors duration-500 ${theme.blob1} shadow-black/50`}>
              <Bot className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-white">INEX Agent</h1>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowSettings(true)} className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 active:bg-white/5">
              <SettingsIcon className="w-5 h-5" />
            </button>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden p-2 -mr-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 active:bg-white/5">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="p-3 shrink-0 flex gap-2">
          <button 
            onClick={createNewConversation} 
            className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white py-2.5 rounded-xl font-medium transition-colors active:scale-95 border border-white/10"
          >
            <Plus className="w-4 h-4" /> New Chat
          </button>
          <button 
            onClick={() => setShowFileManager(true)} 
            className="p-2.5 flex items-center justify-center bg-white/5 hover:bg-white/10 text-zinc-300 rounded-xl transition-colors active:scale-95 border border-white/5"
            title="File Manager"
          >
            <Folder className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-1 pb-4 custom-scrollbar">
          <div className="px-3 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Conversations</div>
          {[...conversations].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)).map((conv) => (
            <div key={conv.id} className="group relative flex items-center">
              <button 
                onClick={() => { setActiveId(conv.id); setSidebarOpen(false); }} 
                className={`w-full text-left px-3 py-3 rounded-xl text-sm truncate transition-all flex items-center gap-3 pr-[120px] ${activeId === conv.id ? 'bg-white/10 text-white shadow-sm border border-white/10' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent active:bg-white/5'}`}
              >
                <MessageSquare className={`w-4 h-4 shrink-0 ${activeId === conv.id ? theme.text : 'opacity-70'}`} />
                <span className="truncate text-[15px] md:text-sm flex-1">{conv.pinned && <Pin className="w-3 h-3 inline mr-1 text-yellow-500" />}{conv.title}</span>
              </button>
              <div className="absolute right-2 flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-md rounded-lg p-0.5 border border-white/10">
                <button onClick={(e) => togglePin(conv.id, e)} className="p-1.5 text-zinc-400 hover:text-yellow-400 hover:bg-white/10 rounded-md" title="Pin"><Pin className="w-3.5 h-3.5" /></button>
                <button onClick={(e) => editTitle(conv.id, e)} className="p-1.5 text-zinc-400 hover:text-blue-400 hover:bg-white/10 rounded-md" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={(e) => exportConv(conv.id, e)} className="p-1.5 text-zinc-400 hover:text-emerald-400 hover:bg-white/10 rounded-md" title="Export"><Download className="w-3.5 h-3.5" /></button>
                <button onClick={(e) => deleteConv(conv.id, e)} className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-white/10 rounded-md" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
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
        <header className={`h-14 border-b flex items-center justify-between px-3 md:px-4 shrink-0 z-20 pt-safe glass-panel transition-colors duration-500 ${theme.border}`}>
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
          <div className="relative flex items-center gap-4">
            {activeId && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-zinc-400">Auto Driven</span>
                <button
                  onClick={toggleAutoMode}
                  className={`w-10 h-5 rounded-full p-1 transition-colors ${activeConversation?.mode === 'auto' ? 'bg-blue-500' : 'bg-zinc-700'}`}
                >
                  <motion.div 
                    layout
                    className="w-3 h-3 rounded-full bg-white shadow-sm"
                    animate={{ x: activeConversation?.mode === 'auto' ? 20 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>
            )}
            
            <div className="relative">
              <button 
                onClick={() => setShowLevelSelector(!showLevelSelector)} 
                className={`flex items-center gap-2.5 border px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 active:scale-95 shadow-lg hover:shadow-xl ${theme.bg} ${theme.border} text-white hover:brightness-110`}
              >
              <div className="p-1 bg-white/20 rounded-full">
                {React.createElement(selectedLevelObj.icon, { className: "w-3.5 h-3.5 text-white" })}
              </div>
              <span>{selectedLevelObj.name}</span>
              <ChevronDown className={`w-4 h-4 text-white/70 ml-1 transition-transform duration-300 ${showLevelSelector ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showLevelSelector && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowLevelSelector(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: -10, scale: 0.95 }} 
                    animate={{ opacity: 1, y: 0, scale: 1 }} 
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className={`absolute right-0 top-full mt-3 w-[320px] bg-[#0a0a0a]/95 backdrop-blur-xl border ${theme.border} rounded-2xl shadow-2xl z-30 overflow-hidden ring-1 ring-white/10`}
                  >
                    <div className="p-2 grid grid-cols-1 gap-1 max-h-[60vh] overflow-y-auto custom-scrollbar">
                      <div className="px-3 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Select Model</div>
                      {AI_LEVELS.map(level => {
                        const Icon = level.icon;
                        const isSelected = selectedLevel === level.id;
                        return (
                          <button
                            key={level.id}
                            onClick={() => { setSelectedLevel(level.id); setShowLevelSelector(false); }}
                            className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all duration-200 group ${isSelected ? 'bg-white/10 border border-white/5' : 'hover:bg-white/5 border border-transparent'}`}
                          >
                            <div className={`p-2 rounded-lg ${isSelected ? level.theme.bg : 'bg-white/5 group-hover:bg-white/10'} transition-colors`}>
                              <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : level.theme.text}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className={`font-medium text-sm ${isSelected ? 'text-white' : 'text-zinc-300 group-hover:text-zinc-200'}`}>{level.name}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                              </div>
                              <p className="text-[11px] text-zinc-500 group-hover:text-zinc-400 truncate">{level.desc}</p>
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
          </div>
        </header>

        {/* Chat Area */}
        <div className={`flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar scroll-smooth transition-colors duration-500 ${activeConversation?.mode === 'auto' ? 'bg-blue-900/5' : ''}`}>
          {activeConversation?.mode === 'auto' && (
            <div className="absolute top-16 left-0 right-0 z-10 flex justify-center pointer-events-none">
              <div className="bg-blue-500/10 border border-blue-500/20 text-blue-200 text-xs px-3 py-1 rounded-full backdrop-blur-md shadow-lg flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                Auto Driven Mode Active
              </div>
            </div>
          )}
          {activeConversation?.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto px-4">
              <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-4 border transition-colors duration-500 ${theme.bgLight} ${theme.border}`}>
                <Bot className={`w-8 h-8 ${theme.text}`} />
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
                        <ToolOutputViewer name={msg.toolResult?.name || 'Tool'} result={msg.toolResult?.result} cost={msg.toolResult?.cost} />
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
                      className={`max-w-[85%] md:max-w-[75%] px-4 py-3 rounded-2xl backdrop-blur-md border transition-colors duration-500 ${
                        msg.role === 'user'
                          ? `text-white rounded-br-sm ${theme.bg} ${theme.border}`
                          : msg.status === 'error' 
                            ? 'bg-red-950/40 text-red-200 rounded-bl-sm border-red-900/50'
                            : 'bg-white/5 text-zinc-200 rounded-bl-sm border-white/10'
                      }`}
                    >
                      {/* Attachments Display */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {msg.attachments.map((att, i) => (
                            <div key={i} className="flex items-center gap-2 bg-black/40 border border-white/10 px-2.5 py-1.5 rounded-lg text-xs">
                              {att.mimeType?.startsWith('image/') ? (
                                <img src={`data:${att.mimeType};base64,${att.base64}`} alt={att.name} className="w-8 h-8 object-cover rounded" />
                              ) : (
                                <FileText className="w-3.5 h-3.5 text-zinc-400" />
                              )}
                              <span className="truncate max-w-[150px]">{att.name}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {msg.role === 'model' ? (
                        <div className="markdown-body text-[15px] leading-relaxed break-words">
                          {msg.text ? (
                            <>
                              <Markdown components={{ code: CodeBlock }}>{msg.text}</Markdown>
                              {/* Typewriter Cursor */}
                              {isLoading && index === activeConversation.messages.length - 1 && msg.status !== 'error' && msg.status !== 'waiting_approval' && msg.status !== 'aborted' && (
                                <span className="typewriter-cursor" />
                              )}
                            </>
                          ) : (
                            msg.status !== 'waiting_approval' && msg.status !== 'waiting_variant_selection' && <span className="typewriter-cursor" />
                          )}
                          
                          {/* A/B Testing Variants */}
                          {msg.status === 'waiting_variant_selection' && msg.variants && (
                            <div className="mt-4 space-y-4 w-full">
                              <p className="text-sm text-blue-400 font-medium flex items-center gap-2"><Sparkles className="w-4 h-4"/> Help me learn! Which response is better?</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                                {msg.variants.map(v => (
                                  <div key={v.id} className="bg-black/40 border border-white/10 rounded-xl p-4 hover:border-blue-500/50 cursor-pointer transition-colors flex flex-col" onClick={() => handleSelectVariant(msg.id, v)}>
                                    <div className="text-xs text-zinc-500 mb-2 uppercase tracking-wider font-semibold">{v.tone}</div>
                                    <div className="markdown-body text-sm flex-1"><Markdown components={{ code: CodeBlock }}>{v.text}</Markdown></div>
                                    <button className="mt-4 w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium transition-colors border border-white/5">Select This</button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Tool Approval UI */}
                          {msg.pendingToolCall && msg.status === 'waiting_approval' && (
                            <div className="mt-4 p-4 rounded-xl bg-black/40 border border-white/10 backdrop-blur-md">
                              <div className={`flex items-center gap-2 mb-2 ${theme.text}`}>
                                {msg.pendingToolCall.name === 'webSearch' ? <Globe className="w-4 h-4" /> : <Wrench className="w-4 h-4" />}
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
                          {(msg.status === 'error' || msg.status === 'aborted') && (
                            <div className="mt-4 flex items-center gap-2">
                              {msg.status === 'error' && <AlertTriangle className="w-4 h-4 text-red-400" />}
                              <button 
                                onClick={() => handleRegenerate(msg.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors active:scale-95 border border-white/10"
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
                    <div className={`flex flex-wrap items-center gap-3 mt-1.5 px-1 text-[11px] font-medium ${msg.role === 'user' ? theme.text + ' flex-row-reverse opacity-80' : 'text-zinc-500'}`}>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3 opacity-70" /> {formatTime(msg.timestamp)}</span>
                      
                      {/* Status Indicator */}
                      <span className="flex items-center gap-1">
                        <StatusIcon status={msg.status} role={msg.role} />
                        <span className="capitalize">{msg.status.replace('_', ' ')}</span>
                      </span>

                      {msg.duration !== undefined && msg.status !== 'error' && msg.status !== 'aborted' && (
                        <span className="flex items-center gap-1 opacity-80"><Timer className="w-3 h-3 opacity-70" /> {(msg.duration / 1000).toFixed(1)}s</span>
                      )}
                      
                      {msg.tokens && msg.status !== 'error' && msg.status !== 'aborted' && (
                        <span className="flex items-center gap-1"><Activity className="w-3 h-3 opacity-70" /> {msg.tokens.total} tkns</span>
                      )}
                      
                      {msg.cost !== undefined && msg.status !== 'error' && msg.status !== 'aborted' && (
                        <span className="flex items-center gap-1 text-emerald-500/80"><Coins className="w-3 h-3 opacity-70" /> ${msg.cost.toFixed(6)}</span>
                      )}

                      {/* Copy Button */}
                      {msg.status !== 'error' && msg.status !== 'waiting_approval' && msg.status !== 'waiting_variant_selection' && (
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
        <div className={`flex-none p-3 pb-safe z-20 glass-panel border-t transition-colors duration-500 ${theme.border}`}>
          <div className="max-w-3xl mx-auto">
            {/* Attachments Preview */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3 px-1">
                {attachments.map(att => (
                  <div key={att.id} className="relative flex items-center gap-2 bg-black/40 border border-white/10 px-3 py-2 rounded-xl text-sm w-full sm:w-auto">
                    {att.mimeType?.startsWith('image/') && att.base64 ? (
                      <img src={`data:${att.mimeType};base64,${att.base64}`} alt={att.file.name} className="w-8 h-8 object-cover rounded" />
                    ) : (
                      <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-zinc-200 pr-6">{att.file.name}</div>
                      <div className="w-full bg-white/10 h-1 rounded-full mt-1.5 overflow-hidden">
                        <div className={`h-full ${theme.blob1} transition-all duration-300`} style={{ width: `${att.progress}%` }} />
                      </div>
                    </div>
                    <button onClick={() => removeAttachment(att.id)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white rounded-full hover:bg-white/10">
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2">
              <div className={`flex-1 rounded-3xl border transition-colors flex items-end bg-black/40 backdrop-blur-md ${theme.border} ${theme.focus}`}>
                <input 
                  type="file" 
                  multiple 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect}
                />
                <div className="relative">
                  <button 
                    onClick={() => setShowAttachMenu(!showAttachMenu)}
                    className="p-3.5 text-zinc-400 hover:text-white transition-colors"
                    title="Attach file"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  
                  <AnimatePresence>
                    {showAttachMenu && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-full left-0 mb-2 w-48 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50"
                      >
                        <button 
                          onClick={() => { setShowAttachMenu(false); fileInputRef.current?.click(); }}
                          className="w-full flex items-center gap-2 px-4 py-3 text-sm text-zinc-300 hover:bg-white/5 transition-colors text-left"
                        >
                          <FileText className="w-4 h-4" /> Local Device
                        </button>
                        <button 
                          onClick={() => { setShowAttachMenu(false); setShowFileManagerSelect(true); }}
                          className="w-full flex items-center gap-2 px-4 py-3 text-sm text-zinc-300 hover:bg-white/5 transition-colors text-left border-t border-white/5"
                        >
                          <Folder className="w-4 h-4" /> File Manager
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
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
                  className="w-full bg-transparent pr-4 py-3.5 max-h-[120px] text-[15px] text-zinc-200 placeholder-zinc-500 focus:outline-none resize-none hide-scrollbar"
                  rows={1}
                  disabled={isLoading}
                />
              </div>
              
              {isLoading ? (
                <button
                  onClick={handleStopGeneration}
                  className="p-3.5 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95 bg-white/10 text-white hover:bg-white/20 border border-white/10 shadow-lg"
                  title="Stop generating"
                >
                  <Square className="w-5 h-5 fill-current" />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={(!input.trim() && attachments.length === 0) || isLoading}
                  className={`p-3.5 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95 ${
                    (input.trim() || attachments.length > 0) && !isLoading
                      ? `${theme.blob1} text-white shadow-lg shadow-black/50`
                      : 'bg-white/5 text-zinc-600 border border-white/10'
                  }`}
                >
                  <Send className="w-5 h-5 ml-0.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
