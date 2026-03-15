'use client'

import Link from 'next/link'

export default function CancelPage() {
  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="card text-center">
        <div className="mb-8">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Payment Cancelled
          </h1>
          <p className="text-gray-600">
            No worries! You can try again whenever you're ready
          </p>
        </div>

        <div className="mb-8">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              What happened?
            </h2>
            <ul className="text-left text-gray-600 space-y-2">
              <li>• You closed the payment window</li>
              <li>• Payment was declined by your bank</li>
              <li>• You navigated away from the checkout</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/" className="btn-primary">
            Try Again
          </Link>
          <Link href="/" className="btn-secondary">
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  )
} 