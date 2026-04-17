import express from 'express'
import Stripe from 'stripe'
import { protect } from '../middleware/auth.js'
import User from '../models/User.js'

const router = express.Router()

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder')

// Apply authentication to all routes
router.use(protect)

// Create payment intent
router.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency = 'usd', items } = req.body
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' })
    }

    // Create a payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        userId: req.user.id,
        items: JSON.stringify(items || [])
      }
    })

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    })
  } catch (error) {
    console.error('[Payments] Create payment intent error:', error)
    res.status(500).json({ error: 'Failed to create payment intent' })
  }
})

// Confirm payment and update user
router.post('/confirm-payment', async (req, res) => {
  try {
    const { paymentIntentId } = req.body
    
    if (!paymentIntentId) {
      return res.status(400).json({ error: 'Payment intent ID is required' })
    }

    // Retrieve the payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'Payment not successful' })
    }

    // Get user and update their purchases
    const user = await User.findById(req.user.id)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Parse items from metadata
    const items = JSON.parse(paymentIntent.metadata.items || '[]')
    
    // Update user's purchases and benefits
    if (!user.purchases) user.purchases = []
    
    const purchase = {
      id: paymentIntentId,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      items,
      purchasedAt: new Date(),
      status: 'completed'
    }
    
    user.purchases.push(purchase)
    
    // Apply benefits based on items purchased
    items.forEach(item => {
      switch (item.type) {
        case 'premium':
          user.settings.premium = true
          user.settings.premiumExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
          break
        case 'xp_boost':
          user.xp += item.xpAmount || 0
          break
        case 'achievement_unlock':
          // Unlock specific achievement
          if (!user.achievements) user.achievements = []
          if (!user.achievements.find(a => a.id === item.achievementId)) {
            user.achievements.push({
              id: item.achievementId,
              earnedAt: new Date()
            })
          }
          break
        case 'course_access':
          // Grant access to premium course
          if (!user.accessibleContent) user.accessibleContent = []
          user.accessibleContent.push(item.courseId)
          break
      }
    })
    
    await user.save()

    res.json({
      success: true,
      purchase,
      updatedUser: {
        xp: user.xp,
        premium: user.settings.premium,
        achievements: user.achievements?.length || 0
      }
    })
  } catch (error) {
    console.error('[Payments] Confirm payment error:', error)
    res.status(500).json({ error: 'Failed to confirm payment' })
  }
})

// Get user's purchase history
router.get('/purchase-history', async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({
      purchases: user.purchases || [],
      totalSpent: (user.purchases || []).reduce((sum, p) => sum + p.amount, 0)
    })
  } catch (error) {
    console.error('[Payments] Purchase history error:', error)
    res.status(500).json({ error: 'Failed to fetch purchase history' })
  }
})

// Get store products
router.get('/products', async (req, res) => {
  try {
    // In a real implementation, these would come from a database
    const products = [
      {
        id: 'premium_monthly',
        name: 'Premium Monthly',
        description: 'Unlock all premium features for 30 days',
        price: 9.99,
        currency: 'usd',
        type: 'subscription',
        features: [
          'Unlimited AI conversations',
          'Advanced analytics',
          'Exclusive content',
          'Priority support'
        ],
        icon: 'crown',
        color: '#fbbf24'
      },
      {
        id: 'xp_boost_500',
        name: 'XP Boost - 500 XP',
        description: 'Get 500 bonus XP instantly',
        price: 4.99,
        currency: 'usd',
        type: 'one_time',
        features: [
          '500 bonus XP',
          'Instant level up',
          'Achievement progress'
        ],
        icon: 'zap',
        color: '#10b981'
      },
      {
        id: 'xp_boost_1000',
        name: 'XP Boost - 1000 XP',
        description: 'Get 1000 bonus XP instantly',
        price: 8.99,
        currency: 'usd',
        type: 'one_time',
        features: [
          '1000 bonus XP',
          'Multiple level ups',
          'Achievement progress'
        ],
        icon: 'zap',
        color: '#10b981'
      },
      {
        id: 'achievement_pack',
        name: 'Achievement Pack',
        description: 'Unlock 5 exclusive achievements',
        price: 6.99,
        currency: 'usd',
        type: 'one_time',
        features: [
          '5 exclusive achievements',
          'Special badges',
          'XP bonuses'
        ],
        icon: 'trophy',
        color: '#8b5cf6'
      },
      {
        id: 'course_bundle',
        name: 'Advanced Course Bundle',
        description: 'Access to all advanced courses',
        price: 19.99,
        currency: 'usd',
        type: 'one_time',
        features: [
          'All advanced courses',
          'Expert instructors',
          'Certificate of completion',
          'Lifetime access'
        ],
        icon: 'book',
        color: '#06b6d4'
      }
    ]

    res.json({ products })
  } catch (error) {
    console.error('[Payments] Products error:', error)
    res.status(500).json({ error: 'Failed to fetch products' })
  }
})

