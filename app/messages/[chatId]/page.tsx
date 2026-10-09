import MessageArea from "../MessageArea";
import ProfilePanel from "../ProfilePanel";

export const dynamic = "force-dynamic";

/**
 * MESSENGER CHAT PAGE
 * LAYOUT: Unified Messenger View with fixed Profil Panel.
 */
export default async function ConversationPage({ params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = await params;

  if (!chatId) {
    return (
      <div className="flex-1 flex items-center justify-center text-white/60">
        <p>Invalid conversation.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 h-full w-full bg-background overflow-hidden">
      {/* Messages Column */}
      <MessageArea chatId={chatId} />

      {/* FIXED RIGHT SIDEBAR (Desktop only) */}
      <div className="hidden xl:block w-[320px] h-full flex-none border-l border-white/5 bg-background overflow-y-auto">
        <ProfilePanel chatId={chatId} />
      </div>
    </div>
  );
}
