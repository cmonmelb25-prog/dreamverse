import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Stripe Webhook Handler: Listens for subscription and coin purchase events.
 */
async function fulfillVip(uid: string, subscriptionId: string | null, active: boolean) {
  if (!db) return;
  await db.collection("users").doc(uid).set({
    vipTier: active ? "vip" : "non-vip",
    isVip: active,
    subscriptionActive: active,
    subscriptionId: subscriptionId,
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
}

async function fulfillCoins(uid: string, amount: number) {
  if (!db) return;
  await db.collection("users").doc(uid).update({
    coins: FieldValue.increment(amount),
    updatedAt: FieldValue.serverTimestamp()
  });
}

export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        const uid = session.metadata?.uid;
        const type = session.metadata?.type;

        if (uid && type === "coin_purchase") {
          const amount = parseInt(session.metadata?.coinAmount || "0");
          await fulfillCoins(uid, amount);
        } else if (uid) {
          const subId = session.subscription as string | undefined;
          await fulfillVip(uid, subId || null, true);
        }
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;
        const snap = await db!.collection("users").where("subscriptionId", "==", subscription.id).limit(1).get();
        if (!snap.empty) await fulfillVip(snap.docs[0].id, null, false);
        break;
      }
    }
    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
