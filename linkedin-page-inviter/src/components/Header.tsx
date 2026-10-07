import React from 'react';
import { useTranslation } from '../contexts/TranslationContext';

interface HeaderProps {
  logo: string;
}

const Header: React.FC<HeaderProps> = ({ logo }) => {
  const { translations, language, changeLanguage } = useTranslation();
  
  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    changeLanguage(e.target.value);
  };

  return (
    <header className="header">
      <div className="header-title">
        <img src={logo} alt="LinkedIn Page Inviter" className="app-logo" />
        <h1>{translations.title || 'LinkedIn Page Inviter'}</h1>
      </div>
      <select
        className="language-selector"
        value={language}
        onChange={handleLanguageChange}
      >
        <option value="en">English</option>
        <option value="de">Deutsch</option>
      </select>
    </header>
  );
};

export default Header; 