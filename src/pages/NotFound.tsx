import { Link } from 'react-router-dom';
import StatePanel from '@/components/StatePanel';

/**
 * 404.
 *
 * "You've wandered off the trail" was the one piece of forest language worth
 * keeping — it is a mood, not a label on a control, so nobody has to decode it
 * to get anywhere. It sits in a panel now like everything else.
 */
const NotFound = () => (
  <div className="page-shell">
    <StatePanel
      title="You wandered out of range."
      action={<Link to="/" className="outline-button">Back to the feed</Link>}
    >
      There is no page at this address.
    </StatePanel>
  </div>
);

export default NotFound;
