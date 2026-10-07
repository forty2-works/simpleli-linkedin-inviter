/**
 * Utilities to convert Chrome's callback-based API to promises
 */

/**
 * Send a message to the background script and return a promise
 */
export function sendMessage<T>(message: any): Promise<T> {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(message, (response: T) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get data from chrome.storage.local and return a promise
 */
export function getStorage<T extends object>(keys: string | string[] | object | null): Promise<T> {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.get(keys, (items: T) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(items);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Set data in chrome.storage.local and return a promise
 */
export function setStorage(items: object): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.set(items, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Create a new tab and return a promise
 */
export function createTab(props: {
  url?: string;
  active?: boolean;
  windowId?: number;
}): Promise<chrome.tabs.Tab> {
  return new Promise((resolve, reject) => {
    try {
      chrome.tabs.create(props, (tab) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(tab);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
} 