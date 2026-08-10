/**
 * Cabin fixtures — the interactive objects every cabin has (spec §75).
 *
 * Fixtures are code, decor is data: the guestbook, journal, mailbox, radio,
 * pantry and pet bed are always present and declare what each role can do
 * with them. The accessible drawer ("Things in this Cabin") is generated
 * from this list, so every interaction is reachable without hunting pixels.
 */

export type FixtureAction =
  | 'open_journal'        // owner → their page/posts
  | 'read_journal'        // visitor → the owner's page
  | 'open_guestbook'
  | 'sign_guestbook'
  | 'open_mailbox'        // owner → notes + trades
  | 'leave_note'
  | 'open_radio'          // owner → listening settings
  | 'listen_radio'        // visitor → what's playing
  | 'open_kitchen'        // owner → pantry + cookbook + cooking
  | 'view_shared_recipes'
  | 'open_pets'           // owner → pet management
  | 'visit_pets'
  | 'open_porch'          // owner → gifts waiting on the porch
  | 'leave_gift'
  | 'open_history'        // owner → the cabin's memory
  | 'read_bio'
  | 'propose_trade'
  | 'fix_up_cabin';

export interface CabinFixture {
  key: string;
  label: string;
  emoji: string;
  /** Interior anchor, % of the room box. */
  x: number;
  y: number;
  ownerAction: FixtureAction | null;
  visitorAction: FixtureAction | null;
  ownerHint: string;
  visitorHint: string;
}

export const CABIN_FIXTURES: CabinFixture[] = [
  {
    key: 'bio_card', label: 'A handwritten card', emoji: '📇', x: 41, y: 62,
    ownerAction: 'read_bio', visitorAction: 'read_bio',
    ownerHint: 'The card on the desk', visitorHint: 'Who lives here',
  },
  {
    key: 'journal', label: 'Journal', emoji: '📓', x: 35, y: 61,
    ownerAction: 'open_journal', visitorAction: 'read_journal',
    ownerHint: 'Your page and posts', visitorHint: 'Read their page',
  },
  {
    key: 'guestbook', label: 'Guestbook', emoji: '📖', x: 60, y: 74,
    ownerAction: 'open_guestbook', visitorAction: 'sign_guestbook',
    ownerHint: 'Who has stopped by', visitorHint: 'Sign the guestbook',
  },
  {
    key: 'mailbox', label: 'Mailbox', emoji: '📬', x: 8, y: 68,
    ownerAction: 'open_mailbox', visitorAction: 'leave_note',
    ownerHint: 'Notes and trades', visitorHint: 'Leave a note',
  },
  {
    key: 'radio', label: 'Radio', emoji: '📻', x: 68, y: 60,
    ownerAction: 'open_radio', visitorAction: 'listen_radio',
    ownerHint: 'What you’re listening to', visitorHint: 'What’s playing',
  },
  {
    key: 'kitchen', label: 'Pantry & cookbook', emoji: '🍳', x: 92, y: 64,
    ownerAction: 'open_kitchen', visitorAction: 'view_shared_recipes',
    ownerHint: 'Cook something over the fire', visitorHint: 'Recipes they’ve shared',
  },
  {
    key: 'pet_bed', label: 'Pet bed', emoji: '🧺', x: 88, y: 88,
    ownerAction: 'open_pets', visitorAction: 'visit_pets',
    ownerHint: 'Who lives at the cabin', visitorHint: 'Say hello',
  },
  {
    key: 'porch_basket', label: 'Porch basket', emoji: '🧺', x: 4, y: 88,
    ownerAction: 'open_porch', visitorAction: 'leave_gift',
    ownerHint: 'Things left on the porch', visitorHint: 'Leave something on the porch',
  },
  {
    key: 'ledger', label: 'Cabin ledger', emoji: '🪵', x: 4, y: 40,
    ownerAction: 'open_history', visitorAction: null,
    ownerHint: 'What this cabin remembers', visitorHint: '',
  },
  {
    key: 'trade_table', label: 'Trading table', emoji: '🤝', x: 96, y: 40,
    ownerAction: null, visitorAction: 'propose_trade',
    ownerHint: '', visitorHint: 'Offer a trade',
  },
];

export const fixtureFor = (key: string): CabinFixture | undefined =>
  CABIN_FIXTURES.find(f => f.key === key);
