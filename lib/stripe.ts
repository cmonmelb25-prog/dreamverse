import Stripe from "stripe";

let stripe: Stripe | null = null;

export function getStripe() {
  if (stripe) return stripe;

  const key = process.env.STRIPE_SECRET_KEY;

  if (!key) {
    console.warn("⚠ STRIPE_SECRET_KEY missing — Stripe disabled during build.");
    return null;
  }

  stripe = new Stripe(key, {
    apiVersion: "2023-10-16",
  });

  return stripe;
}
