import React, { useEffect } from "react";
import { useProfile } from "@/hooks/useProfile";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export const Profile = () => {
  const { profile, isLoading } = useProfile();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!profile?.id) return;

    // Set up presence tracking
    const channel = supabase.channel('online-users')
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        console.log('Presence state: ', newState);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: profile.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    // Update last_seen on mount and before unload
    const updateLastSeen = async () => {
      const { error } = await supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', profile.id);

      if (error) console.error('Error updating last_seen:', error);
    };

    updateLastSeen();
    window.addEventListener('beforeunload', updateLastSeen);

    return () => {
      window.removeEventListener('beforeunload', updateLastSeen);
      channel.unsubscribe();
    };
  }, [profile?.id]);

  if (isLoading) return <div>Loading profile...</div>;
  return (
    <Card className="p-4 flex items-center gap-4">
      <Link to={`/profile/${user?.id}`}>
        <Avatar className="h-16 w-16 cursor-pointer">
          <AvatarImage src={profile?.avatar_url} />
          <AvatarFallback>
            {profile?.full_name?.[0] || "?"}
          </AvatarFallback>
        </Avatar>
      </Link>
      <div>
        <Link to={`/profile/${user?.id}`} className="hover:underline font-semibold block">
          {profile?.full_name}
        </Link>
        <Button asChild variant="outline" size="sm" className="mt-2">
          <Link to={`/profile/${user?.id}`}>View Profile</Link>
        </Button>
      </div>
    </Card>
  );
};
