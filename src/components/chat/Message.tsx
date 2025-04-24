import React from "react";
import { Check, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface MessageProps {
  content: string;
  timestamp: string;
  isOutgoing: boolean;
  status?: "sent" | "delivered" | "read";
  attachment_url?: string | null;
  attachment_type?: string | null;
}

const Message: React.FC<MessageProps> = ({
  content,
  timestamp,
  isOutgoing,
  status = "sent",
  attachment_url,
  attachment_type
}) => {
  const isImage = attachment_type?.startsWith('image/');

  return (
    <div className={cn(
      "group flex",
      isOutgoing ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "max-w-[65%] rounded-lg relative",
        isOutgoing ? "chat-bubble-outgoing" : "chat-bubble-incoming",
        "shadow-sm"
      )}>
        {attachment_url && (
          <div className="mb-1">
            {isImage ? (
              <img 
                src={attachment_url} 
                alt="Attachment" 
                className="rounded-lg max-h-[200px] w-full object-cover"
              />
            ) : (
              <Button
                variant="secondary"
                size="sm"
                className="w-full bg-webchat-primary/10 hover:bg-webchat-primary/20 text-webchat-primary"
                onClick={() => window.open(attachment_url, '_blank')}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Attachment
              </Button>
            )}
          </div>
        )}
        {content && (
          <div className="px-2 py-1.5">
            <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
          </div>
        )}
        <div className="flex items-center justify-end gap-1 px-2 pb-1 text-[0.65rem] opacity-70">
          <span>{timestamp}</span>
          {isOutgoing && (
            <div className="flex ml-0.5">
              {status === "read" ? (
                <div className="text-webchat-primary">
                  <Check className="h-3 w-3" />
                  <Check className="h-3 w-3 -ml-1.5" />
                </div>
              ) : status === "delivered" ? (
                <div className="text-gray-500">
                  <Check className="h-3 w-3" />
                  <Check className="h-3 w-3 -ml-1.5" />
                </div>
              ) : (
                <Check className="h-3 w-3 text-gray-500" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Message;
