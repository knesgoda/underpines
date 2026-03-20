import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface UseBlockMuteOptions {
  targetUserId: string;
  targetDisplayName?: string;
  onComplete?: () => void;
}

export const useBlockMute = ({ targetUserId, targetDisplayName, onComplete }: UseBlockMuteOptions) => {
  const { user } = useAuth();
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);

  const handleBlock = async () => {
    if (!user) return;
    setBlockDialogOpen(false);

    await supabase.from('blocks').insert({ blocker_id: user.id, blocked_id: targetUserId });
    toast("You've stepped away from this fire.");
    onComplete?.();
  };

  const handleMute = async () => {
    if (!user) return;

    await supabase.from('mutes').insert({ muter_id: user.id, muted_id: targetUserId });
    toast("Fire banked. Their posts won't appear in your feed.");
    onComplete?.();
  };

  const openBlockDialog = () => setBlockDialogOpen(true);

  const BlockConfirmDialog = () => (
    <AlertDialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
      <AlertDialogContent className="rounded-2xl max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-lg">
            Step away from {targetDisplayName || 'this person'}'s fire?
          </AlertDialogTitle>
          <AlertDialogDescription className="font-body text-sm text-muted-foreground">
            Their posts will disappear from your feed, and yours from theirs. They won't be notified.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="font-body text-sm rounded-full">
            Never mind
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleBlock}
            className="font-body text-sm rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Step away
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { openBlockDialog, handleMute, BlockConfirmDialog };
};
