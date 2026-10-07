import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { sendMessageAsync, getStorageAsync, setStorageAsync } from '../utils/chromeUtils';
import { useTranslation } from './TranslationContext';

export interface LinkedInEvent {
  id: string;
  name: string;
  url: string;
  date?: string;
  location?: string;
  imageUrl?: string;
}

export interface InvitationStats {
  total: number;
  sent: number;
  remaining: number;
}

export interface AttendeeInfo {
  profileId: string;
  name: string;
  headline?: string;
  avatar?: string;
  invited: boolean;
  connection?: 'CONNECTED' | 'NOT_CONNECTED' | 'PENDING' | 'UNKNOWN';
}

interface InvitationContextType {
  currentEvent: LinkedInEvent | null;
  invitationStats: InvitationStats;
  attendees: AttendeeInfo[];
  loading: boolean;
  scanning: boolean;
  scanEvent: (eventId: string) => Promise<void>;
  inviteAttendee: (attendee: AttendeeInfo) => Promise<boolean>;
  inviteMultiple: (count: number) => Promise<number>;
  inviteAll: () => Promise<number>;
  resetInvitations: () => void;
  error: string | null;
  clearError: () => void;
  isEventPage: boolean;
  checkIsEventPage: () => Promise<boolean>;
  customMessage: string;
  setCustomMessage: (message: string) => void;
  saveCustomMessage: () => Promise<void>;
  loadCustomMessage: () => Promise<void>;
}

const InvitationContext = createContext<InvitationContextType | undefined>(undefined);

interface InvitationProviderProps {
  children: ReactNode;
}

