export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { db, adminAuth } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const { action, uid, tier } = await request.json();

    if (!action) {
      return NextResponse.json({ success: false, error: 'Missing action' }, { status: 400 });
    }

    if (['grant-vip', 'grant-admin', 'ban-user'].includes(action) && !uid) {
      return NextResponse.json({ success: false, error: 'Missing uid' }, { status: 400 });
    }

    if (action === 'grant-vip' && !tier) {
      return NextResponse.json({ success: false, error: 'Missing VIP tier' }, { status: 400 });
    }

    // -------------------------
    // GRANT ADMIN
    // -------------------------
    if (action === 'grant-admin') {
      const { customClaims } = await adminAuth.getUser(uid);

      await adminAuth.setCustomUserClaims(uid, {
        ...(customClaims || {}),
        admin: true,
      });

      await db.collection('users').doc(uid).set({ isAdmin: true }, { merge: true });

      return NextResponse.json({ success: true });
    }

    // -------------------------
    // GRANT VIP
    // -------------------------
    if (action === 'grant-vip') {
      const { customClaims } = await adminAuth.getUser(uid);

      await adminAuth.setCustomUserClaims(uid, {
        ...(customClaims || {}),
        vipTier: tier,
      });

      await db.collection('users').doc(uid).set(
        { vipTier: tier, isVip: tier === 'vip' },
        { merge: true }
      );

      return NextResponse.json({ success: true });
    }

    // -------------------------
    // BAN USER
    // -------------------------
    if (action === 'ban-user') {
      await adminAuth.updateUser(uid, { disabled: true });
      return NextResponse.json({ success: true });
    }

    // -------------------------
    // REVOKE VIPS
    // -------------------------
    if (action === 'revoke-expired-vips') {
      return NextResponse.json({ success: true, message: 'Revoke logic disabled.' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('Admin API action error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
