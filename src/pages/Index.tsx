import React from "react";
import { Navigate } from "react-router-dom";
import WispaChat from "@/components/layout/WispaChat";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { ArrowLeft } from "lucide-react";
import { Profile } from "@/components/sidebar/Profile";
import { Settings } from "@/components/sidebar/Settings";
import { ContactList } from "@/components/sidebar/ContactList";
import { ChatList } from "@/components/chat/ChatList";
import ChatWindow from "@/components/chat/ChatWindow";

const Index = () => {
  const { user, loading } = useAuth();
  const [selectedChatId, setSelectedChatId] = useState<string | undefined>();
  const isMobile = useIsMobile();
  const [showSidebar, setShowSidebar] = useState(!isMobile);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const handleChatSelect = (chatId: string) => {
    setSelectedChatId(chatId);
    if (isMobile) {
      setShowSidebar(false);
    }
  };

  return (
    <WispaChat>
      <div className="flex w-full h-full">
        {(showSidebar || !isMobile) && (
          <div className={`${isMobile ? "fixed inset-0 z-50 bg-background" : "w-[380px]"} border-r bg-background flex flex-col`}>
            <div className="p-3 bg-webchat-primary dark:bg-webchat-dark">
              <Profile />
            </div>
            <div className="flex-1 overflow-y-auto space-y-4">
              <ChatList onChatSelect={handleChatSelect} />
              <ContactList />
            </div>
            <div className="p-3 border-t bg-white dark:bg-webchat-dark/50">
              <Settings />
            </div>
          </div>
        )}
        {(!showSidebar || !isMobile) && (
          <div className={`${isMobile ? "fixed inset-0 z-50 bg-background" : "flex-1"}`}>
            <ChatWindow
              chatId={selectedChatId}
              className="h-full"
            />
          </div>
        )}
        {isMobile && selectedChatId && !showSidebar && (
          <button
            className="fixed top-4 left-4 z-[60] p-2 rounded-full bg-webchat-primary text-white shadow-md hover:bg-webchat-dark transition-colors"
            onClick={() => setShowSidebar(true)}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
      </div>
    </WispaChat>
  );
};

export default Index;
