/// <reference types="chrome" />

// Type definitions for Chrome extension API
// These declarations make TypeScript aware of the Chrome API

declare namespace chrome {
  namespace runtime {
    function sendMessage<T>(message: any, callback?: (response: T) => void): void;
    function sendMessage<T>(extensionId: string, message: any, callback?: (response: T) => void): void;
    function sendMessage<T>(extensionId: string, message: any, options: any, callback?: (response: T) => void): void;
    function getURL(path: string): string;
    function getManifest(): chrome.runtime.Manifest;
    
    const onMessage: {
      addListener(callback: (message: any, sender: any, sendResponse: (response: any) => void) => void | boolean): void;
      removeListener(callback: (message: any, sender: any, sendResponse: (response: any) => void) => void): void;
    };

    const onInstalled: chrome.events.Event<(details: chrome.runtime.InstalledDetails) => void>;
    
    interface Manifest {
      version: string;
      name: string;
      description: string;
      [key: string]: any;
    }
    
    interface InstalledDetails {
      reason: 'install' | 'update' | 'chrome_update' | 'shared_module_update';
      previousVersion?: string;
      id?: string;
    }
  }

  namespace storage {
    const local: {
      get(keys: string | string[] | object | null, callback: (items: { [key: string]: any }) => void): void;
      set(items: object, callback?: () => void): void;
      remove(keys: string | string[], callback?: () => void): void;
      clear(callback?: () => void): void;
    };
  }

  namespace tabs {
    export interface CreateProperties {
      active?: boolean;
      url?: string;
      pinned?: boolean;
      index?: number;
      windowId?: number;
      openerTabId?: number;
      // Add any other properties needed
    }

    export interface QueryInfo {
      active?: boolean;
      audible?: boolean;
      currentWindow?: boolean;
      discarded?: boolean;
      highlighted?: boolean;
      index?: number;
      muted?: boolean;
      pinned?: boolean;
      status?: string;
      title?: string;
      url?: string | string[];
      windowId?: number;
      windowType?: string;
      // Add any other properties needed
    }

    export interface UpdateProperties {
      active?: boolean;
      autoDiscardable?: boolean;
      highlighted?: boolean;
      muted?: boolean;
      openerTabId?: number;
      pinned?: boolean;
      url?: string;
    }

    function create(createProperties: CreateProperties): Promise<chrome.tabs.Tab>;
    function get(tabId: number): Promise<chrome.tabs.Tab>;
    function query(queryInfo: QueryInfo): Promise<chrome.tabs.Tab[]>;
    function sendMessage(tabId: number, message: any): Promise<any>;
    function update(tabId: number, updateProperties: UpdateProperties): Promise<chrome.tabs.Tab>;
    const onRemoved: chrome.events.Event<(tabId: number, removeInfo: any) => void>;

    interface Tab {
      id?: number;
      url?: string;
      title?: string;
    }
  }

  namespace scripting {
    interface ScriptInjection {
      target: {
        tabId: number;
        allFrames?: boolean;
      };
      files?: string[];
      func?: Function;
      args?: any[];
      world?: string;
      injectImmediately?: boolean;
    }
    
    interface InjectionResult {
      frameId: number;
      result: any;
    }
    
    function executeScript(details: chrome.scripting.ScriptInjection): Promise<chrome.scripting.InjectionResult[]>;
  }
  
  namespace events {
    interface Event<T extends Function> {
      addListener(callback: T): void;
      removeListener(callback: T): void;
      hasListener(callback: T): boolean;
    }
  }
}

// Chrome API type definitions for the LinkedIn Event Inviter extension
// These supplement the standard Chrome types to avoid TypeScript errors

interface Chrome {
  tabs: {
    get: (tabId: number, callback: (tab: chrome.tabs.Tab) => void) => void;
    query: (queryInfo: any, callback?: (tabs: chrome.tabs.Tab[]) => void) => Promise<chrome.tabs.Tab[]>;
    sendMessage: (tabId: number, message: any) => Promise<any>;
    update: (tabId: number, updateProperties: chrome.tabs.UpdateProperties) => Promise<chrome.tabs.Tab>;
    onRemoved: chrome.events.Event<(tabId: number, removeInfo: any) => void>;
  };
  runtime: {
    lastError?: {
      message: string;
    };
    sendMessage: (message: any, responseCallback?: (response: any) => void) => void;
    onMessage: {
      addListener: (
        callback: (
          message: any,
          sender: chrome.runtime.MessageSender,
          sendResponse: (response?: any) => void
        ) => boolean | undefined | void
      ) => void;
    };
    getURL: (path: string) => string;
    getManifest: () => chrome.runtime.Manifest;
    onInstalled: chrome.events.Event<(details: chrome.runtime.InstalledDetails) => void>;
  };
  storage: {
    local: {
      get: <T = any>(keys: string | string[] | null, callback?: (items: T) => void) => Promise<T>;
      set: (items: Record<string, any>, callback?: () => void) => Promise<void>;
    };
  };
  scripting: {
    executeScript: (details: {
      target: { tabId: number };
      files?: string[];
      func?: () => void;
      args?: any[];
    }) => Promise<any>;
  };
  events: {
    Event: chrome.events.Event<any>;
  };
}

// Extend the Window interface to include chrome
declare interface Window {
  chrome: Chrome;
}

// Ensure chrome is available globally
declare var chrome: Chrome;

export interface ChromeMessage {
  action: string;
  names?: string[];
  language?: string;
  translations?: TranslationData;
  count?: number;
  total?: number;
  error?: string;
  message?: string;
  success?: boolean;
  invitedCount?: number;
  status?: string;
  added?: number;
  newCount?: number;
  name?: string;
  currentInviteCount?: number;
  currentCount?: number;
  index?: number;
  isContinuation?: boolean;
}

export interface TranslationData {
  [key: string]: string;
}

// Extend chrome namespace
declare global {
  interface Window {
    requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => IdleRequestCallbackID;
  }
}

export {}; 