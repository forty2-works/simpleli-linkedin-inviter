import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../contexts/TranslationContext';
import { useInvitation } from '../contexts/InvitationContext';
import { queryTabsAsync } from '../utils/chromeUtils';

// Define a session state interface to track invitation progress
interface InvitationSession {
  originalCount: number;
  invitedCount: number;
  isActive: boolean;
}

const InvitationForm: React.FC = () => {
  const [names, setNames] = useState('');
  const [status, setStatus] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Session state for tracking the invitation process
  const [session, setSession] = useState<InvitationSession>({
    originalCount: 0,
    invitedCount: 0,
    isActive: false
  });
  
  const { translations } = useTranslation();
  const { inviteMultiple, customMessage, setCustomMessage } = useInvitation();
  
  // Session ref to access latest session in callbacks
  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);
  
  // Helper to get filtered names count
  const getFilteredNamesCount = (): number => {
    return names.split('\n').filter(name => name.trim()).length;
  };
  
  // Helper function to update status with counts
  const updateStatusWithCounts = (current: number, total: number, translationKey: string) => {
    if (translationKey === 'invitationSummary') {
      setStatus(
        (translations.invitationSummary || 'Done. $ADDED$ of $TOTAL$ names added')
          .replace('$ADDED$', current.toString())
          .replace('$TOTAL$', total.toString())
      );
    } else if (translationKey === 'invitingProgress') {
      setStatus(
        (translations.invitingProgress || 'Invited $CURRENT$ of $TOTAL$ people...')
          .replace('$CURRENT$', current.toString())
          .replace('$TOTAL$', total.toString())
      );
    } else if (translationKey === 'processingNames') {
      setStatus(
        (translations.processingNames || 'Processing $COUNT$ names...')
          .replace('$COUNT$', total.toString())
      );
    } else if (translationKey === 'processingStopped') {
      setStatus(
        (translations.processingStopped || 'Process stopped. $ADDED$ of $TOTAL$ people were invited.')
          .replace('$ADDED$', current.toString())
          .replace('$TOTAL$', total.toString())
      );
    }
  };
  
  // Load saved names and session info when component mounts
  useEffect(() => {
    chrome.storage.local.get(['names', 'invitationSession'], data => {
      if (data.names && data.names.trim()) {
        setNames(data.names);
      }
      
      if (data.invitationSession) {
        setSession(data.invitationSession);
        
        // If there was an active session, update status
        const savedSession = data.invitationSession as InvitationSession;
        if (savedSession.isActive) {
          setIsProcessing(true);
          updateStatusWithCounts(
            savedSession.invitedCount, 
            savedSession.originalCount, 
            'invitingProgress'
          );
          
          // Start checking status
          startStatusChecking();
        }
      }
    });
  }, []);
  
  // Separate effect to save names to storage with debounce
  useEffect(() => {
    const saveTimeout = setTimeout(() => {
      if (names.trim()) {
        chrome.storage.local.set({ names });
      }
    }, 500); // Debounce for 500ms
    
    return () => clearTimeout(saveTimeout);
  }, [names]);
  
  // Save session updates to storage
  useEffect(() => {
    chrome.storage.local.set({ invitationSession: session });
  }, [session]);
  
  const handleSubmit = async () => {
    const nameList = names.split('\n').filter(name => name.trim());
    
    if (nameList.length === 0) {
      setStatus(translations.noNamesError || 'Please enter at least one name');
      return;
    }
    
    // Reset status and set processing state
    setStatus('');
    setIsProcessing(true);
    
    // Initialize a new session
    const totalNamesToProcess = nameList.length;
    const newSession: InvitationSession = {
      originalCount: totalNamesToProcess,
      invitedCount: 0,
      isActive: true
    };
    
    // Update session state and storage
    setSession(newSession);
    chrome.storage.local.set({ 
      invitationSession: newSession,
      originalNameList: nameList // Store the original list for reference
    });
    
    try {
      // First check if we're on the correct LinkedIn events page
      const tabs = await queryTabsAsync({ active: true, currentWindow: true });
      const tab = tabs[0];
      
      if (!tab?.url?.includes('linkedin.com/company') || !tab?.url?.includes('admin/dashboard')) {
        setIsProcessing(false);
        setSession(prev => ({ ...prev, isActive: false }));
        setStatus(translations.openLinkedInEvent || 'Please open a LinkedIn company admin page');
        return;
      }
      
      // Send message to background script to start invites
      // Always set isContinuation to false to ensure a fresh start
      // This ensures we don't rely on the previous content script state
      chrome.runtime.sendMessage(
        { 
          action: 'startInvites', 
          names: nameList,
          message: customMessage,
          translations: translations,
          isContinuation: false // Always start fresh to avoid state issues
        },
        response => {
          if (chrome.runtime.lastError) {
            console.error("Error sending message:", chrome.runtime.lastError);
            setIsProcessing(false);
            setSession(prev => ({ ...prev, isActive: false }));
            setStatus(translations.errorCommunicating || 'Error communicating with LinkedIn page');
            return;
          }
          
          if (response.error) {
            setIsProcessing(false);
            setSession(prev => ({ ...prev, isActive: false }));
            setStatus(response.error);
            return;
          }
          
          // Process started successfully
          setStatus(
            (translations.processingNames || 'Processing $COUNT$ names...')
              .replace('$COUNT$', totalNamesToProcess.toString())
          );
                  
          // Start checking status
          startStatusChecking();
        }
      );
    } catch (error) {
      console.error("Error checking tab:", error);
      setIsProcessing(false);
      setSession(prev => ({ ...prev, isActive: false }));
      setStatus(translations.errorCommunicating || 'Error communicating with browser');
    }
  };
  
  const stopInviteProcess = () => {
    setStatus(translations.stoppingProcess || 'Stopping invitation process...');
    setIsProcessing(true); // Keep processing state until confirmed stopped
    chrome.runtime.sendMessage({ action: 'stopInvites' }, response => {
      if (chrome.runtime.lastError) {
        console.error("Error stopping process:", chrome.runtime.lastError);
        setIsProcessing(false);
        setStatus(translations.errorCommunicating || 'Error communicating with browser');
        return;
      }
      // Start polling for actual stop confirmation
      pollForStopConfirmation();
    });
  };
  
  // Poll for process stop confirmation
  const pollForStopConfirmation = () => {
    const pollInterval = 500;
    const maxAttempts = 20; // 10 seconds max
    let attempts = 0;
    const poll = () => {
      chrome.runtime.sendMessage({ action: 'checkInviteStatus' }, response => {
        if (chrome.runtime.lastError) {
          setIsProcessing(false);
          setStatus(translations.errorCommunicating || 'Error communicating with browser');
          return;
        }
        if (response.status === 'idle' || response.status === 'stopping') {
          setIsProcessing(false);
          setSession(prev => ({ ...prev, isActive: false }));
          setStatus(translations.processCompleted || 'Process completed');
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, pollInterval);
        } else {
          setIsProcessing(false);
          setStatus(translations.processCompleted || 'Process completed');
        }
      });
    };
    poll();
  };
  
  const startStatusChecking = () => {
    let statusInterval: number | null = null;
    
    // Check status immediately
    checkInviteStatus();
    
    // Set up interval to check status
    statusInterval = window.setInterval(() => {
      checkInviteStatus(() => {
        if (statusInterval) {
          clearInterval(statusInterval);
          statusInterval = null;
        }
      });
    }, 2000);
  };
  
  const checkInviteStatus = (onCompleted?: () => void) => {
    chrome.runtime.sendMessage({ action: 'checkInviteStatus' }, response => {
      if (chrome.runtime.lastError) {
        console.error("Error checking status:", chrome.runtime.lastError);
        return;
      }
      
      // Use current session from ref for the most up-to-date values
      const currentSession = sessionRef.current;
      
      // If status is stopping or stopped, ensure the UI reflects this
      if (response.status === "stopping" || (response.status === "idle" && isProcessing)) {
        // Process has completed or stopped
        setIsProcessing(false);
        
        // Update session state
        setSession(prev => ({ 
          ...prev, 
          isActive: false,
          invitedCount: response.invitedCount || prev.invitedCount
        }));
        
        if (response.status === "stopping") {
          setStatus(translations.stoppingProcess || 'Stopping invitation process...');
        } else if (response.invitedCount > 0) {
          // Show completion message with the count of successfully invited people
          updateStatusWithCounts(
            response.invitedCount, 
            currentSession.originalCount, 
            'invitationSummary'
          );
        } else {
          setStatus(translations.processCompleted || 'Process completed');
        }
        
        // Call completion callback if provided
        if (onCompleted) onCompleted();
      }
      else if (response.status === "active") {
        // Update the current invited count from the response
        if (response.invitedCount !== undefined) {
          // Update session with new invited count
          setSession(prev => ({ 
            ...prev, 
            invitedCount: response.invitedCount as number 
          }));
          
          // Show real-time progress
          updateStatusWithCounts(
            response.invitedCount, 
            currentSession.originalCount, 
            'invitingProgress'
          );
        } else {
          // Fall back to generic processing message if count not available
          updateStatusWithCounts(0, currentSession.originalCount, 'processingNames');
        }
      }
    });
  };
  
  // Listen for messages from background script
  useEffect(() => {
    const messageListener = (message: any) => {
      if (message.action === 'inviteComplete') {
        setIsProcessing(false);
        
        // Update session state
        setSession(prev => ({ 
          ...prev, 
          isActive: false,
          invitedCount: message.count || prev.invitedCount
        }));
        
        if (message.message) {
          setStatus(message.message);
        } else {
          // Use session from ref for the most up-to-date values
          const currentSession = sessionRef.current;
          updateStatusWithCounts(
            message.count || currentSession.invitedCount, 
            currentSession.originalCount, 
            'invitationSummary'
          );
        }
      }
      
      if (message.action === 'inviteStopped') {
        setIsProcessing(false);
        
        // Update session state
        setSession(prev => ({ 
          ...prev, 
          isActive: false,
          invitedCount: message.count || prev.invitedCount
        }));
        
        if (message.message) {
          setStatus(message.message);
        } else {
          // Use session from ref for the most up-to-date values
          const currentSession = sessionRef.current;
          updateStatusWithCounts(
            message.count || currentSession.invitedCount, 
            currentSession.originalCount, 
            'processingStopped'
          );
        }
      }
      
      // Handle individual invite success
      if (message.action === 'inviteSuccess' && message.name) {
        // Increment invited count in session
        if (message.currentCount !== undefined) {
          setSession(prev => ({ 
            ...prev, 
            invitedCount: message.currentCount 
          }));
          
          // Use session from ref for the most up-to-date values
          const currentSession = sessionRef.current;
          updateStatusWithCounts(
            message.currentCount, 
            currentSession.originalCount, 
            'invitingProgress'
          );
        }
        
        // Remove the successfully invited name from the list
        const namesArray = names.split('\n');
        const nameIndex = namesArray.findIndex(n => 
          n.trim().toLowerCase() === message.name.trim().toLowerCase()
        );
        
        if (nameIndex !== -1) {
          namesArray.splice(nameIndex, 1);
          const updatedNames = namesArray.join('\n');
          setNames(updatedNames);
          
          // Update storage immediately when a name is successfully invited
          chrome.storage.local.set({ names: updatedNames });
        }
      }
    };
    
    chrome.runtime.onMessage.addListener(messageListener);
    
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, [names, translations]);
  
  return (
    <>
      <div className="form-group">
        <div className="label-with-info">
          <label htmlFor="names">
            {translations.namesLabel || 'People to invite:'}
          </label>
          <div className="info-icon">
            i
            <div className="tooltip">
              {translations.namesInfoTooltip || 'You can copy and paste names from your exported LinkedIn connections or enter them manually.'}
            </div>
          </div>
        </div>
        <textarea 
          id="names"
          placeholder={translations.namesPlaceholder || 'Enter names, one per line'}
          value={names}
          onChange={(e) => setNames(e.target.value)}
          disabled={isProcessing}
        />
      </div>
      
      <button 
        onClick={isProcessing ? stopInviteProcess : handleSubmit}
        className={isProcessing ? 'stop-button' : ''} // Don't disable when processing, as it needs to be clickable for "Stop"
      >
        {isProcessing 
          ? translations.stopButton || 'Stop' 
          : `${translations.inviteButton || 'Invite'} ${getFilteredNamesCount() > 0 ? getFilteredNamesCount() : ''} ${getFilteredNamesCount() > 0 ? (translations.people || 'people') : ''}`}
      </button>
      
      {/* Status */}
      <div className={`status ${status ? 'block' : 'hidden'}`}>
        {status}
      </div>

      {/* Debug info - can be removed in production */}
      {/* 
      <div className="debug-info" style={{ fontSize: '10px', marginTop: '5px', color: '#888' }}>
        Session: {JSON.stringify(session)}
      </div>
      */}
    </>
  );
};

export default InvitationForm; 