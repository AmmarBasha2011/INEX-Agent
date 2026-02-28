import React, { useState, useEffect } from 'react';
import { X, Save, Key, User, Settings as SettingsIcon, Plus, Trash2, Brain, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type Settings = {
  name: string;
  email: string;
  phoneNumber: string;
  birthDate: string;
  instructions: string;
  memoryEnabled: boolean;
  memories: { id: string; content: string; createdAt: number }[];
  preferences: string[];
  apiKeys: {
    text: string[];
    image: string[];
    audio: string[];
    search: string[];
  };
};

export const defaultSettings: Settings = {
  name: '',
  email: '',
  phoneNumber: '',
  birthDate: '',
  instructions: '',
  memoryEnabled: false,
  memories: [],
  preferences: [],
  apiKeys: { text: [], image: [], audio: [], search: [] }
};

export const loadSettings = (): Settings => {
  const saved = localStorage.getItem('inex_settings');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return { 
        ...defaultSettings, 
        ...parsed, 
        memories: parsed.memories || [], 
        preferences: parsed.preferences || [] 
      };
    } catch (e) {
      return defaultSettings;
    }
  }
  return defaultSettings;
};

export const saveSettings = (settings: Settings) => {
  localStorage.setItem('inex_settings', JSON.stringify(settings));
};

