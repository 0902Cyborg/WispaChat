
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface SearchResult {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

export function useFriendSearch() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onFindFriends = async (data: { userCode: string }) => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    if (data.userCode.length !== 6 || isNaN(Number(data.userCode))) {
      setLoading(false);
      setError("Please enter a valid 6-digit user ID.");
      return;
    }
    
    try {
      const { data: foundUser, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("user_code", Number(data.userCode))
        .maybeSingle();
      
      setLoading(false);
      
      if (error) throw error;
      
      if (!foundUser) {
        setError("No user found with that User ID.");
        return;
      }
      
      if (foundUser.id === user?.id) {
        setError("That's your User ID!");
        return;
      }
      
      setResult(foundUser);
    } catch (err: any) {
      setLoading(false);
      setError("Error searching for user: " + err.message);
      console.error("Error in friend search:", err);
    }
  };

  const clearSearchResult = () => {
    setResult(null);
  };

  return { 
    onFindFriends, 
    friendSearchLoading: loading, 
    friendSearchResult: result, 
    friendSearchError: error, 
    setFriendSearchResult: setResult,
    clearSearchResult
  };
}
