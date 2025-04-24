import React, { useState, useRef, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Paperclip, Image as ImageIcon, X, MessageCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import Message from "./Message";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useChats, ChatWithParticipants } from "@/hooks/useChats";
import { format } from "date-fns";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'image/webp'];

interface ChatWindowProps {
  chatId?: string;
  className?: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ chatId, className }) => {
  const [newMessage, setNewMessage] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const { user } = useAuth();
  const { chats } = useChats();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentChat = chats?.find(c => c.id === chatId);
  const otherParticipant = currentChat?.participants.find(p => p.user_id !== user?.id)?.profiles;

  useEffect(() => {
    if (!chatId) return;

    // Subscribe to messages
    const channel = supabase
      .channel(`chat:${chatId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'messages',
          filter: `chat_id=eq.${chatId}`
        }, 
        payload => {
          // Handle real-time updates while maintaining chronological order
          setMessages(current => {
            const newMessage = payload.new;
            const messageExists = current.some(msg => msg.id === newMessage.id);
            if (messageExists) return current;
            
            const newMessages = [...current, newMessage];
            return newMessages.sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          });
        }
      )
      .subscribe();

    // Fetch existing messages
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        toast.error('Failed to load messages');
      } else {
        setMessages(data || []);
      }
    };

    fetchMessages();

    return () => {
      channel.unsubscribe();
    };
  }, [chatId]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`);
      }

      // Validate file type
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        throw new Error(`File type not supported. Allowed types: ${ALLOWED_FILE_TYPES.map(type => type.split('/')[1]).join(', ')}`);
      }

      setAttachedFile(file);
    } catch (error: any) {
      toast.error(error.message);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const uploadAttachment = async () => {
    if (!attachedFile || !chatId || !user) return null;

    try {
      // Generate a unique file name
      const fileExt = attachedFile.name.split('.').pop();
      const uniqueId = Math.random().toString(36).substring(2);
      const fileName = `${chatId}/${user.id}_${Date.now()}_${uniqueId}.${fileExt}`;

      // Upload the file
      const { error: uploadError } = await supabase.storage
        .from('chat_attachments')
        .upload(fileName, attachedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl }, error: urlError } = supabase.storage
        .from('chat_attachments')
        .getPublicUrl(fileName);

      if (urlError) throw urlError;

      return { 
        url: publicUrl, 
        type: attachedFile.type 
      };
    } catch (error: any) {
      toast.error(error.message || "Failed to upload attachment");
      console.error('File upload error:', error);
      return null;
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !attachedFile) return;

    try {
      const attachment = attachedFile ? await uploadAttachment() : null;

      const { error } = await supabase.from('messages').insert({
        chat_id: chatId,
        sender_id: user?.id,
        content: newMessage,
        attachment_url: attachment?.url,
        attachment_type: attachment?.type,
      });

      if (error) throw error;

      setNewMessage("");
      setAttachedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      toast.error("Failed to send message");
      console.error(error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const removeAttachment = () => {
    setAttachedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Show placeholder if no chat is selected
  if (!chatId) {
    return (
      <div className={cn("flex-1 flex flex-col items-center justify-center bg-webchat-bg", className)}>
        <div className="text-center p-6 max-w-md">
          <div className="bg-webchat-primary rounded-full p-4 inline-flex mb-4">
            <MessageCircle size={40} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">WebChat</h2>
          <p className="text-gray-600 mb-6">
            Send and receive messages without keeping your phone online.<br />
            Use WebChat on up to 4 linked devices and 1 phone.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* File attachment preview */}
      {attachedFile && (
        <div className="bg-accent p-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {attachedFile.type.startsWith('image/') ? (
              <img 
                src={URL.createObjectURL(attachedFile)} 
                alt="Attachment preview" 
                className="h-10 w-10 object-cover rounded" 
              />
            ) : (
              <div className="h-10 w-10 bg-gray-200 flex items-center justify-center rounded">
                {attachedFile.name.split('.').pop()?.toUpperCase()}
              </div>
            )}
            <span>{attachedFile.name}</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={removeAttachment}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Chat header */}
      <div className="p-3 bg-gray-100 flex items-center">
        <Avatar className="h-10 w-10 mr-3">
          <AvatarImage src={otherParticipant?.avatar_url || undefined} />
          <AvatarFallback>{otherParticipant?.full_name?.[0] || '?'}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <h3 className="font-medium">{otherParticipant?.full_name || "Unknown"}</h3>
          <p className="text-xs text-gray-500">
            {otherParticipant?.status_message || "Online"}
          </p>
        </div>
      </div>
      
      <Separator />
      
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 bg-webchat-bg">
        <div className="space-y-2">
          {messages.map((message) => (
            <Message 
              key={message.id} 
              content={message.content}
              timestamp={format(new Date(message.created_at), 'p')}
              isOutgoing={message.sender_id === user?.id}
              status={message.status || "sent"}
              attachment_url={message.attachment_url}
              attachment_type={message.attachment_type}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Message input */}
      <div className="p-3 bg-gray-100">
        <div className="flex items-center space-x-2">
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden" 
            onChange={handleFileUpload}
            accept={ALLOWED_FILE_TYPES.join(',')}
          />
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full"
          >
            <ImageIcon className="h-5 w-5" />
          </Button>
          <Input
            placeholder="Type a message"
            className="flex-1"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyPress}
          />
          <Button
            size="icon"
            className="rounded-full bg-webchat-primary hover:bg-webchat-secondary"
            onClick={handleSendMessage}
            disabled={!newMessage.trim() && !attachedFile}
          >
            <Send className="h-5 w-5 text-white" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
