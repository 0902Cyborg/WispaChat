import React, { useEffect, useState } from 'react';
import { cn } from "@/lib/utils";
import { usePresence } from '@/hooks/usePresence';
import { formatDistanceToNow } from 'date-fns';

interface OnlineStatusProps {
  userId: string;
  showText?: boolean;
  className?: string;
}

export const OnlineStatus: React.FC<OnlineStatusProps> = ({
  userId,
  showText = true,
  className
}) => {
  const { isOnline, getLastSeen } = usePresence();
  const [lastSeen, setLastSeen] = useState<string | null>(null);

  useEffect(() => {
    if (!isOnline(userId)) {
      getLastSeen(userId).then(timestamp => {
        if (timestamp) {
          setLastSeen(formatDistanceToNow(new Date(timestamp), { addSuffix: true }));
        }
      });
    }
  }, [userId, isOnline, getLastSeen]);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span 
        className={cn(
          "h-2 w-2 rounded-full",
          isOnline(userId) ? "bg-green-500" : "bg-gray-400"
        )} 
      />
      {showText && (
        <span className="text-xs text-muted-foreground">
          {isOnline(userId) ? "Online" : lastSeen ? `Last seen ${lastSeen}` : "Offline"}
        </span>
      )}
    </div>
  );
};