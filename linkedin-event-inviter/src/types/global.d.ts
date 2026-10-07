// global.d.ts
// Type definitions for the Chrome Extension API

/// <reference types="chrome" />

declare namespace chrome {
  export namespace runtime {
    export function sendMessage<T = any>(
      message: any,
      responseCallback?: (response: T) => void
    ): void;
    export const onMessage: {
      addListener(callback: (message: any, sender: any, sendResponse: (response?: any) => void) => void): void;
      removeListener(callback: (message: any, sender: any, sendResponse: (response?: any) => void) => void): void;
    };
    export const lastError: { message: string } | undefined;
  }

  export namespace storage {
    export interface StorageArea {
      get(keys: string | string[] | object | null, callback: (items: { [key: string]: any }) => void): void;
      set(items: object, callback?: () => void): void;
      remove(keys: string | string[], callback?: () => void): void;
      clear(callback?: () => void): void;
    }
    export const local: StorageArea;
    export const sync: StorageArea;
  }

  export namespace tabs {
    export interface Tab {
      id?: number;
      url?: string;
      title?: string;
      favIconUrl?: string;
      status?: string;
      active: boolean;
      index: number;
      windowId: number;
      highlighted: boolean;
      pinned: boolean;
      audible?: boolean;
      discarded: boolean;
      autoDiscardable: boolean;
      mutedInfo?: {
        muted: boolean;
      };
      width?: number;
      height?: number;
      sessionId?: string;
    }

    export function create(
      createProperties: {
        active?: boolean;
        url?: string;
        windowId?: number;
        index?: number;
        pinned?: boolean;
        openerTabId?: number;
      },
      callback?: (tab: Tab) => void
    ): void;
  }
} 