import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string | null;
  attachment_url: string | null;
  attachment_type: string | null;
  created_at: string;
  status: 'sent' | 'delivered' | 'read';
}

export const useMessages = (chatId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get all messages for a chat
  const { data: messages, isLoading } = useQuery<Message[]>({
    queryKey: ['messages', chatId],
    queryFn: async () => {
      if (!chatId) return [];
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        toast.error('Failed to load messages');
        return [];
      }

      return data || [];
    },
    enabled: !!chatId,
  });

  // Subscribe to message updates
  useEffect(() => {
    if (!chatId || !user) return;

    // Mark messages as delivered when they are received
    const markMessagesAsDelivered = async () => {
      const { error } = await supabase
        .from('messages')
        .update({ status: 'delivered' })
        .eq('chat_id', chatId)
        .neq('sender_id', user.id)
        .eq('status', 'sent');

      if (error) {
        console.error('Error marking messages as delivered:', error);
      }
    };

    markMessagesAsDelivered();

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat:${chatId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'messages',
          filter: `chat_id=eq.${chatId}`
        }, 
        async (payload) => {
          // Mark incoming messages as delivered
          if (payload.new && payload.new.sender_id !== user.id) {
            const { error } = await supabase
              .from('messages')
              .update({ status: 'delivered' })
              .eq('id', payload.new.id)
              .eq('status', 'sent');

            if (error) {
              console.error('Error marking message as delivered:', error);
            }
          }

          // Update messages in cache
          queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [chatId, user, queryClient]);

  // Mark messages as read when the chat is focused
  useEffect(() => {
    if (!chatId || !user) return;

    const markMessagesAsRead = async () => {
      const { error } = await supabase
        .from('messages')
        .update({ status: 'read' })
        .eq('chat_id', chatId)
        .neq('sender_id', user.id)
        .in('status', ['sent', 'delivered']);

      if (error) {
        console.error('Error marking messages as read:', error);
      }
    };

    markMessagesAsRead();

    // Also mark messages as read when window gains focus
    const handleFocus = () => {
      markMessagesAsRead();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [chatId, user]);

  // Send a new message
  const sendMessage = useMutation({
    mutationFn: async ({
      content,
      attachment_url,
      attachment_type
    }: {
      content?: string;
      attachment_url?: string;
      attachment_type?: string;
    }) => {
      if (!chatId || !user) throw new Error('Cannot send message');
      if (!content && !attachment_url) throw new Error('Message cannot be empty');

      const { error } = await supabase.from('messages').insert({
        chat_id: chatId,
        sender_id: user.id,
        content: content || null,
        attachment_url: attachment_url || null,
        attachment_type: attachment_type || null,
        status: 'sent',
      });

      if (error) throw error;
    },
    onError: (error: any) => {
      toast.error('Failed to send message: ' + error.message);
    },
  });

  return {
    messages,
    isLoading,
    sendMessage,
  };
};