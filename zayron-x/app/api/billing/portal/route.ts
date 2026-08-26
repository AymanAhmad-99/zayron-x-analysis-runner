import { createClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return NextResponse.json(
        { error: 'Stripe configuration missing on host node. Mock portal bypass disabled.' },
        { status: 500 },
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16' as any,
    });

    // 1. Authenticate user via Supabase server client
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required to access billing settings.' },
        { status: 401 },
      );
    }

    // 2. Fetch the user's profile to retrieve the Stripe customer ID
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

    const stripeCustomerId = profile.stripe_customer_id;
    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: 'No billing record found. User has no active subscription.' },
        { status: 400 },
      );
    }

    const returnUrl = `${request.nextUrl.origin}/intelligence`;
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });

    return NextResponse.json({ success: true, url: session.url });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to initialize customer billing portal.' },
      { status: 500 },
    );
  }
}
