import { getStripe } from "@/lib/stripe";
import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { getOrCreateStripeCustomer } from "@/lib/stripe-customers";

/**
 * API Route: Create a Stripe Checkout Session for VIP subscription.
 */
export async function POST(req: Request) {
  try {
    const { uid } = await req.json();

    if (!uid || !adminAuth) {
      return NextResponse.json({ error: "Unauthorized or missing UID" }, { status: 400 });
    }

    // Initialize Stripe safely
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
    }

    const user = await adminAuth.getUser(uid);

    // VIP is the ONLY paid tier
    const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_VIP;

    if (!priceId) {
      return NextResponse.json({ error: "Stripe Price ID not configured" }, { status: 500 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const customerId = await getOrCreateStripeCustomer(uid, user.email);

    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        payment_method_types: ["card"],
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${appUrl}/settings?session_id={CHECKOUT_SESSION_ID}&success=true`,
        cancel_url: `${appUrl}/settings?success=false`,

        metadata: { uid, tier: "vip" },
      },
      {
        idempotencyKey: `checkout_${uid}_${Date.now()}`,
      }
    );

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("create-checkout-session error", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
