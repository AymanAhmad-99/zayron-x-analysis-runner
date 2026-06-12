import { createAdminClient, createClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user via Supabase server client
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required to initiate checkout session.' },
        { status: 401 },
      );
    }

    // 2. Fetch the user's profile to see if they already have a Stripe customer ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found in ZAYRON-X node registry.' },
        { status: 404 },
      );
    }

    // Retrieve price ID from environment variables
    const priceId = process.env.STRIPE_SUBSCRIBER_PRICE_ID;
    if (!priceId) {
      return NextResponse.json(
        { error: 'Stripe Price ID configuration missing on server node.' },
        { status: 500 },
      );
    }

    // Validate Stripe Secret Key
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return NextResponse.json(
        { error: 'Stripe configuration missing on host node.' },
        { status: 500 },
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16' as any,
    });

    let stripeCustomerId = profile.stripe_customer_id;

    // 3. Create Stripe Customer if one does not exist for this operator
    if (!stripeCustomerId) {
      try {
        const customer = await stripe.customers.create({
          email: user.email,
          name: profile.full_name || user.email,
          metadata: {
            supabase_user_id: user.id,
          },
        });
        stripeCustomerId = customer.id;

        // Save Stripe Customer ID to profiles table using admin privilege client
        const adminSupabase = await createAdminClient();
        const { error: updateError } = await adminSupabase
          .from('profiles')
          .update({ stripe_customer_id: stripeCustomerId })
          .eq('id', user.id);

        if (updateError) {
          console.error('Failed to persist Stripe Customer ID:', updateError.message);
        }
      } catch (err: any) {
        return NextResponse.json(
          { error: `Failed to create Stripe customer record: ${err.message}` },
          { status: 500 },
        );
      }
    }

    // 4. Create Stripe Checkout Session
    const successUrl = `${request.nextUrl.origin}/intelligence?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${request.nextUrl.origin}/intelligence`;

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      client_reference_id: user.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return NextResponse.json({ success: true, url: session.url });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to initialize checkout flow.' },
      { status: 500 },
    );
  }
}
