import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PresenceState {
  [userId: string]: {
    online_at: string;
    user_id: string;
  }[];
}

export const usePresence = (userId?: string) => {
  const [onlineUsers, setOnlineUsers] = useState<PresenceState>({});
  
  useEffect(() => {
    if (!userId) return;

    // Set up presence tracking
    const channel = supabase.channel('online-users')
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setOnlineUsers(state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        setOnlineUsers(current => ({
          ...current,
          [key]: newPresences
        }));
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        setOnlineUsers(current => {
          const state = { ...current };
          delete state[key];
          return state;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          });
        }
      });

    // Update last_seen on mount and before unload
    const updateLastSeen = async () => {
      const { error } = await supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', userId);

      if (error) console.error('Error updating last_seen:', error);
    };

    updateLastSeen();
    window.addEventListener('beforeunload', updateLastSeen);

    return () => {
      window.removeEventListener('beforeunload', updateLastSeen);
      channel.unsubscribe();
    };
  }, [userId]);

  const isOnline = (id: string) => {
    return Boolean(onlineUsers[id]?.length);
  };

  const getLastSeen = async (id: string) => {
    if (isOnline(id)) return null;

    const { data } = await supabase
      .from('profiles')
      .select('last_seen')
      .eq('id', id)
      .single();

    return data?.last_seen;
  };

  return {
    onlineUsers,
    isOnline,
    getLastSeen
  };
};