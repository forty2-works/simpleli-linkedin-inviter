import React from 'react';
import { useTranslation } from '../contexts/TranslationContext';

interface FooterProps {
  version: string;
  repoUrl: string;
}

const Footer: React.FC<FooterProps> = ({ version, repoUrl }) => {
  const { translations } = useTranslation();
  
  return (
    <footer className="footer">
      <p>
        LinkedIn Event Inviter v{version} | {' '}
        <a 
          href={repoUrl} 
          target="_blank" 
          rel="noopener noreferrer"
        >
          {translations.moreInfo || 'More info'}
        </a>
      </p>
    </footer>
  );
};

export default Footer; 