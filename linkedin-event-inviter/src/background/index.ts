/**
 * LinkedIn Event Inviter Chrome Extension
 * Background Script - Main controller for the extension
 */

import { ChromeMessage, TranslationData } from '../types/chrome';
import { 
  getStorageAsync, 
  setStorageAsync, 
  createTabAsync, 
  sendTabMessageAsync,
  queryTabsAsync,
  getTabAsync,
  executeScriptAsync
} from '../utils/chromeUtils';

// Store the active invitation tab ID
let activeInviteTabId: number | null = null;
let inviteComplete = false;
let inviteStatus = '';
let currentLanguage = 'en';
let invitedCount = 0; // Track the number of successfully invited people

// Store translations for different languages
const translations: Record<string, TranslationData | null> = {
  en: null,
  de: null,
};

/**
 * Notify the popup of updates
 * @param {number} count - The new invitation count
 * @param {string} message - Optional message to display
 */
const notifyPopup = (count: number, message: string = ''): void => {
  chrome.runtime.sendMessage({
    action: 'inviteComplete',
    count,
    message
  });
};

/**
 * Notify popup of individual invite success
 * @param {string} name - The name of the person invited
 * @param {number} currentCount - Current count of invites
 */
const notifyInviteSuccess = (name: string, currentCount: number): void => {
  chrome.runtime.sendMessage({
    action: 'inviteSuccess',
    name,
    currentCount
  });
};

/**
 * Inject the content script if it hasn't been injected yet
 * @param {number} tabId - The ID of the tab to inject into
 */
const injectContentScriptIfNeeded = async (tabId: number): Promise<void> => {
  // Try sending a message to check if content script is already injected
  try {
    await sendTabMessageAsync(tabId, { action: "ping" });
    // Content script is already injected
  } catch (error) {
    // Content script is not injected, inject it
    await executeScriptAsync(tabId, ['content.js']);
  }
};

/**
 * Load translations for a specific language
 */
const loadTranslations = async (language: string): Promise<TranslationData> => {
  try {
    // Get the URL for the messages.json file - use type assertion to silence TypeScript
    const url = (chrome.runtime as any).getURL(`_locales/${language}/messages.json`);
    
    // Fetch the translations
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to load translations: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Convert the complex structure to a simpler format
    const simpleData: TranslationData = {};
    for (const [key, value] of Object.entries(data)) {
      simpleData[key] = (value as any).message;
    }
    
    console.log(`Loaded ${Object.keys(simpleData).length} translations for ${language}`);
    return simpleData;
  } catch (error) {
    console.error(`Error loading translations for ${language}:`, error);
    // Fallback to English
    if (language !== 'en') {
      console.log('Falling back to English translations');
      return loadTranslations('en');
    }
    // If we can't even load English, return minimal fallback
    return {
      error: "Error loading translations",
      inviteButton: "Invite",
      stopButton: "Stop",
      namesLabel: "People to invite:"
    };
  }
};

