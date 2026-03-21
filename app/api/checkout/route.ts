import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim()

  if (!secretKey) {
    return null
  }

  return new Stripe(secretKey, {
    apiVersion: '2023-10-16',
  })
}

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripeClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()

    if (!stripe || !appUrl) {
      return NextResponse.json(
        { error: 'Checkout is not configured in this environment.' },
        { status: 503 }
      )
    }

    const { headshots } = await request.json()
    
    if (!headshots || !Array.isArray(headshots)) {
      return NextResponse.json(
        { error: 'Invalid headshots data' },
        { status: 400 }
      )
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Professional AI Headshots',
              description: `${headshots.length} AI-generated professional headshots`,
              images: headshots.slice(0, 4), // Show first 4 images in Stripe
            },
            unit_amount: 500, // $5.00 in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/cancel`,
      metadata: {
        headshots_count: headshots.length.toString(),
        headshots_urls: JSON.stringify(headshots),
      },
    })

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    })

  } catch (error) {
    console.error('Error in checkout API:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
} 
