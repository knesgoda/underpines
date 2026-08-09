import { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { REASON_CODES } from '@/lib/rangerApi';

interface RangerActionDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  /** Some actions (mark safe, unfreeze) have an implied reason code. */
  askReason?: boolean;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: (reasonCode: string, notes: string) => void;
}

/**
 * Every enforcement action requires a structured reason code and supports
 * optional notes (spec §52). The dialog collects them; the RPC records them
 * in moderation_actions and the audit log.
 */
const RangerActionDialog = ({
  open,
  title,
  description,
  confirmLabel,
  askReason = true,
  destructive = false,
  onCancel,
  onConfirm,
}: RangerActionDialogProps) => {
  const [reasonCode, setReasonCode] = useState<string>(REASON_CODES[0]);
  const [notes, setNotes] = useState('');

  const handleConfirm = () => {
    onConfirm(reasonCode, notes.trim());
    setNotes('');
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display">{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          {askReason && (
            <label className="block text-sm">
              <span className="text-muted-foreground">Reason code</span>
              <select
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {REASON_CODES.map((code) => (
                  <option key={code} value={code}>
                    {code.replace(/_/g, ' ').toLowerCase()}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-sm">
            <span className="text-muted-foreground">Notes (optional)</span>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1 text-sm"
            />
          </label>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={destructive ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : undefined}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default RangerActionDialog;
