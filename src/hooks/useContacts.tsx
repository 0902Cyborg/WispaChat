import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

type ContactWithProfile = Database['public']['Tables']['contacts']['Row'] & {
  profiles: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    status_message: string | null;
    last_seen: string | null;
  }
};

export const useContacts = () => {
  const queryClient = useQueryClient();
  
  // Get all accepted contacts
  const { data: acceptedContacts, isLoading: isLoadingAccepted } = useQuery({
    queryKey: ["contacts", "accepted"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      try {
        // Fetch both "forward" and "reverse" contacts with status check
        const { data: direct, error: directError } = await supabase
          .from("contacts")
          .select(`
            *,
            profiles:contact_id (
              id, full_name, avatar_url, status_message, last_seen
            )
          `)
          .eq("user_id", user.id)
          .eq("status", "accepted");
        
        if (directError) throw directError;

        const { data: reverse, error: reverseError } = await supabase
          .from("contacts")
          .select(`
            *,
            profiles:user_id (
              id, full_name, avatar_url, status_message, last_seen
            )
          `)
          .eq("contact_id", user.id)
          .eq("status", "accepted");
        
        if (reverseError) throw reverseError;

        const contacts = [...(direct || []), ...(reverse || [])];
        return contacts.filter(c => 
          c.profiles && 
          typeof c.profiles === 'object' && 
          'id' in c.profiles && 
          c.profiles.id !== user.id
        );
      } catch (err: any) {
        console.error("Error fetching contacts:", err);
        toast.error("Failed to load contacts: " + err.message);
        return [];
      }
    },
  });

  // Get pending contact requests (sent by current user)
  const { data: sentRequests, isLoading: isLoadingSent } = useQuery({
    queryKey: ["contacts", "sent"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      try {
        const { data, error } = await supabase
          .from("contacts")
          .select(`
            *,
            profiles:contact_id (
              id, full_name, avatar_url, status_message, last_seen
            )
          `)
          .eq("user_id", user.id)
          .eq("status", "pending");
        
        if (error) {
          console.error("Error fetching sent requests:", error);
          return [];
        }
        
        return (data || []).filter(item => 
          item.profiles && 
          typeof item.profiles === 'object' && 
          'id' in item.profiles
        );
      } catch (err) {
        console.error("Error in sent requests:", err);
        return [];
      }
    },
  });

  // Get received contact requests (to current user)
  const { data: receivedRequests, isLoading: isLoadingReceived } = useQuery({
    queryKey: ["contacts", "received"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      try {
        const { data, error } = await supabase
          .from("contacts")
          .select(`
            *,
            profiles:user_id (
              id, full_name, avatar_url, status_message, last_seen
            )
          `)
          .eq("contact_id", user.id)
          .eq("status", "pending");
        
        if (error) {
          console.error("Error fetching received requests:", error);
          return [];
        }
        
        return (data || []).filter(item => 
          item.profiles && 
          typeof item.profiles === 'object' && 
          'id' in item.profiles
        );
      } catch (err) {
        console.error("Error in received requests:", err);
        return [];
      }
    },
  });

  // Add a new contact
  const addContact = useMutation({
    mutationFn: async (contactId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      if (contactId === user.id) throw new Error("You cannot add yourself as a contact");
      
      // Check for existing contact requests in both directions
      const { data: existingContacts, error: checkError } = await supabase
        .from("contacts")
        .select("*")
        .or(`and(user_id.eq.${user.id},contact_id.eq.${contactId}),and(user_id.eq.${contactId},contact_id.eq.${user.id})`);

      if (checkError) throw checkError;
      
      if (existingContacts && existingContacts.length > 0) {
        const existing = existingContacts[0];
        if (existing.status === "accepted") {
          throw new Error("Already in your contacts");
        } else if (existing.status === "pending") {
          if (existing.user_id === user.id) {
            throw new Error("Contact request already sent");
          } else {
            throw new Error("This user has already sent you a request");
          }
        }
      }

      // Create the contact request
      const { error } = await supabase.from("contacts").insert({
        user_id: user.id,
        contact_id: contactId,
        status: "pending",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact request sent!");
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  // Accept a contact request
  const acceptContactRequest = useMutation({
    mutationFn: async (contactId: string) => {
      const { data: contact, error: fetchError } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", contactId)
        .single();
        
      if (fetchError) throw fetchError;
      if (!contact) throw new Error("Contact request not found");
      
      const { error } = await supabase
        .from("contacts")
        .update({ status: "accepted" })
        .eq("id", contactId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact request accepted!");
    },
    onError: (error: any) => {
      toast.error("Failed to accept contact: " + error.message);
    },
  });

  // Reject a contact request
  const rejectContactRequest = useMutation({
    mutationFn: async (contactId: string) => {
      const { error } = await supabase
        .from("contacts")
        .delete()
        .eq("id", contactId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact request rejected!");
    },
    onError: (error) => {
      toast.error("Failed to reject contact: " + error.message);
    },
  });

  return {
    acceptedContacts,
    sentRequests,
    receivedRequests,
    isLoading: isLoadingAccepted || isLoadingSent || isLoadingReceived,
    addContact,
    acceptContactRequest,
    rejectContactRequest,
  };
};
