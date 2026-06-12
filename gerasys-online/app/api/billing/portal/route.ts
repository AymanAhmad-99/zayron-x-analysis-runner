import { createClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_secret_key', {
  apiVersion: '2023-10-16' as any,
});

export async function POST(request: NextRequest) {
  try {
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

    // 3. Create Stripe Customer Portal Session
    const returnUrl = `${request.nextUrl.origin}/intelligence`;

    if (process.env.STRIPE_SECRET_KEY) {
      const session = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: returnUrl,
      });

      return NextResponse.json({ success: true, url: session.url });
    } else {
      // Mock portal redirect in local development mode
      const mockPortalUrl = `${request.nextUrl.origin}/api/webhooks/stripe?mock_action=portal_cancel&userId=${user.id}`;
      return NextResponse.json({
        success: true,
        url: mockPortalUrl,
        message: 'Development mode: Mock Stripe Billing Portal URL generated.',
      });
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to initialize customer billing portal.' },
      { status: 500 },
    );
  }
}
