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
      "max-w-[70%] rounded-lg p-2 pb-1 relative",
      isOutgoing ? "ml-auto bg-webchat-light" : "mr-auto bg-white"
    )}>
      {attachment_url && (
        <div className="mb-2">
          {isImage ? (
            <img 
              src={attachment_url} 
              alt="Attachment" 
              className="rounded max-h-[200px] object-contain"
            />
          ) : (
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => window.open(attachment_url, '_blank')}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Attachment
            </Button>
          )}
        </div>
      )}
      {content && <p className="text-sm whitespace-pre-wrap break-words">{content}</p>}
      <div className="flex items-center justify-end gap-1 mt-1">
        <span className="text-[10px] text-gray-500">{timestamp}</span>
        
        {isOutgoing && (
          <div className="flex">
            {status === "read" ? (
              <div className="text-webchat-read">
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
  );
};

export default Message;