// Message listener for all extension communication
chrome.runtime.onMessage.addListener((message: ChromeMessage, sender, sendResponse) => {
  try {
    // Handle message from content script about individual invite progress
    if (message.action === 'individualInviteSuccess' && message.name && message.currentInviteCount !== undefined) {
      // Update the current invite count
      invitedCount = message.currentInviteCount;
      
      // Notify popup of this individual success
      notifyInviteSuccess(message.name, invitedCount);
      
      sendResponse({ success: true });
      return true;
    }

    // Handle message from content script about invite completion
    if (message.action === 'inviteComplete' && sender.tab) {
      const count = message.count || 0;
      
      // Notify popup with the results
      notifyPopup(count, message.message || 'Invitations completed');
      
      // Reset state
      activeInviteTabId = null;
      inviteComplete = true;
      
      sendResponse({ success: true });
      return true;
    }

    // Handle message from content script about stopping invites
    if (message.action === 'inviteStopped' && sender.tab) {
      const count = message.count || 0;
      
      // Notify popup that the process was stopped
      chrome.runtime.sendMessage({
        action: 'inviteStopped',
        count: count
      });
      
      // Reset state
      activeInviteTabId = null;
      inviteComplete = true;
      
      sendResponse({ success: true });
      return true;
    }
    
    switch (message.action) {
      case 'startInvites': {
        // Store the names and translations for this invitation session
        const names = message.names || [];
        const translationData = message.translations as TranslationData;
        
        // If we're already processing invites, don't start again
        if (activeInviteTabId !== null && !inviteComplete) {
          sendResponse({ error: translationData?.alreadyProcessing || 'Already processing invites' });
          return true;
        }
        
        inviteComplete = false;
        
        // If we're continuing a session, don't reset the invited count
        if (!message.isContinuation) {
          invitedCount = 0;
        }
        
        // Get the active tab
        queryTabsAsync({ active: true, currentWindow: true }).then(tabs => {
          if (tabs.length === 0) {
            sendResponse({ error: translationData?.noTabFound || 'No active tab found' });
            return;
          }

          const activeTab = tabs[0];
          activeInviteTabId = activeTab.id;

          // Make sure content script is injected
          injectContentScriptIfNeeded(activeTab.id!).then(() => {
            // Send message to content script to start inviting people
            sendTabMessageAsync(activeTab.id!, {
              action: 'startInvites', 
              names: names, 
              message: message.message,
              translations: translationData,
              isContinuation: message.isContinuation || false // Pass along the continuation flag
            }).then(() => {
              sendResponse({ status: 'started' });
            }).catch(error => {
              console.error('Error sending message to content script:', error);
              sendResponse({ error: translationData?.errorCommunicating || 'Error communicating with LinkedIn page' });
            });
          }).catch(error => {
            console.error('Error injecting content script:', error);
            sendResponse({ error: 'Error injecting content script' });
          });
        });
        
        return true;
      }
      
      case 'changeLanguage': {
        if (!message.language) {
          sendResponse({ success: false, message: 'No language specified' });
          return true;
        }
        
        const language = message.language as string;
        currentLanguage = language;
        
        // Save the language preference
        setStorageAsync({ language }).then(() => {
          // Load translations if not already loaded
          if (!translations[language]) {
            loadTranslations(language).then(data => {
              translations[language] = data;
              sendResponse({ success: true, language });
            }).catch(error => {
              sendResponse({ error: (error as Error).message });
            });
          } else {
            sendResponse({ success: true, language });
          }
        });
        
        return true;
      }
      
      case 'getTranslations': {
        const language = message.language as string || currentLanguage;
        
        if (translations[language]) {
          sendResponse({ translations: translations[language] });
          return true;
        }
        
        loadTranslations(language).then(data => {
          translations[language] = data;
          sendResponse({ translations: data });
        }).catch(error => {
          sendResponse({ error: (error as Error).message });
        });
        
        return true;
      }
      
      case 'checkInviteStatus': {
        if (!activeInviteTabId) {
          sendResponse({ status: "idle" });
          return true;
        }

        getTabAsync(activeInviteTabId).then(tab => {
          // Send a ping to the content script to check if it's still processing
          sendTabMessageAsync<{
            invitedCount?: number;
            isProcessing?: boolean;
          }>(activeInviteTabId as number, { action: "ping" }).then(response => {
            // Include the current invite count in the response
            sendResponse({ 
              status: "active", 
              tabId: activeInviteTabId, 
              tabTitle: tab.title,
              invitedCount: response.invitedCount || 0,
              isProcessing: response.isProcessing
            });
          }).catch(() => {
            // Content script not responding, reset the active tab
            activeInviteTabId = null;
            sendResponse({ status: "idle" });
          });
        }).catch(() => {
          // Tab doesn't exist anymore
          activeInviteTabId = null;
          sendResponse({ status: "idle" });
        });
        
        return true;
      }
      
      case 'stopInvites': {
        if (!activeInviteTabId) {
          sendResponse({ status: "not_active" });
          return true;
        }

        const currentActiveTabId = activeInviteTabId; // Store temporarily to use in async call
        
        // Reset the active tab ID immediately to allow new invitation processes to start
        activeInviteTabId = null;
        inviteComplete = true;
        
        sendTabMessageAsync(currentActiveTabId, { action: "stopInvites" }).then(() => {
          sendResponse({ status: "stopping" });
        }).catch(() => {
          // Content script not responding, but we've already reset state
          sendResponse({ status: "not_active" });
        });
        
        return true;
      }
      
      default:
        sendResponse({ success: false, message: 'Unknown action' });
        return true;
    }
  } catch (error) {
    console.error('Error processing message:', error);
    sendResponse({ success: false, message: (error as Error).message });
    return true;
  }
});

// Listen for tab removal
(chrome.tabs as any).onRemoved.addListener((tabId: number) => {
  if (tabId === activeInviteTabId) {
    activeInviteTabId = null;
    console.log('Invitation tab closed');
  }
});

// Initialize when extension is installed or updated
(chrome.runtime as any).onInstalled.addListener(async () => {
  // Load translations for current language
  const data = await getStorageAsync<{ language?: string }>(['language']);
  currentLanguage = data.language || 'en';
  const manifest = (chrome.runtime as any).getManifest();
  console.log(`${manifest.name} v${manifest.version} initialized`);
});
