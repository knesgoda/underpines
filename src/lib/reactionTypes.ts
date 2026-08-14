/**
 * The reaction vocabulary the client offers. Every type here must be in the
 * reactions_reaction_type_check constraint — the drift test reads the
 * migration and fails otherwise (three of these were once silently dropped
 * by a stale constraint).
 */
export const REACTIONS = [
  { type: 'warmth', icon: '❤️' },
  { type: 'laughed', icon: '😂' },
  { type: 'heavy', icon: '😢' },
  { type: 'noted', icon: '🤔' },
  { type: 'relatable', icon: '🫠' },
  { type: 'eyeroll', icon: '🙄' },
  { type: 'grounded', icon: '🌲' },
  { type: 'delight', icon: '✨' },
  { type: 'moonstruck', icon: '🌕' },
];
