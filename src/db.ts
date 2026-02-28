import { openDB } from 'idb';

const DB_NAME = 'inex_db';
const DB_VERSION = 1;

export const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('conversations')) {
        db.createObjectStore('conversations', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }
    },
  });
};

export const saveFileToDB = async (file: any) => {
  const db = await initDB();
  return db.put('files', file);
};

export const getFilesFromDB = async () => {
  const db = await initDB();
  return db.getAll('files');
};

export const deleteFileFromDB = async (id: string) => {
  const db = await initDB();
  return db.delete('files', id);
};

export const saveConversationToDB = async (conversation: any) => {
  const db = await initDB();
  return db.put('conversations', conversation);
};

export const getConversationsFromDB = async () => {
  const db = await initDB();
  return db.getAll('conversations');
};

export const deleteConversationFromDB = async (id: string) => {
  const db = await initDB();
  return db.delete('conversations', id);
};

export const saveSettingsToDB = async (settings: any) => {
  const db = await initDB();
  return db.put('settings', { id: 'user_settings', ...settings });
};

export const getSettingsFromDB = async () => {
  const db = await initDB();
  return db.get('settings', 'user_settings');
};
