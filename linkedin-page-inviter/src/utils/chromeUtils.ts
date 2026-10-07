/**
 * Chrome API utility functions to help with TypeScript integration
 */

import { ChromeMessage } from '../types/chrome';

/**
 * Wraps chrome.runtime.sendMessage in a Promise with TypeScript typing
 * @param message The message to send
 * @returns Promise that resolves with the response
 */
export const sendMessageAsync = <T extends object>(message: any): Promise<T> => {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      resolve(response as T);
    });
  });
};

/**
 * Wraps chrome.storage.local.get in a Promise with TypeScript typing
 * @param keys The keys to retrieve from storage
 * @returns Promise that resolves with the storage data
 */
export const getStorageAsync = <T extends object>(keys: string | string[] | null): Promise<T> => {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (data) => {
      resolve(data as T);
    });
  });
};

/**
 * Wraps chrome.storage.local.set in a Promise
 * @param items The items to save to storage
 * @returns Promise that resolves when storage is updated
 */
export const setStorageAsync = (items: object): Promise<void> => {
  return new Promise((resolve) => {
    chrome.storage.local.set(items, () => {
      resolve();
    });
  });
};

/**
 * Wraps chrome.tabs.create in a Promise
 * @param createProperties The properties for creating the tab
 * @returns Promise that resolves with the created tab
 */
export const createTabAsync = (createProperties: chrome.tabs.CreateProperties): Promise<chrome.tabs.Tab> => {
  return new Promise((resolve) => {
    chrome.tabs.create(createProperties, (tab) => {
      resolve(tab);
    });
  });
};

/**
 * Wraps chrome.tabs.sendMessage in a Promise with TypeScript typing
 * @param tabId The ID of the tab to send the message to
 * @param message The message to send
 * @returns Promise that resolves with the response
 */
export const sendTabMessageAsync = <T extends object>(
  tabId: number, 
  message: any
): Promise<T> => {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response as T);
      }
    });
  });
};

/**
 * Get tabs that match the given query
 * @param queryInfo The query parameters
 * @returns Promise that resolves with an array of matching tabs
 */
export const queryTabsAsync = (queryInfo: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]> => {
  return new Promise((resolve) => {
    chrome.tabs.query(queryInfo, (tabs) => {
      resolve(tabs);
    });
  });
};

/**
 * Get a tab by ID
 * @param tabId The ID of the tab to get
 * @returns Promise that resolves with the tab
 */
export const getTabAsync = (tabId: number): Promise<chrome.tabs.Tab> => {
  return new Promise((resolve, reject) => {
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(tab);
      }
    });
  });
};

/**
 * Execute a script in a tab
 * @param tabId The ID of the tab to execute the script in
 * @param files The files to execute
 * @returns Promise that resolves when the script has been executed
 */
export const executeScriptAsync = (
  tabId: number, 
  files: string[]
): Promise<void> => {
  return new Promise((resolve, reject) => {
    chrome.scripting.executeScript(
      {
        target: { tabId },
        files
      },
      () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      }
    );
  });
};

/**
 * Safely executes a Chrome API call and handles errors
 * @param apiCall The API call function that returns a Promise
 * @param fallbackValue The value to return if the API call fails
 * @returns Promise that resolves with the result or fallback value
 */
export const safeApiCall = async <T>(
  apiCall: () => Promise<T>,
  fallbackValue: T
): Promise<T> => {
  try {
    return await apiCall();
  } catch (error) {
    console.error('Chrome API error:', error);
    return fallbackValue;
  }
}; 