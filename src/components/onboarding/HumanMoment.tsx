import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface HumanMomentProps {
  inviterName: string | null;
  inviteeCount: number;
  onEnter: () => void;
}

const HumanMoment = ({ inviterName, inviteeCount, onEnter }: HumanMomentProps) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center texture-paper" style={{ background: 'linear-gradient(180deg, #052e16 0%, #14532d 50%, #052e16 100%)' }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="text-center max-w-md px-8"
      >
        <h2 className="text-3xl font-display text-pine-light mb-8">
          One last thing.
        </h2>

        {inviterName ? (
          <div className="space-y-4 text-pine-light/80 font-body">
            <p>
              {inviterName} vouched for you<br />
              to be here. You're part of their<br />
              circle of trust now.
            </p>
            {inviteeCount > 0 && (
              <p>
                They have {inviteeCount} {inviteeCount === 1 ? 'person' : 'people'} they've invited.<br />
                You're one of them.
              </p>
            )}
            <p>
              If you ever invite someone,<br />
              remember how this felt.
            </p>
          </div>
        ) : (
          <div className="space-y-4 text-pine-light/80 font-body">
            <p>
              You've been welcomed into<br />
              something built on trust.
            </p>
            <p>
              If you ever invite someone,<br />
              remember how this felt.
            </p>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
          className="mt-12"
        >
          <Button
            onClick={onEnter}
            className="rounded-pill px-12 h-14 text-lg font-display bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-500 animate-breathing"
          >
            Enter the Pines
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default HumanMoment;
