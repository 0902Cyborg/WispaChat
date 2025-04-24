import React, { useState, useRef, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { AutoResizeInput } from "@/components/ui/auto-resize-input";
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
import { OnlineStatus } from "@/components/ui/online-status";
import { useMessages } from '@/hooks/useMessages';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'image/webp'];
const MAX_MESSAGE_LENGTH = 2000; // Maximum characters per message

interface ChatWindowProps {
  chatId?: string;
  className?: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ chatId, className }) => {
  const [newMessage, setNewMessage] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const { user } = useAuth();
  const { chats } = useChats();
  const { messages, isLoading: messagesLoading, sendMessage } = useMessages(chatId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentChat = chats?.find(c => c.id === chatId);
  const otherParticipant = currentChat?.participants.find(p => p.user_id !== user?.id)?.profiles;

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
    const trimmedMessage = newMessage.trim();
    
    if (!trimmedMessage && !attachedFile) return;
    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      toast.error(`Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`);
      return;
    }

    try {
      const attachment = attachedFile ? await uploadAttachment() : null;

      await sendMessage.mutateAsync({
        content: trimmedMessage || undefined,
        attachment_url: attachment?.url,
        attachment_type: attachment?.type,
      });

      setNewMessage("");
      setAttachedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      // Error handling is done in the hook
      console.error(error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    } else if (e.key === "Enter" && e.shiftKey) {
      // Allow multiline input with Shift+Enter
      if (newMessage.length + 1 > MAX_MESSAGE_LENGTH) {
        e.preventDefault();
        toast.error(`Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`);
      }
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
        <div className="bg-webchat-primary/10 p-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {attachedFile.type.startsWith('image/') ? (
              <img 
                src={URL.createObjectURL(attachedFile)} 
                alt="Attachment preview" 
                className="h-10 w-10 object-cover rounded" 
              />
            ) : (
              <div className="h-10 w-10 bg-webchat-primary/20 flex items-center justify-center rounded">
                {attachedFile.name.split('.').pop()?.toUpperCase()}
              </div>
            )}
            <span className="text-sm">{attachedFile.name}</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={removeAttachment}
            className="hover:bg-webchat-primary/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Chat header */}
      <div className="p-3 bg-webchat-primary dark:bg-webchat-dark flex items-center gap-3 text-white">
        <Avatar className="h-10 w-10">
          <AvatarImage src={otherParticipant?.avatar_url || undefined} />
          <AvatarFallback>{otherParticipant?.full_name?.[0] || '?'}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">{otherParticipant?.full_name || "Unknown"}</h3>
          <OnlineStatus userId={otherParticipant?.id || ''} />
        </div>
      </div>
      
      <Separator />
      
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 chat-background">
        {messagesLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Loading messages...</p>
          </div>
        ) : messages?.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div className="text-gray-500">
              <p className="mb-2">No messages yet</p>
              <p className="text-sm">Start the conversation by sending a message!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {messages?.map((message) => (
              <Message 
                key={message.id} 
                content={message.content || ""}
                timestamp={format(new Date(message.created_at), 'p')}
                isOutgoing={message.sender_id === user?.id}
                status={message.status}
                attachment_url={message.attachment_url}
                attachment_type={message.attachment_type}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {/* Message input */}
      <div className="p-2 bg-webchat-primary/5 dark:bg-webchat-dark border-t">
        <div className="flex items-center gap-2 bg-white dark:bg-webchat-bubble rounded-full p-1 pl-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full hover:bg-webchat-primary/10"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-5 w-5 text-webchat-primary" />
          </Button>
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden" 
            onChange={handleFileUpload}
            accept={ALLOWED_FILE_TYPES.join(',')}
          />
          <AutoResizeInput
            placeholder="Type a message"
            className="flex-1 bg-transparent border-0 focus:ring-0 dark:text-white"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            maxLength={MAX_MESSAGE_LENGTH}
            title={`Maximum ${MAX_MESSAGE_LENGTH} characters`}
            onSubmit={handleSendMessage}
          />
          <Button
            size="icon"
            className="rounded-full bg-webchat-primary hover:bg-webchat-dark"
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