export function InvitationProvider({ children }: InvitationProviderProps) {
  const [currentEvent, setCurrentEvent] = useState<LinkedInEvent | null>(null);
  const [attendees, setAttendees] = useState<AttendeeInfo[]>([]);
  const [invitationStats, setInvitationStats] = useState<InvitationStats>({ total: 0, sent: 0, remaining: 0 });
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEventPage, setIsEventPage] = useState(false);
  const [customMessage, setCustomMessage] = useState('');

  const { translateWithSubstitutions } = useTranslation();

  const clearError = () => setError(null);

  const checkIsEventPage = async (): Promise<boolean> => {
    try {
      const response = await sendMessageAsync<{ isEventPage: boolean }>({
        action: "checkIsEventPage"
      });
      setIsEventPage(response.isEventPage);
      return response.isEventPage;
    } catch (err) {
      console.error("Error checking if event page:", err);
      setIsEventPage(false);
      return false;
    }
  };

  const scanEvent = async (eventId: string) => {
    setScanning(true);
    setLoading(true);
    setError(null);
    
    try {
      // First get event details
      const eventResponse = await sendMessageAsync<{ 
        success: boolean;
        event?: LinkedInEvent;
        error?: string;
      }>({
        action: "getEventDetails",
        eventId
      });

      if (!eventResponse.success || !eventResponse.event) {
        setError(eventResponse.error || translateWithSubstitutions('errorFetchingEvent'));
        setScanning(false);
        setLoading(false);
        return;
      }

      setCurrentEvent(eventResponse.event);
      
      // Then scan attendees
      const attendeesResponse = await sendMessageAsync<{
        success: boolean;
        attendees?: AttendeeInfo[];
        error?: string;
      }>({
        action: "scanEventAttendees",
        eventId
      });

      if (!attendeesResponse.success || !attendeesResponse.attendees) {
        setError(attendeesResponse.error || translateWithSubstitutions('errorScanningAttendees'));
        setScanning(false);
        setLoading(false);
        return;
      }

      const attendeeList = attendeesResponse.attendees;
      setAttendees(attendeeList);
      
      // Update stats
      const invitedCount = attendeeList.filter(a => a.invited).length;
      const totalCount = attendeeList.length;
      const remainingCount = totalCount - invitedCount;
      
      setInvitationStats({
        total: totalCount,
        sent: invitedCount,
        remaining: remainingCount
      });
    } catch (err) {
      console.error("Error scanning event:", err);
      setError(translateWithSubstitutions('errorCommunicating'));
    } finally {
      setScanning(false);
      setLoading(false);
    }
  };

  const inviteAttendee = async (attendee: AttendeeInfo): Promise<boolean> => {
    if (attendee.invited) {
      return false;
    }

    setLoading(true);
    try {
      const response = await sendMessageAsync<{
        success: boolean;
        error?: string;
      }>({
        action: "inviteAttendee",
        profileId: attendee.profileId,
        name: attendee.name,
        message: customMessage
      });

      if (response.success) {
        // Update attendees list with invited status
        setAttendees(prevAttendees => 
          prevAttendees.map(a => 
            a.profileId === attendee.profileId 
              ? { ...a, invited: true } 
              : a
          )
        );
        
        // Update invitation stats
        setInvitationStats(prev => ({
          ...prev,
          sent: prev.sent + 1,
          remaining: prev.remaining - 1
        }));
        return true;
      } else {
        setError(response.error || translateWithSubstitutions('errorInviting'));
        return false;
      }
    } catch (err) {
      console.error("Error inviting attendee:", err);
      setError(translateWithSubstitutions('errorCommunicating'));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const inviteMultiple = async (count: number): Promise<number> => {
    setLoading(true);
    let invitedCount = 0;

    try {
      // Get non-invited attendees
      const availableAttendees = attendees.filter(a => !a.invited);
      const toInvite = availableAttendees.slice(0, count);
      
      if (toInvite.length === 0) {
        setError(translateWithSubstitutions('noMoreAttendees'));
        return 0;
      }

      // Invite them one by one
      for (const attendee of toInvite) {
        const success = await inviteAttendee(attendee);
        if (success) {
          invitedCount++;
        }
      }

      return invitedCount;
    } catch (err) {
      console.error("Error in batch invite:", err);
      setError(translateWithSubstitutions('errorBatchInvite'));
      return invitedCount;
    } finally {
      setLoading(false);
    }
  };

  const inviteAll = async (): Promise<number> => {
    // Get count of non-invited attendees
    const remainingAttendees = attendees.filter(a => !a.invited).length;
    
    return inviteMultiple(remainingAttendees);
  };

  const resetInvitations = () => {
    setCurrentEvent(null);
    setAttendees([]);
    setInvitationStats({ total: 0, sent: 0, remaining: 0 });
    setError(null);
  };

  const saveCustomMessage = async (): Promise<void> => {
    try {
      await setStorageAsync({ customMessage });
    } catch (err) {
      console.error("Error saving custom message:", err);
    }
  };

  const loadCustomMessage = async (): Promise<void> => {
    try {
      const data = await getStorageAsync<{ customMessage: string }>('customMessage');
      if (data.customMessage) {
        setCustomMessage(data.customMessage);
      }
    } catch (err) {
      console.error("Error loading custom message:", err);
    }
  };

  // Check if we're on an event page when the context loads
  useEffect(() => {
    checkIsEventPage();
    loadCustomMessage();
  }, []);

  // Save custom message when it changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveCustomMessage();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [customMessage]);

  const value = {
    currentEvent,
    invitationStats,
    attendees,
    loading,
    scanning,
    scanEvent,
    inviteAttendee,
    inviteMultiple,
    inviteAll,
    resetInvitations,
    error,
    clearError,
    isEventPage,
    checkIsEventPage,
    customMessage,
    setCustomMessage,
    saveCustomMessage,
    loadCustomMessage
  };

  return (
    <InvitationContext.Provider value={value}>
      {children}
    </InvitationContext.Provider>
  );
}

export function useInvitation() {
  const context = useContext(InvitationContext);
  if (context === undefined) {
    throw new Error('useInvitation must be used within an InvitationProvider');
  }
  return context;
} 