import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { sendMessageAsync, getStorageAsync, setStorageAsync } from '../utils/chromeUtils';

// Define the shape of our translations
interface Translations {
  [key: string]: string;
}

interface TranslationContextType {
  translations: Translations;
  language: string;
  changeLanguage: (language: string) => void;
  translateWithSubstitutions: (key: string, substitutions?: Record<string, string>) => string;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

interface TranslationProviderProps {
  children: ReactNode;
}

// Minimal fallback translations - only the most essential keys
// This is only used if we completely fail to load translations
const MINIMAL_FALLBACKS = {
  error: "Error loading translations",
  inviteButton: "Invite",
  stopButton: "Stop",
  namesLabel: "People to invite:"
};

export function TranslationProvider({ children }: TranslationProviderProps) {
  const [translations, setTranslations] = useState<Translations>({});
  const [language, setLanguage] = useState<string>('en');

  // Load translations for a language
  const loadTranslations = async (lang: string) => {
    try {
      const response = await sendMessageAsync<{
        error?: string;
        translations?: Translations;
      }>({ 
        action: "getTranslations", 
        language: lang
      });

      if (response.error) {
        console.error("Error loading translations:", response.error);
        // Just use minimal fallbacks
        setTranslations(MINIMAL_FALLBACKS);
        return;
      }

      setTranslations(response.translations || MINIMAL_FALLBACKS);
    } catch (error) {
      console.error("Failed to load translations:", error);
      // Fallback to minimal translations
      setTranslations(MINIMAL_FALLBACKS);
    }
  };

  // Handle language change
  const changeLanguage = async (newLanguage: string) => {
    setLanguage(newLanguage);
    await setStorageAsync({ language: newLanguage });
    
    // Also notify background script of language change
    try {
      await sendMessageAsync({ action: 'changeLanguage', language: newLanguage });
    } catch (error) {
      console.error("Error notifying of language change:", error);
    }
    
    loadTranslations(newLanguage);
  };

  // Translate a key with substitutions
  const translateWithSubstitutions = (key: string, substitutions: Record<string, string> = {}) => {
    let message = translations[key] || key;
    
    // Apply substitutions with uppercase keys
    Object.entries(substitutions).forEach(([k, value]) => {
      message = message.replace(`$${k.toUpperCase()}$`, value);
    });
    
    return message;
  };

  // Load initial language preference from storage
  useEffect(() => {
    const loadInitialLanguage = async () => {
      try {
        // First check if user has already set a language preference
        const data = await getStorageAsync<{ language?: string }>(['language']);
        
        if (data.language) {
          // User has a saved language preference, use it
          setLanguage(data.language);
          loadTranslations(data.language);
        } else {
          // No saved preference, detect browser language
          const browserLanguage = navigator.language.toLowerCase();
          // Check if it starts with 'de' (de, de-DE, de-AT, etc.)
          const detectedLanguage = browserLanguage.startsWith('de') ? 'de' : 'en';
          
          // Set and save the detected language
          setLanguage(detectedLanguage);
          await setStorageAsync({ language: detectedLanguage });
          loadTranslations(detectedLanguage);
          
          console.log(`Using browser language: ${browserLanguage}, set to: ${detectedLanguage}`);
        }
      } catch (error) {
        console.error("Error loading initial language:", error);
        setLanguage('en');
        loadTranslations('en');
      }
    };
    
    loadInitialLanguage();
  }, []);

  const value = {
    translations,
    language,
    changeLanguage,
    translateWithSubstitutions
  };

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
} 