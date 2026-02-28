import React, { useState } from 'react';
import { X, Folder, FileText, Trash2, Edit2, Download, Plus, ChevronRight, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type FileNode = {
  id: string;
  name: string;
  isFolder: boolean;
  parentId: string | null;
  content?: string;
  base64?: string;
  mimeType?: string;
  createdAt: number;
  updatedAt: number;
};

interface FileManagerModalProps {
  files: FileNode[];
  setFiles: React.Dispatch<React.SetStateAction<FileNode[]>>;
  onClose: () => void;
}

export default function FileManagerModal({ files, setFiles, onClose }: FileManagerModalProps) {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [editingFile, setEditingFile] = useState<FileNode | null>(null);
  const [editContent, setEditContent] = useState('');
  const [renamingNode, setRenamingNode] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const currentFiles = files.filter(f => f.parentId === currentFolderId);

  const getBreadcrumbs = () => {
    const crumbs = [];
    let curr = currentFolderId;
    while (curr) {
      const folder = files.find(f => f.id === curr);
      if (folder) {
        crumbs.unshift(folder);
        curr = folder.parentId;
      } else {
        break;
      }
    }
    return crumbs;
  };

  const handleCreateFolder = () => {
    const name = prompt("Enter folder name:");
    if (!name) return;
    const newNode: FileNode = {
      id: `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      isFolder: true,
      parentId: currentFolderId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setFiles(prev => [...prev, newNode]);
  };

  const handleCreateFile = () => {
    const name = prompt("Enter file name (e.g., note.txt):");
    if (!name) return;
    const newNode: FileNode = {
      id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      isFolder: false,
      parentId: currentFolderId,
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setFiles(prev => [...prev, newNode]);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this?")) return;
    const getChildrenIds = (parentId: string): string[] => {
      const children = files.filter(f => f.parentId === parentId);
      return children.reduce((acc, child) => [...acc, child.id, ...getChildrenIds(child.id)], [] as string[]);
    };
    const idsToDelete = [id, ...getChildrenIds(id)];
    setFiles(prev => prev.filter(f => !idsToDelete.includes(f.id)));
  };

  const handleRename = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingNode(id);
    setNewName(name);
  };

  const submitRename = (id: string) => {
    if (!newName.trim()) {
      setRenamingNode(null);
      return;
    }
    setFiles(prev => prev.map(f => f.id === id ? { ...f, name: newName.trim(), updatedAt: Date.now() } : f));
    setRenamingNode(null);
  };

  const handleDownload = (file: FileNode, e: React.MouseEvent) => {
    e.stopPropagation();
    if (file.isFolder) return;
    
    let url = '';
    if (file.base64 && file.mimeType) {
      url = `data:${file.mimeType};base64,${file.base64}`;
    } else {
      const blob = new Blob([file.content || ''], { type: 'text/plain' });
      url = URL.createObjectURL(blob);
    }
    
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    if (!file.base64) URL.revokeObjectURL(url);
  };

  const openFile = (file: FileNode) => {
    if (file.isFolder) {
      setCurrentFolderId(file.id);
    } else {
      if (file.base64) {
        alert("Cannot edit binary files directly in the browser.");
        return;
      }
      setEditingFile(file);
      setEditContent(file.content || '');
    }
  };

  const saveFile = () => {
    if (!editingFile) return;
    setFiles(prev => prev.map(f => f.id === editingFile.id ? { ...f, content: editContent, updatedAt: Date.now() } : f));
    setEditingFile(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-4xl max-h-[90vh] bg-[#111111] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Folder className="w-5 h-5 text-blue-400" />
            File Manager
          </h2>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {editingFile ? (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-white/10 bg-black/20">
              <div className="flex items-center gap-3">
                <button onClick={() => setEditingFile(null)} className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium text-white">{editingFile.name}</span>
              </div>
              <button onClick={saveFile} className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors">
                Save
              </button>
            </div>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="flex-1 w-full p-4 bg-transparent text-zinc-300 text-sm font-mono resize-none focus:outline-none custom-scrollbar"
              placeholder="Start typing..."
            />
          </div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-white/10 bg-black/20">
              <div className="flex items-center gap-1 text-sm text-zinc-400">
                <button onClick={() => setCurrentFolderId(null)} className="hover:text-white transition-colors">Home</button>
                {getBreadcrumbs().map(crumb => (
                  <React.Fragment key={crumb.id}>
                    <ChevronRight className="w-4 h-4" />
                    <button onClick={() => setCurrentFolderId(crumb.id)} className="hover:text-white transition-colors">{crumb.name}</button>
                  </React.Fragment>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleCreateFile} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-lg text-sm font-medium transition-colors border border-white/5">
                  <FileText className="w-4 h-4" /> New File
                </button>
                <button onClick={handleCreateFolder} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm font-medium transition-colors border border-blue-500/20">
                  <Folder className="w-4 h-4" /> New Folder
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {currentFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                  <Folder className="w-12 h-12 mb-3 opacity-20" />
                  <p>This folder is empty</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {currentFiles.map(file => (
                    <div 
                      key={file.id} 
                      onClick={() => openFile(file)}
                      className="group flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-xl cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        {file.isFolder ? <Folder className="w-5 h-5 text-blue-400 shrink-0" /> : <FileText className="w-5 h-5 text-zinc-400 shrink-0" />}
                        {renamingNode === file.id ? (
                          <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onBlur={() => submitRename(file.id)}
                            onKeyDown={(e) => e.key === 'Enter' && submitRename(file.id)}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                            className="bg-black/50 text-white text-sm px-2 py-1 rounded border border-blue-500/50 focus:outline-none w-full"
                          />
                        ) : (
                          <span className="text-sm font-medium text-zinc-200 truncate">{file.name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => handleRename(file.id, file.name, e)} className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Rename">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {!file.isFolder && (
                          <button onClick={(e) => handleDownload(file, e)} className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Download">
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button onClick={(e) => handleDelete(file.id, e)} className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
