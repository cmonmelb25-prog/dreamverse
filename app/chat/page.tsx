
import { redirect } from 'next/navigation';

/**
 * Chat Root Redirect.
 * Redirects accidental hits on /chat to the unified AI Inbox.
 */
export default function ChatIndexPage() {
  redirect('/conversations');
}
