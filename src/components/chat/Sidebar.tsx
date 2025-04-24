import React, { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, MessageCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import ChatListItem from "./ChatListItem";
import { useChats } from "@/hooks/useChats";

interface SidebarProps {
  onChatSelect: (chatId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onChatSelect }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const isMobile = useIsMobile();
  const { chats, isLoading } = useChats();
  
  const filteredChats = chats?.filter(chat => {
    const otherParticipant = chat.participants.find(p => p.profiles);
    const searchText = otherParticipant?.profiles.full_name.toLowerCase() || "";
    const messageText = chat.last_message?.content?.toLowerCase() || "";
    return searchText.includes(searchQuery.toLowerCase()) || 
           messageText.includes(searchQuery.toLowerCase());
  }) || [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 bg-webchat-primary dark:bg-webchat-dark">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center">
            <Avatar className="h-10 w-10">
              <MessageCircle size={24} />
            </Avatar>
            <h2 className="ml-3 font-semibold text-lg">WispaChat</h2>
          </div>
          <Button variant="ghost" size="icon" className="text-white hover:bg-webchat-primary/20">
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="p-3 bg-white dark:bg-webchat-dark/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search chats"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-webchat-primary/5 dark:bg-webchat-bubble border-none"
          />
        </div>
      </div>

      <Separator />

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-webchat-dark/50">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">Loading chats...</div>
        ) : filteredChats.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {searchQuery ? "No chats found" : "No chats yet"}
          </div>
        ) : (
          filteredChats.map((chat) => {
            const otherParticipant = chat.participants.find(p => p.profiles)?.profiles;
            return (
              <ChatListItem
                key={chat.id}
                chat={{
                  id: chat.id,
                  name: otherParticipant?.full_name || "Unknown",
                  lastMessage: chat.last_message?.content || "No messages yet",
                  timestamp: chat.last_message?.created_at || chat.created_at,
                  unread: chat.unread_count,
                  avatar: otherParticipant?.avatar_url || "",
                  userId: otherParticipant?.id || ""
                }}
                onClick={() => onChatSelect(chat.id)}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

export default Sidebar;