// Create checkout session (for redirect-based checkout)
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { productId, successUrl, cancelUrl } = req.body
    
    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' })
    }

    // Get product details
    const products = await getProducts()
    const product = products.find(p => p.id === productId)
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' })
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: product.currency,
            product_data: {
              name: product.name,
              description: product.description,
              images: [], // Add product images if available
            },
            unit_amount: Math.round(product.price * 100),
          },
          quantity: 1,
        },
      ],
      mode: product.type === 'subscription' ? 'subscription' : 'payment',
      success_url: successUrl || `${process.env.FRONTEND_URL}/store/success`,
      cancel_url: cancelUrl || `${process.env.FRONTEND_URL}/store`,
      metadata: {
        userId: req.user.id,
        productId: productId
      }
    })

    res.json({ url: session.url })
  } catch (error) {
    console.error('[Payments] Create checkout session error:', error)
    res.status(500).json({ error: 'Failed to create checkout session' })
  }
})

// Webhook handler for Stripe events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature']
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
  } catch (err) {
    console.log(`Webhook signature verification failed.`, err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object
      console.log('PaymentIntent was successful!')
      // Handle successful payment
      await handleSuccessfulPayment(paymentIntent)
      break
    case 'checkout.session.completed':
      const session = event.data.object
      console.log('Checkout session was completed!')
      // Handle completed checkout
      await handleCompletedCheckout(session)
      break
    default:
      console.log(`Unhandled event type ${event.type}`)
  }

  // Return a 200 response to acknowledge receipt of the event
  res.send()
})

// Helper functions
async function getProducts() {
  // In a real implementation, these would come from a database
  return [
    {
      id: 'premium_monthly',
      name: 'Premium Monthly',
      description: 'Unlock all premium features for 30 days',
      price: 9.99,
      currency: 'usd',
      type: 'subscription'
    },
    {
      id: 'xp_boost_500',
      name: 'XP Boost - 500 XP',
      description: 'Get 500 bonus XP instantly',
      price: 4.99,
      currency: 'usd',
      type: 'one_time'
    }
  ]
}

async function handleSuccessfulPayment(paymentIntent) {
  try {
    const userId = paymentIntent.metadata.userId
    if (!userId) return

    const user = await User.findById(userId)
    if (!user) return

    // Update user based on payment
    console.log(`Updating user ${userId} for successful payment`)
    
    // Implementation would depend on what was purchased
    await user.save()
  } catch (error) {
    console.error('Error handling successful payment:', error)
  }
}

async function handleCompletedCheckout(session) {
  try {
    const userId = session.metadata.userId
    const productId = session.metadata.productId
    
    if (!userId || !productId) return

    const user = await User.findById(userId)
    if (!user) return

    // Update user based on completed checkout
    console.log(`Updating user ${userId} for completed checkout of product ${productId}`)
    
    // Implementation would depend on what was purchased
    await user.save()
  } catch (error) {
    console.error('Error handling completed checkout:', error)
  }
}

export default router
