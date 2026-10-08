import React from 'react';
import Header from '../components/Header';
import InvitationForm from '../components/InvitationForm';
import Footer from '../components/Footer';

// Import the logo
import logo from '../../images/logo.png';

const Popup: React.FC = () => {
  return (
    <div className="container">
      <Header logo={logo} />
      
      <main className="main-content">
        <InvitationForm />
      </main>
      
      <Footer 
        version="1.0.7"
        repoUrl="https://github.com/forty2-works/simpleli-linkedin-inviter"
      />
    </div>
  );
};

export default Popup; 