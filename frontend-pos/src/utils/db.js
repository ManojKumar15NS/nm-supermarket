// Simple IndexedDB implementation for offline storage
const DB_NAME = 'nm-pos-db';
const DB_VERSION = 1;

export function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('products')) {
        db.createObjectStore('products', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('offline_queue')) {
        db.createObjectStore('offline_queue', { keyPath: 'id', autoIncrement: true });
      }
    };
    
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

export async function saveProductsLocal(products) {
  const db = await initDB();
  const tx = db.transaction('products', 'readwrite');
  const store = tx.objectStore('products');
  store.clear();
  products.forEach(p => store.put(p));
  return new Promise((resolve) => tx.oncomplete = () => resolve());
}

export async function getProductsLocal() {
  const db = await initDB();
  const tx = db.transaction('products', 'readonly');
  const store = tx.objectStore('products');
  const request = store.getAll();
  return new Promise((resolve) => request.onsuccess = () => resolve(request.result));
}

export async function queueSaleLocal(sale) {
  const db = await initDB();
  const tx = db.transaction('offline_queue', 'readwrite');
  const store = tx.objectStore('offline_queue');
  store.add({ ...sale, queuedAt: new Date() });
  return new Promise((resolve) => tx.oncomplete = () => resolve());
}

export async function getQueuedSales() {
  const db = await initDB();
  const tx = db.transaction('offline_queue', 'readonly');
  const store = tx.objectStore('offline_queue');
  const request = store.getAll();
  return new Promise((resolve) => request.onsuccess = () => resolve(request.result));
}

export async function removeQueuedSale(id) {
  const db = await initDB();
  const tx = db.transaction('offline_queue', 'readwrite');
  const store = tx.objectStore('offline_queue');
  store.delete(id);
  return new Promise((resolve) => tx.oncomplete = () => resolve());
}
