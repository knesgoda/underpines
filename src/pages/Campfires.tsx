import { motion } from 'framer-motion';

const Campfires = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto px-4 py-8"
    >
      <h1 className="font-display text-2xl text-foreground mb-6">🔥 Campfires</h1>
      <div className="text-center py-16">
        <p className="text-4xl mb-3">🔥</p>
        <p className="font-body text-muted-foreground">
          Your campfires will appear here. Start one with someone from your circle.
        </p>
      </div>
    </motion.div>
  );
};

export default Campfires;
