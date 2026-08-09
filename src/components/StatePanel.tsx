import type { ReactNode } from 'react';

/**
 * The empty, missing and broken states, in one place.
 *
 * Every ported screen needs all three, and on a network of eighteen people
 * "empty" is the state most arrivals actually see — so it is worth writing
 * once and writing properly rather than leaving each screen to improvise a
 * centred grey sentence.
 *
 * `.state-panel` carries the layout and lives in handoff-shell.css, because a
 * shared component cannot depend on a route-scoped stylesheet.
 */
export const StatePanel = ({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) => (
  <section className="panel state-panel">
    <p className="quiet">{title}</p>
    {children && <p>{children}</p>}
    {action}
  </section>
);

/**
 * What to show when a read fails. Distinct from empty on purpose: "nothing
 * here yet" and "we could not find out" are different facts, and telling
 * someone their group list is empty when the request failed is a lie.
 */
export const ErrorPanel = ({ what }: { what: string }) => (
  <StatePanel title="That did not load.">
    Could not reach {what}. It is probably the connection — try again in a moment.
  </StatePanel>
);

export default StatePanel;
