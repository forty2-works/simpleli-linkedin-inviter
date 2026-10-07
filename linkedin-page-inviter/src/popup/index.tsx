import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

import Popup from './Popup';
import { TranslationProvider } from '../contexts/TranslationContext';
import { InvitationProvider } from '../contexts/InvitationContext';

// Entry point - renders the application with all context providers
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('app');
  if (container) {
    const root = createRoot(container);
    root.render(
      <TranslationProvider>
        <InvitationProvider>
          <Popup />
        </InvitationProvider>
      </TranslationProvider>
    );
  }
}); 