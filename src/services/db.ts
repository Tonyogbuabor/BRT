import { openDB, DBSchema, IDBPDatabase, StoreNames } from 'idb';
import {
  CustomerRecord,
  CleaningLogEntry,
  ModelCard,
  ScoredCustomer,
  Campaign,
  ValidationReport,
  BusinessAssumptions,
  DatasetVersion
} from '../types/schema';

export interface BritConnectDB extends DBSchema {
  app_settings: {
    key: string;
    value: any;
  };
  dataset_versions: {
    key: string;
    value: DatasetVersion;
    indexes: { 'by-timestamp': string };
  };
  active_records: {
    key: string; // Customer ID
    value: CustomerRecord;
  };
  cleaned_records: {
    key: string; // Customer ID
    value: CustomerRecord;
  };
  cleaning_logs: {
    key: string;
    value: CleaningLogEntry;
  };
  models: {
    key: string; // Model ID
    value: ModelCard;
  };
  scored_customers: {
    key: string; // Customer ID
    value: ScoredCustomer;
    indexes: { 'by-tier': string; 'by-prob': number };
  };
  campaigns: {
    key: string; // Campaign ID
    value: Campaign;
  };
  chat_messages: {
    key: string; // Message ID
    value: {
      id: string;
      role: 'user' | 'assistant' | 'tool';
      content: string;
      timestamp: string;
      toolCall?: any;
      toolResult?: any;
      tableData?: any[];
      chartConfig?: any;
    };
    indexes: { 'by-timestamp': string };
  };
  validation_reports: {
    key: string;
    value: ValidationReport;
  };
  reject_logs: {
    key: string;
    value: { id: string; rowNumber: number; rawData: any; reasons: string[]; timestamp: string };
  };
  change_logs: {
    key: string;
    value: {
      id: string;
      timestamp: string;
      action: string;
      addedCount: number;
      updatedCount: number;
      unchangedCount: number;
      rejectedCount: number;
      details: string;
    };
  };
}

const DB_NAME = 'britconnect_churn_intelligence_v1';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<BritConnectDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<BritConnectDB>> {
  if (!dbPromise) {
    dbPromise = openDB<BritConnectDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('app_settings')) {
          db.createObjectStore('app_settings');
        }
        if (!db.objectStoreNames.contains('dataset_versions')) {
          const store = db.createObjectStore('dataset_versions', { keyPath: 'id' });
          store.createIndex('by-timestamp', 'timestamp');
        }
        if (!db.objectStoreNames.contains('active_records')) {
          db.createObjectStore('active_records', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('cleaned_records')) {
          db.createObjectStore('cleaned_records', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('cleaning_logs')) {
          db.createObjectStore('cleaning_logs', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('models')) {
          db.createObjectStore('models', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('scored_customers')) {
          const store = db.createObjectStore('scored_customers', { keyPath: 'id' });
          store.createIndex('by-tier', 'riskTier');
          store.createIndex('by-prob', 'churnProbability');
        }
        if (!db.objectStoreNames.contains('campaigns')) {
          db.createObjectStore('campaigns', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('chat_messages')) {
          const store = db.createObjectStore('chat_messages', { keyPath: 'id' });
          store.createIndex('by-timestamp', 'timestamp');
        }
        if (!db.objectStoreNames.contains('validation_reports')) {
          db.createObjectStore('validation_reports', { keyPath: 'timestamp' });
        }
        if (!db.objectStoreNames.contains('reject_logs')) {
          db.createObjectStore('reject_logs', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('change_logs')) {
          db.createObjectStore('change_logs', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export const DEFAULT_BUSINESS_ASSUMPTIONS: BusinessAssumptions = {
  costPerContactGbp: 4.5,
  saveRatePercent: 28,
  averageMarginPercent: 65,
  horizonMonths: 12,
  criticalRiskThreshold: 0.70,
  highRiskThreshold: 0.50,
  mediumRiskThreshold: 0.30,
  referenceDate: '2026-11-07',
};

// High-level persistence helpers
export async function saveActiveRecords(records: CustomerRecord[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('active_records', 'readwrite');
  await tx.store.clear();
  for (const record of records) {
    await tx.store.put(record);
  }
  await tx.done;
}

export async function getActiveRecords(): Promise<CustomerRecord[]> {
  const db = await getDB();
  return db.getAll('active_records');
}

export async function saveCleanedRecords(records: CustomerRecord[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('cleaned_records', 'readwrite');
  await tx.store.clear();
  for (const record of records) {
    await tx.store.put(record);
  }
  await tx.done;
}

export async function getCleanedRecords(): Promise<CustomerRecord[]> {
  const db = await getDB();
  return db.getAll('cleaned_records');
}

export async function saveCleaningLogs(logs: CleaningLogEntry[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('cleaning_logs', 'readwrite');
  await tx.store.clear();
  for (const log of logs) {
    await tx.store.put(log);
  }
  await tx.done;
}

export async function getCleaningLogs(): Promise<CleaningLogEntry[]> {
  const db = await getDB();
  return db.getAll('cleaning_logs');
}

export async function saveModel(model: ModelCard): Promise<void> {
  const db = await getDB();
  await db.put('models', model);
}

export async function getAllModels(): Promise<ModelCard[]> {
  const db = await getDB();
  return db.getAll('models');
}

export async function saveScoredCustomers(scored: ScoredCustomer[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('scored_customers', 'readwrite');
  await tx.store.clear();
  for (const item of scored) {
    await tx.store.put(item);
  }
  await tx.done;
}

export async function getScoredCustomers(): Promise<ScoredCustomer[]> {
  const db = await getDB();
  return db.getAll('scored_customers');
}

export async function saveCampaign(campaign: Campaign): Promise<void> {
  const db = await getDB();
  await db.put('campaigns', campaign);
}

export async function getCampaigns(): Promise<Campaign[]> {
  const db = await getDB();
  return db.getAll('campaigns');
}

export async function saveDatasetVersion(version: DatasetVersion): Promise<void> {
  const db = await getDB();
  await db.put('dataset_versions', version);
}

export async function getDatasetVersions(): Promise<DatasetVersion[]> {
  const db = await getDB();
  return db.getAll('dataset_versions');
}

export async function saveSetting<T>(key: string, value: T): Promise<void> {
  const db = await getDB();
  await db.put('app_settings', value, key);
}

export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  const db = await getDB();
  const val = await db.get('app_settings', key);
  return (val !== undefined ? val : defaultValue) as T;
}

export async function clearAllDatabase(): Promise<void> {
  const db = await getDB();
  const stores: StoreNames<BritConnectDB>[] = [
    'active_records',
    'cleaned_records',
    'cleaning_logs',
    'models',
    'scored_customers',
    'campaigns',
    'chat_messages',
    'validation_reports',
    'reject_logs',
    'change_logs',
    'dataset_versions'
  ];
  for (const store of stores) {
    await db.clear(store);
  }
}
