import { NextResponse } from 'next/server';
import { sendMessengerMessageAction } from '@/server/actions/user-messenger';

/**
 * Messenger Send API
 * Production hardened.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const {
      chatId,
      senderId,
      recipientId,
      text = '',
      mediaUrl = null,
      type = 'text'
    } = body;

    if (!chatId || !senderId || !recipientId) {
      return NextResponse.json(
        { error: 'Missing required fields.' },
        { status: 400 }
      );
    }

    const result = await sendMessengerMessageAction({
      chatId,
      senderId,
      recipientId,
      text,
      mediaUrl,
      type
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error ?? 'Unable to send message.'
        },
        {
          status: 500
        }
      );
    }

    return NextResponse.json({
      ok: true
    });

  } catch (err) {
    console.error('[Messenger API]', err);

    return NextResponse.json(
      {
        error: 'Internal Server Error'
      },
      {
        status: 500
      }
    );
  }
}