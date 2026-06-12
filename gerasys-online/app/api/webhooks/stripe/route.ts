import { createAdminClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey || !webhookSecret) {
    return NextResponse.json(
      { error: 'Stripe integration credentials not configured on host node.' },
      { status: 500 },
    );
  }

  try {
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16' as any,
    });

    const body = await request.text();
    const signature = request.headers.get('stripe-signature') || '';

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error(`[STRIPE WEBHOOK ERROR] Signature verification failed: ${err.message}`);
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err.message}` },
        { status: 400 },
      );
    }

    const adminSupabase = await createAdminClient();

    // 1. Handle Subscription Creation & Updates
    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated'
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      const stripeCustomerId = subscription.customer as string;
      const stripeSubscriptionId = subscription.id;
      const status = subscription.status; // active, past_due, trialing, canceled, etc.
      const priceId = subscription.items.data[0]?.price.id;

      // Identify corresponding user profile by customer ID or client reference metadata
      const { data: profile, error: fetchError } = await adminSupabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', stripeCustomerId)
        .single();

      if (fetchError || !profile) {
        // Fallback: search by email from customer object
        try {
          const customer = await stripe.customers.retrieve(stripeCustomerId);
          if (!customer.deleted && 'email' in customer && customer.email) {
            const { data: profileByEmail } = await adminSupabase
              .from('profiles')
              .select('id')
              .eq('email', customer.email)
              .single();

            if (profileByEmail) {
              await adminSupabase
                .from('profiles')
                .update({
                  stripe_customer_id: stripeCustomerId,
                  stripe_subscription_id: stripeSubscriptionId,
                  stripe_price_id: priceId,
                  stripe_subscription_status: status,
                  clearance_level:
                    status === 'active' || status === 'trialing' ? 'SUBSCRIBER' : 'FREE',
                })
                .eq('id', profileByEmail.id);
            }
          }
        } catch (custErr) {
          console.error('Failed to retrieve stripe customer info during webhook sync:', custErr);
        }
      } else {
        // Update user's profile with subscription details and clearance mapping
        await adminSupabase
          .from('profiles')
          .update({
            stripe_subscription_id: stripeSubscriptionId,
            stripe_price_id: priceId,
            stripe_subscription_status: status,
            clearance_level: status === 'active' || status === 'trialing' ? 'SUBSCRIBER' : 'FREE',
          })
          .eq('id', profile.id);
      }
    }

    // 2. Handle Subscription Cancellation / Deletion
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const stripeCustomerId = subscription.customer as string;

      const { data: profile } = await adminSupabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', stripeCustomerId)
        .single();

      if (profile) {
        await adminSupabase
          .from('profiles')
          .update({
            stripe_subscription_status: 'canceled',
            clearance_level: 'FREE',
          })
          .eq('id', profile.id);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to process Stripe webhook event.' },
      { status: 500 },
    );
  }
}
