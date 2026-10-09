import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { db } from "@/lib/firebase-admin";

/**
 * API Route: Create a Stripe Billing Portal session for self-service management.
 */
export async function POST(req: Request) {
  try {
    const { uid } = await req.json();
    if (!uid || !db) {
      return NextResponse.json({ error: "Unauthorized or missing UID" }, { status: 400 });
    }

    // Initialize Stripe safely
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
    }

    const userRef = db.collection("users").doc(uid);
    const snap = await userRef.get();
    const data = snap.data();

    if (!data?.stripeCustomerId) {
      return NextResponse.json({ error: "No Stripe customer associated with this account." }, { status: 400 });
    }

    const returnUrl =
      process.env.STRIPE_CUSTOMER_PORTAL_RETURN_URL ||
      `${process.env.NEXT_PUBLIC_APP_URL}/settings`;

    const session = await stripe.billingPortal.sessions.create({
      customer: data.stripeCustomerId,
      return_url: returnUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("create-portal-session error", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
