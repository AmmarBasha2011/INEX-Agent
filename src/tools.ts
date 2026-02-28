import { FunctionDeclaration, Type } from '@google/genai';

export const calculatorTool: FunctionDeclaration = {
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

export const webSearchTool: FunctionDeclaration = {
  name: 'webSearch',
  description: 'Search the live web for current information using SerpAPI.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: 'The search query to look up on the web.'
      }
    },
    required: ['query']
  }
};

export const imageGenerationTool: FunctionDeclaration = {
  name: 'generateImage',
  description: 'Generate an image based on a prompt. Ask the user which image model they want to use (gemini-2.5-flash-image or gemini-3.1-flash-image-preview) before calling this.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      prompt: { type: Type.STRING, description: 'The image generation prompt' },
      model: { type: Type.STRING, description: 'The model to use: gemini-2.5-flash-image or gemini-3.1-flash-image-preview' }
    },
    required: ['prompt', 'model']
  }
};

export const imageEditTool: FunctionDeclaration = {
  name: 'editImage',
  description: 'Edit an image based on a prompt. This tool uses the same models as image generation but is for modifying existing images.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      prompt: { type: Type.STRING, description: 'The prompt describing how to edit the image.' },
      model: { type: Type.STRING, description: 'The model to use: gemini-2.5-flash-image' }
    },
    required: ['prompt', 'model']
  }
};

export const audioGenerationTool: FunctionDeclaration = {
  name: 'generateAudio',
  description: 'Generate spoken audio from text. Ask the user for the text and voice (Puck, Charon, Kore, Fenrir, Zephyr) before calling this.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      text: { type: Type.STRING, description: 'The text to speak' },
      voice: { type: Type.STRING, description: 'The voice to use: Puck, Charon, Kore, Fenrir, or Zephyr' }
    },
    required: ['text', 'voice']
  }
};

export const saveMemoryTool: FunctionDeclaration = {
  name: 'saveMemory',
  description: 'Save a new memory or fact about the user.',
  parameters: { type: Type.OBJECT, properties: { content: { type: Type.STRING, description: 'The information to remember' } }, required: ['content'] }
};

export const updateMemoryTool: FunctionDeclaration = {
  name: 'updateMemory',
  description: 'Update an existing memory.',
  parameters: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, content: { type: Type.STRING } }, required: ['id', 'content'] }
};

export const deleteMemoryTool: FunctionDeclaration = {
  name: 'deleteMemory',
  description: 'Delete a memory.',
  parameters: { type: Type.OBJECT, properties: { id: { type: Type.STRING } }, required: ['id'] }
};

export const createFileTool: FunctionDeclaration = {
  name: 'createFile',
  description: 'Create a new text file in the File Manager.',
  parameters: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, parentId: { type: Type.STRING, description: 'ID of the parent folder, or empty string for root' }, content: { type: Type.STRING } }, required: ['name', 'content'] }
};

export const createFolderTool: FunctionDeclaration = {
  name: 'createFolder',
  description: 'Create a new folder in the File Manager.',
  parameters: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, parentId: { type: Type.STRING, description: 'ID of the parent folder, or empty string for root' } }, required: ['name'] }
};

export const deleteNodeTool: FunctionDeclaration = {
  name: 'deleteNode',
  description: 'Delete a file or folder by ID from the File Manager.',
  parameters: { type: Type.OBJECT, properties: { id: { type: Type.STRING } }, required: ['id'] }
};

export const readFileTool: FunctionDeclaration = {
  name: 'readFile',
  description: 'Read the content of a text file by ID from the File Manager.',
  parameters: { type: Type.OBJECT, properties: { id: { type: Type.STRING } }, required: ['id'] }
};

export const editFileTool: FunctionDeclaration = {
  name: 'editFile',
  description: 'Edit the content of an existing text file by ID in the File Manager.',
  parameters: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, content: { type: Type.STRING } }, required: ['id', 'content'] }
};

export const renameNodeTool: FunctionDeclaration = {
  name: 'renameNode',
  description: 'Rename a file or folder by ID in the File Manager.',
  parameters: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, newName: { type: Type.STRING } }, required: ['id', 'newName'] }
};

export const listFilesTool: FunctionDeclaration = {
  name: 'listFiles',
  description: 'List all files and folders in a specific folder (by parentId) or root (empty string) in the File Manager.',
  parameters: { type: Type.OBJECT, properties: { parentId: { type: Type.STRING, description: 'ID of the parent folder, or empty string for root' } } }
};
