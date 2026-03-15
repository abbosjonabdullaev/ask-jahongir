'use client'

import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'

interface PreviewProps {
  originalImage: string
  generatedHeadshots: string[]
  onReset: () => void
}

export default function Preview({ originalImage, generatedHeadshots, onReset }: PreviewProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  // Debug logging
  console.log('Preview component received:', { 
    originalImage: originalImage?.substring(0, 100) + '...',
    generatedHeadshots: generatedHeadshots,
    headshotsCount: generatedHeadshots?.length || 0
  })

  const handlePayment = async () => {
    setIsProcessing(true)
    
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          headshots: generatedHeadshots,
        }),
      })

      const { sessionId } = await response.json()
      
      // Redirect to Stripe Checkout
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
      if (stripe) {
        const { error } = await stripe.redirectToCheckout({ sessionId })
        if (error) {
          console.error('Stripe error:', error)
        }
      }
    } catch (error) {
      console.error('Payment error:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Your Headshots Are Ready! 🎉
        </h2>
        <p className="text-gray-600">
          Preview your professional headshots below
        </p>
      </div>

      {/* Original Image */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Original Photo</h3>
        <div className="flex justify-center">
          <img
            src={originalImage}
            alt="Original selfie"
            className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200"
          />
        </div>
      </div>

      {/* Generated Headshots */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          AI-Generated Headshots ({generatedHeadshots.length})
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {generatedHeadshots.map((headshot, index) => (
            <div key={index} className="relative group">
              <img
                src={headshot}
                alt={`Generated headshot ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg border-2 border-gray-200 hover:border-banana-500 transition-colors duration-200"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
                <span className="text-white font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  Headshot {index + 1}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Section */}
      <div className="text-center bg-gradient-to-r from-banana-50 to-yellow-50 rounded-xl p-6 border border-banana-200">
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          Download All Headshots
        </h3>
        <p className="text-gray-600 mb-4">
          Get all {generatedHeadshots.length} high-quality headshots for just $5
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={handlePayment}
            disabled={isProcessing}
            className="btn-primary text-lg px-8 py-4"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              `Pay $5 & Download All`
            )}
          </button>
          
          <button
            onClick={onReset}
            disabled={isProcessing}
            className="btn-secondary"
          >
            Start Over
          </button>
        </div>
        
        <div className="mt-4 text-sm text-gray-500">
          <p>🔒 Secure payment powered by Stripe</p>
          <p>📱 Works on all devices • Instant download after payment</p>
        </div>
      </div>
    </div>
  )
} 