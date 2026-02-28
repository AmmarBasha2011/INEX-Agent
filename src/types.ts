export type MessageStatus = 'sending' | 'sent' | 'processing' | 'done' | 'error' | 'waiting_approval' | 'aborted' | 'waiting_variant_selection';

export type FileNode = {
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

export type Attachment = {
  id: string;
  file: File;
  progress: number;
  base64?: string;
  mimeType?: string;
};

export type Message = {
  id: string;
  role: 'user' | 'model' | 'function';
  text: string;
  timestamp: number;
  tokens?: { prompt: number; candidates: number; total: number };
  cost?: number;
  duration?: number; // in milliseconds
  status: MessageStatus;
  pendingToolCall?: { id?: string, name: string, args: any };
  toolResult?: { id?: string, name: string, result: any, cost?: number };
  attachments?: { name: string, mimeType: string, base64: string }[];
  variants?: { id: string, text: string, tone: string }[];
};

export type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
  pinned?: boolean;
  mode?: 'manual' | 'auto';
};