export default function SettingsModal({ isOpen, onClose, currentSettings, onSave }: { isOpen: boolean, onClose: () => void, currentSettings: Settings, onSave: (s: Settings) => void }) {
  const [settings, setSettings] = useState<Settings>(currentSettings);
  const [activeTab, setActiveTab] = useState<'profile' | 'keys' | 'memory'>('profile');

  useEffect(() => {
    if (isOpen) {
      setSettings(currentSettings);
    }
  }, [isOpen, currentSettings]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(settings);
    onClose();
  };

  const addKey = (type: keyof Settings['apiKeys']) => {
    if (settings.apiKeys[type].length >= 10) return;
    setSettings(prev => ({
      ...prev,
      apiKeys: { ...prev.apiKeys, [type]: [...prev.apiKeys[type], ''] }
    }));
  };

  const updateKey = (type: keyof Settings['apiKeys'], index: number, value: string) => {
    setSettings(prev => {
      const newKeys = [...prev.apiKeys[type]];
      newKeys[index] = value;
      return { ...prev, apiKeys: { ...prev.apiKeys, [type]: newKeys } };
    });
  };

  const removeKey = (type: keyof Settings['apiKeys'], index: number) => {
    setSettings(prev => {
      const newKeys = [...prev.apiKeys[type]];
      newKeys.splice(index, 1);
      return { ...prev, apiKeys: { ...prev.apiKeys, [type]: newKeys } };
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2 text-white font-semibold">
            <SettingsIcon className="w-5 h-5" />
            <h2>Settings</h2>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Tabs */}
          <div className="w-full md:w-48 border-b md:border-b-0 md:border-r border-white/10 bg-black/20 p-2 flex flex-row md:flex-col gap-1 overflow-x-auto shrink-0 custom-scrollbar">
            <button 
              onClick={() => setActiveTab('profile')}
              className={`whitespace-nowrap flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-blue-600/20 text-blue-400' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}`}
            >
              <User className="w-4 h-4" /> Profile
            </button>
            <button 
              onClick={() => setActiveTab('keys')}
              className={`whitespace-nowrap flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'keys' ? 'bg-blue-600/20 text-blue-400' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}`}
            >
              <Key className="w-4 h-4" /> API Keys
            </button>
            <button 
              onClick={() => setActiveTab('memory')}
              className={`whitespace-nowrap flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'memory' ? 'bg-blue-600/20 text-blue-400' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}`}
            >
              <Brain className="w-4 h-4" /> Memory
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {activeTab === 'profile' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Name</label>
                  <input 
                    type="text" 
                    value={settings.name} 
                    onChange={e => setSettings(s => ({ ...s, name: e.target.value }))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500/50"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Email</label>
                  <input 
                    type="email" 
                    value={settings.email} 
                    onChange={e => setSettings(s => ({ ...s, email: e.target.value }))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500/50"
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Phone Number</label>
                  <input 
                    type="tel" 
                    value={settings.phoneNumber || ''} 
                    onChange={e => setSettings(s => ({ ...s, phoneNumber: e.target.value }))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500/50"
                    placeholder="+1 234 567 8900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Birth Date</label>
                  <input 
                    type="date" 
                    value={settings.birthDate || ''} 
                    onChange={e => setSettings(s => ({ ...s, birthDate: e.target.value }))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500/50 [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Custom Instructions</label>
                  <textarea 
                    value={settings.instructions} 
                    onChange={e => setSettings(s => ({ ...s, instructions: e.target.value }))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500/50 min-h-[120px] resize-y"
                    placeholder="How would you like the AI to respond?"
                  />
                </div>
              </div>
            )}

            {activeTab === 'keys' && (
              <div className="space-y-6">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-200">
                  <p>Adding your own API keys bypasses the built-in balance deduction. Keys are saved locally in your browser and never shared.</p>
                </div>

                {(['text', 'image', 'audio', 'search'] as const).map(type => (
                  <div key={type} className="space-y-2 bg-black/20 p-4 rounded-xl border border-white/5">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-zinc-300 capitalize">
                        {type === 'search' ? 'Search (SerpAPI)' : type} API Keys
                      </label>
                      <button 
                        onClick={() => addKey(type)}
                        disabled={settings.apiKeys[type].length >= 10}
                        className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50 bg-blue-500/10 px-2 py-1 rounded-md transition-colors"
                      >
                        <Plus className="w-3 h-3" /> Add Key
                      </button>
                    </div>
                    {settings.apiKeys[type].length === 0 ? (
                      <p className="text-xs text-zinc-500 italic">No keys added. Using default balance.</p>
                    ) : (
                      <div className="space-y-2">
                        {settings.apiKeys[type].map((key, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input 
                              type="password" 
                              value={key} 
                              onChange={e => updateKey(type, idx, e.target.value)}
                              className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                              placeholder={`Enter ${type} API key...`}
                            />
                            <button 
                              onClick={() => removeKey(type, idx)}
                              className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'memory' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-black/20 p-4 rounded-xl border border-white/5">
                  <div>
                    <h3 className="text-white font-medium">Enable Memory</h3>
                    <p className="text-xs text-zinc-400 mt-1">Allow AI to remember facts about you across conversations.</p>
                  </div>
                  <button 
                    onClick={() => setSettings(s => ({ ...s, memoryEnabled: !s.memoryEnabled }))}
                    className={`w-14 h-7 rounded-full transition-all duration-300 relative focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${settings.memoryEnabled ? 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 'bg-zinc-800 border border-white/10'}`}
                  >
                    <div className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-300 ${settings.memoryEnabled ? 'translate-x-7' : 'translate-x-0'}`} />
                  </button>
                </div>

                {settings.memoryEnabled && (
                  <>
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2"><Brain className="w-4 h-4"/> Saved Memories</h3>
                      {settings.memories.length === 0 ? (
                        <p className="text-xs text-zinc-500 italic">No memories saved yet. The AI will add them automatically, or you can add them below.</p>
                      ) : (
                        <div className="space-y-2">
                          {settings.memories.map(m => (
                            <div key={m.id} className="bg-black/40 border border-white/10 rounded-lg p-3 flex items-start justify-between gap-3">
                              <p className="text-sm text-zinc-200 flex-1">{m.content}</p>
                              <button onClick={() => setSettings(s => ({ ...s, memories: s.memories.filter(x => x.id !== m.id) }))} className="text-zinc-500 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4"/></button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2 mt-2">
                        <input type="text" placeholder="Add a new memory manually... (Press Enter)" className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50" onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                            const val = e.currentTarget.value.trim();
                            setSettings(s => ({ ...s, memories: [...s.memories, { id: Date.now().toString(), content: val, createdAt: Date.now() }] }));
                            e.currentTarget.value = '';
                          }
                        }}/>
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-white/10">
                      <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2"><Sparkles className="w-4 h-4"/> Learned Preferences</h3>
                      {settings.preferences.length === 0 ? (
                        <p className="text-xs text-zinc-500 italic">No preferences learned yet. Keep chatting to trigger A/B testing.</p>
                      ) : (
                        <div className="space-y-2">
                          {settings.preferences.map((p, i) => (
                            <div key={i} className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex items-start justify-between gap-3">
                              <p className="text-sm text-blue-200 flex-1">{p}</p>
                              <button onClick={() => setSettings(s => ({ ...s, preferences: s.preferences.filter((_, idx) => idx !== i) }))} className="text-blue-500/50 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4"/></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-white/10 bg-black/40 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-blue-900/20">
            <Save className="w-4 h-4" /> Save Settings
          </button>
        </div>
      </motion.div>
    </div>
  );
}
