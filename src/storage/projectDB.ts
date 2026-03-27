// src/storage/projectDB.ts
import { openDB, type IDBPDatabase } from 'idb';
import type { BESSProject, Folder } from '../engine/types.ts';

const DB_NAME = 'bess-analyzer';
const DB_VERSION = 1;
const PROJECTS_STORE = 'projects';
const FOLDERS_STORE = 'folders';

interface BESSAnalyzerDB {
  projects: { key: string; value: BESSProject };
  folders: { key: string; value: Folder };
}

let dbPromise: Promise<IDBPDatabase<BESSAnalyzerDB>> | null = null;

function getDB(): Promise<IDBPDatabase<BESSAnalyzerDB>> {
  if (!dbPromise) {
    dbPromise = openDB<BESSAnalyzerDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
          db.createObjectStore(PROJECTS_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(FOLDERS_STORE)) {
          db.createObjectStore(FOLDERS_STORE, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

// ── Projects ─────────────────────────────────────────────

export async function getAllProjects(): Promise<BESSProject[]> {
  const db = await getDB();
  return db.getAll(PROJECTS_STORE);
}

export async function getProject(id: string): Promise<BESSProject | undefined> {
  const db = await getDB();
  return db.get(PROJECTS_STORE, id);
}

export async function putProject(project: BESSProject): Promise<void> {
  const db = await getDB();
  await db.put(PROJECTS_STORE, project);
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(PROJECTS_STORE, id);
}

// ── Folders ──────────────────────────────────────────────

export async function getAllFolders(): Promise<Folder[]> {
  const db = await getDB();
  return db.getAll(FOLDERS_STORE);
}

export async function putFolder(folder: Folder): Promise<void> {
  const db = await getDB();
  await db.put(FOLDERS_STORE, folder);
}

export async function deleteFolder(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(FOLDERS_STORE, id);
}
