import React from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { OnlineStatus } from "@/components/ui/online-status";

interface Chat {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  avatar: string;
  userId: string;
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
        "flex items-center px-4 py-3 cursor-pointer transition-colors",
        "hover:bg-webchat-primary/5 dark:hover:bg-webchat-primary/10",
        isActive && "bg-webchat-primary/10 dark:bg-webchat-primary/20"
      )}
      onClick={onClick}
    >
      <div className="relative">
        <Avatar className="h-12 w-12">
          <AvatarImage src={chat.avatar} alt={chat.name} />
          <AvatarFallback className="bg-webchat-primary/20 text-webchat-primary">
            {chat.name[0]?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <div className="absolute -bottom-0.5 -right-0.5">
          <OnlineStatus userId={chat.userId} showText={false} />
        </div>
      </div>
      
      <div className="flex-1 min-w-0 ml-3">
        <div className="flex justify-between items-center">
          <h3 className="font-medium truncate text-base">{chat.name}</h3>
          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ml-2">
            {formattedTime}
          </span>
        </div>
        
        <div className="flex justify-between items-center mt-0.5">
          <p className="text-sm text-gray-600 dark:text-gray-300 truncate">{chat.lastMessage}</p>
          {chat.unread > 0 && (
            <span className="bg-webchat-primary text-white text-xs rounded-full h-5 min-w-[1.25rem] px-1 flex items-center justify-center ml-2">
              {chat.unread > 99 ? '99+' : chat.unread}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatListItem;
