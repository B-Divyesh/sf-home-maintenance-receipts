import type { EvidenceFile, MaintenanceRecord, Settings } from './types'
import { defaultSettings } from './types'

const REAL_DB_NAME = 'home-maintenance-receipts'
const DEMO_DB_NAME = 'demo:home-maintenance-receipts'
const DB_VERSION = 1
let databaseName = REAL_DB_NAME

export function configureStorage(demo: boolean): void {
  databaseName = demo ? DEMO_DB_NAME : REAL_DB_NAME
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('The local database could not be read.'))
  })
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('The local database could not be updated.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('The local database update was cancelled.'))
  })
}

export async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, DB_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains('records')) {
        const records = database.createObjectStore('records', { keyPath: 'id' })
        records.createIndex('completedDate', 'completedDate')
        records.createIndex('system', 'system')
      }
      if (!database.objectStoreNames.contains('attachments')) {
        database.createObjectStore('attachments', { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains('settings')) {
        database.createObjectStore('settings', { keyPath: 'key' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Your private home file could not be opened.'))
  })
}

export async function clearCurrentDatabase(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(databaseName)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error ?? new Error('The demo data could not be cleared.'))
    request.onblocked = () => reject(new Error('Close another demo tab, then reset the demo again.'))
  })
}

export async function getRecords(): Promise<MaintenanceRecord[]> {
  const database = await openDatabase()
  const records = await requestResult(database.transaction('records').objectStore('records').getAll()) as MaintenanceRecord[]
  database.close()
  return records.sort((a, b) => b.completedDate.localeCompare(a.completedDate))
}

export async function saveRecord(record: MaintenanceRecord, evidence?: EvidenceFile, previousAttachmentId?: string | null): Promise<void> {
  const database = await openDatabase()
  const stores = evidence ? ['records', 'attachments'] : ['records']
  const transaction = database.transaction(stores, 'readwrite')
  transaction.objectStore('records').put(record)
  if (evidence) {
    const attachmentStore = transaction.objectStore('attachments')
    attachmentStore.put(evidence)
    if (previousAttachmentId && previousAttachmentId !== evidence.id) attachmentStore.delete(previousAttachmentId)
  }
  await transactionDone(transaction)
  database.close()
}

export async function deleteRecord(record: MaintenanceRecord): Promise<void> {
  const database = await openDatabase()
  const transaction = database.transaction(['records', 'attachments'], 'readwrite')
  transaction.objectStore('records').delete(record.id)
  if (record.attachmentId) transaction.objectStore('attachments').delete(record.attachmentId)
  await transactionDone(transaction)
  database.close()
}

export async function getAttachment(id: string): Promise<EvidenceFile | undefined> {
  const database = await openDatabase()
  const evidence = await requestResult(database.transaction('attachments').objectStore('attachments').get(id)) as EvidenceFile | undefined
  database.close()
  return evidence
}

export async function getAttachments(): Promise<EvidenceFile[]> {
  const database = await openDatabase()
  const files = await requestResult(database.transaction('attachments').objectStore('attachments').getAll()) as EvidenceFile[]
  database.close()
  return files
}

export async function getSettings(): Promise<Settings> {
  const database = await openDatabase()
  const stored = await requestResult(database.transaction('settings').objectStore('settings').get('preferences')) as { key: string; value: Settings } | undefined
  database.close()
  return stored?.value ?? defaultSettings
}

export async function saveSettings(settings: Settings): Promise<void> {
  const database = await openDatabase()
  const transaction = database.transaction('settings', 'readwrite')
  transaction.objectStore('settings').put({ key: 'preferences', value: settings })
  await transactionDone(transaction)
  database.close()
}

export async function replaceAll(records: MaintenanceRecord[], attachments: EvidenceFile[], settings: Settings): Promise<void> {
  const database = await openDatabase()
  const transaction = database.transaction(['records', 'attachments', 'settings'], 'readwrite')
  const recordsStore = transaction.objectStore('records')
  const attachmentsStore = transaction.objectStore('attachments')
  recordsStore.clear()
  attachmentsStore.clear()
  records.forEach((record) => recordsStore.put(record))
  attachments.forEach((file) => attachmentsStore.put(file))
  transaction.objectStore('settings').put({ key: 'preferences', value: settings })
  await transactionDone(transaction)
  database.close()
}
