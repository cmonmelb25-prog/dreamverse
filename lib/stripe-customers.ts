import { getStripe } from "@/lib/stripe";
import { db } from "@/lib/firebase-admin";

export async function getOrCreateStripeCustomer(uid: string, email?: string | null) {
  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe not configured");

  const userRef = db.collection("users").doc(uid);
  const snap = await userRef.get();
  const data = snap.data() || {};

  if (data.stripeCustomerId) {
    return data.stripeCustomerId as string;
  }

  const customer = await stripe.customers.create({
    email: email || undefined,
    metadata: { uid },
  });

  await userRef.set(
    {
      stripeCustomerId: customer.id,
    },
    { merge: true }
  );

  return customer.id;
}
