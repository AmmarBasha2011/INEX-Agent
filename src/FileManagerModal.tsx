import React, { useState, useRef } from 'react';
import { X, Folder, FileText, Trash2, Edit2, Download, Plus, ChevronRight, ArrowLeft, Image as ImageIcon, Music, Video, Code, File as FileIcon, UploadCloud } from 'lucide-react';
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
  onAddFile: (file: FileNode) => void;
  onUpdateFile: (file: FileNode) => void;
  onDeleteFile: (id: string) => void;
  onClose: () => void;
}

export const getFileIcon = (file: FileNode) => {
  if (file.isFolder) return <Folder className="w-5 h-5 text-blue-400 shrink-0" />;
  
  const name = file.name.toLowerCase();
  const mime = file.mimeType || '';
  
  if (mime.startsWith('image/') || name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) {
    return <ImageIcon className="w-5 h-5 text-purple-400 shrink-0" />;
  }
  if (mime.startsWith('audio/') || name.match(/\.(mp3|wav|ogg|m4a)$/)) {
    return <Music className="w-5 h-5 text-yellow-400 shrink-0" />;
  }
  if (mime.startsWith('video/') || name.match(/\.(mp4|webm|avi|mov)$/)) {
    return <Video className="w-5 h-5 text-red-400 shrink-0" />;
  }
  if (name.match(/\.(js|ts|jsx|tsx|json|html|css|py|java|c|cpp|go|rs)$/)) {
    return <Code className="w-5 h-5 text-green-400 shrink-0" />;
  }
  if (name.match(/\.(txt|md|csv)$/)) {
    return <FileText className="w-5 h-5 text-zinc-400 shrink-0" />;
  }
  
  return <FileIcon className="w-5 h-5 text-zinc-400 shrink-0" />;
};

export default function FileManagerModal({ files, onAddFile, onUpdateFile, onDeleteFile, onClose }: FileManagerModalProps) {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [editingFile, setEditingFile] = useState<FileNode | null>(null);
  const [editContent, setEditContent] = useState('');
  const [renamingNode, setRenamingNode] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload Progress State
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState('');
  const [timeElapsed, setTimeElapsed] = useState('');
  const [currentFileName, setCurrentFileName] = useState('');

  const currentFiles = files.filter(f => f.parentId === currentFolderId);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(e.target.files || []);
    if (uploadedFiles.length === 0) return;

    setUploading(true);
    setProgress(0);
    
    let totalSize = uploadedFiles.reduce((acc, file) => acc + file.size, 0);
    let loadedSize = 0;
    const startTime = Date.now();

    const processNextFile = (index: number) => {
      if (index >= uploadedFiles.length) {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const file = uploadedFiles[index];
      setCurrentFileName(file.name);
      
      const reader = new FileReader();
      const isBinary = file.type.startsWith('image/') || file.type.startsWith('audio/') || file.type.startsWith('video/') || file.type === 'application/pdf';

      reader.onprogress = (ev) => {
        if (ev.lengthComputable) {
          const fileLoaded = ev.loaded;
          const currentTotalLoaded = loadedSize + fileLoaded;
          const percent = Math.round((currentTotalLoaded / totalSize) * 100);
          setProgress(percent);

          const elapsedTime = (Date.now() - startTime) / 1000; // seconds
          if (elapsedTime > 0) {
            const speed = (currentTotalLoaded / 1024 / 1024) / elapsedTime; // MB/s
            setUploadSpeed(`${speed.toFixed(2)} MB/s`);
            setTimeElapsed(`${elapsedTime.toFixed(1)}s`);
          }
        }
      };

      reader.onload = (ev) => {
        const content = ev.target?.result as string;
        
        const newNode: FileNode = {
          id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          isFolder: false,
          parentId: currentFolderId,
          content: isBinary ? undefined : content,
          base64: isBinary ? content.split(',')[1] : undefined,
          mimeType: file.type,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        
        onAddFile(newNode);
        loadedSize += file.size;
        processNextFile(index + 1);
      };
      
      if (isBinary) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    };

    processNextFile(0);
  };

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
    onAddFile(newNode);
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
    onAddFile(newNode);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this?")) return;
    onDeleteFile(id);
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
    const file = files.find(f => f.id === id);
    if (file) {
      onUpdateFile({ ...file, name: newName.trim(), updatedAt: Date.now() });
    }
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
    onUpdateFile({ ...editingFile, content: editContent, updatedAt: Date.now() });
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

        {uploading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-white/10 p-6 rounded-2xl shadow-2xl max-w-sm w-full">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-blue-400 animate-bounce" />
                Uploading Files...
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between text-sm text-zinc-300">
                  <span>{currentFileName}</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300 ease-out" 
                    style={{ width: `${progress}%` }} 
                  />
                </div>
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>Speed: {uploadSpeed}</span>
                  <span>Time: {timeElapsed}</span>
                </div>
              </div>
            </div>
          </div>
        )}

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
                <input 
                  type="file" 
                  multiple 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                />
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-lg text-sm font-medium transition-colors border border-white/5">
                  <UploadCloud className="w-4 h-4" /> Upload
                </button>
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
                        {getFileIcon(file)}
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
                      <div className="flex items-center gap-1 opacity-100 transition-opacity">
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
