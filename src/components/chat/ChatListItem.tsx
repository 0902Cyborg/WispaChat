import React from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Chat {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  avatar: string;
}

interface ChatListItemProps {
  chat: Chat;
  onClick?: () => void;
  isActive?: boolean;
}

const ChatListItem: React.FC<ChatListItemProps> = ({ 
  chat, 
  onClick, 
  isActive = false 
}) => {
  const formattedTime = React.useMemo(() => {
    try {
      return formatDistanceToNow(new Date(chat.timestamp), { addSuffix: true });
    } catch (error) {
      return chat.timestamp;
    }
  }, [chat.timestamp]);

  return (
    <div 
      className={cn(
        "flex items-center p-3 hover:bg-webchat-hover cursor-pointer transition-colors",
        isActive && "bg-webchat-hover"
      )}
      onClick={onClick}
    >
      <Avatar className="h-12 w-12 mr-3">
        <AvatarImage src={chat.avatar} alt={chat.name} />
        <AvatarFallback>
          {chat.name[0]?.toUpperCase() || '?'}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center">
          <h3 className="font-medium truncate">{chat.name}</h3>
          <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
            {formattedTime}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600 truncate">{chat.lastMessage}</p>
          {chat.unread > 0 && (
            <span className="bg-webchat-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center ml-2">
              {chat.unread > 99 ? '99+' : chat.unread}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatListItem;
