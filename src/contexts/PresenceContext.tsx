import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type PresenceStatus = 'online' | 'busy' | 'away' | 'offline';

export interface UserPresence {
  userId: string;
  fullName: string | null;
  avatarUrl: string | null;
  email: string | null;
  status: PresenceStatus;
  currentPage: string;
  currentEntity?: { type: string; id: string };
  lastActivity: string;
}

interface PresenceContextType {
  onlineUsers: UserPresence[];
  myStatus: PresenceStatus;
  setMyStatus: (status: PresenceStatus) => void;
  setCurrentEntity: (entity: { type: string; id: string } | undefined) => void;
  getUsersInPage: (route: string) => UserPresence[];
  getUsersViewingEntity: (type: string, id: string) => UserPresence[];
  isUserOnline: (userId: string) => boolean;
  getUserPresence: (userId: string) => UserPresence | undefined;
}

const PresenceContext = createContext<PresenceContextType | undefined>(undefined);

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [myStatus, setMyStatusState] = useState<PresenceStatus>('online');
  const [currentEntity, setCurrentEntityState] = useState<{ type: string; id: string } | undefined>();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscribingRef = useRef(false);

  // Track presence
  const trackPresence = useCallback(async () => {
    if (!user || !channelRef.current) return;

    const presenceData: UserPresence = {
      userId: user.id,
      fullName: user.full_name || null,
      avatarUrl: user.user_metadata?.avatar_url || null,
      email: user.email || null,
      status: myStatus,
      currentPage: location.pathname,
      currentEntity,
      lastActivity: new Date().toISOString()
    };

    await channelRef.current.track(presenceData);
  }, [user, myStatus, location.pathname, currentEntity]);

  // Set up presence channel
  useEffect(() => {
    if (!user) return;
    if (subscribingRef.current || channelRef.current) return; // already subscribing/subscribed

    subscribingRef.current = true;
    const channel = supabase.channel('presence:global', {
      config: {
        presence: {
          key: user.id
        }
      }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: UserPresence[] = [];
        
        Object.values(state).forEach((presences: any[]) => {
          presences.forEach((presence) => {
            if (presence.userId) {
              users.push({
                userId: presence.userId,
                fullName: presence.fullName,
                avatarUrl: presence.avatarUrl,
                email: presence.email,
                status: presence.status || 'online',
                currentPage: presence.currentPage || '/',
                currentEntity: presence.currentEntity,
                lastActivity: presence.lastActivity || new Date().toISOString()
              });
            }
          });
        });

        setOnlineUsers(users);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Presence channel subscribed for user', user.id);
          channelRef.current = channel;
          subscribingRef.current = false;
          // Initial track
          const presenceData: UserPresence = {
            userId: user.id,
            fullName: user.full_name || null,
            avatarUrl: user.user_metadata?.avatar_url || null,
            email: user.email || null,
            status: myStatus,
            currentPage: location.pathname,
            currentEntity,
            lastActivity: new Date().toISOString()
          };
          await channel.track(presenceData);
        }
      });

    return () => {
      try {
        console.log('Unsubscribing presence channel for user', user?.id);
        channel.unsubscribe();
      } catch (e) {
        // ignore
      }
      channelRef.current = null;
      subscribingRef.current = false;
    };
  }, [user?.id]);

  // Update presence when status or location changes
  useEffect(() => {
    if (channelRef.current && user) {
      trackPresence();
    }
  }, [myStatus, location.pathname, currentEntity, trackPresence, user]);

  // Heartbeat to keep presence alive
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      if (channelRef.current) {
        trackPresence();
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [trackPresence, user]);

  const setMyStatus = useCallback((status: PresenceStatus) => {
    setMyStatusState(status);
  }, []);

  const setCurrentEntity = useCallback((entity: { type: string; id: string } | undefined) => {
    setCurrentEntityState(entity);
  }, []);

  const getUsersInPage = useCallback((route: string) => {
    return onlineUsers.filter(u => u.currentPage === route && u.userId !== user?.id);
  }, [onlineUsers, user?.id]);

  const getUsersViewingEntity = useCallback((type: string, id: string) => {
    return onlineUsers.filter(u => 
      u.currentEntity?.type === type && 
      u.currentEntity?.id === id && 
      u.userId !== user?.id
    );
  }, [onlineUsers, user?.id]);

  const isUserOnline = useCallback((userId: string) => {
    return onlineUsers.some(u => u.userId === userId && u.status !== 'offline');
  }, [onlineUsers]);

  const getUserPresence = useCallback((userId: string) => {
    return onlineUsers.find(u => u.userId === userId);
  }, [onlineUsers]);

  return (
    <PresenceContext.Provider value={{
      onlineUsers,
      myStatus,
      setMyStatus,
      setCurrentEntity,
      getUsersInPage,
      getUsersViewingEntity,
      isUserOnline,
      getUserPresence
    }}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence() {
  const context = useContext(PresenceContext);
  if (!context) {
    throw new Error('usePresence must be used within a PresenceProvider');
  }
  return context;
}

export function usePresenceOptional() {
  return useContext(PresenceContext);
}
