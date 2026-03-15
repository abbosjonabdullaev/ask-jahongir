'use client'

import Link from 'next/link'

export default function SuccessPage() {
  const downloadLinks = [
    'https://example.com/download/headshot1.jpg',
    'https://example.com/download/headshot2.jpg',
    'https://example.com/download/headshot3.jpg',
    'https://example.com/download/headshot4.jpg',
    'https://example.com/download/headshot5.jpg',
    'https://example.com/download/headshot6.jpg',
    'https://example.com/download/headshot7.jpg',
    'https://example.com/download/headshot8.jpg',
    'https://example.com/download/headshot9.jpg',
    'https://example.com/download/headshot10.jpg',
  ]

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="card text-center">
        <div className="mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Payment Successful! 🎉
          </h1>
          <p className="text-gray-600">
            Your professional headshots are ready for download
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Download Your Headshots
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {downloadLinks.map((link, index) => (
              <a
                key={index}
                href={link}
                className="block p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="text-sm font-medium text-gray-700">
                  Headshot {index + 1}
                </div>
                <div className="text-xs text-gray-500">HD Download</div>
              </a>
            ))}
          </div>
          
          <div className="bg-banana-50 border border-banana-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700">
              💡 <strong>Pro Tip:</strong> Right-click each link and select "Save link as..." to download directly to your computer.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/" className="btn-primary">
            Generate More Headshots
          </Link>
          <button 
            onClick={() => window.print()}
            className="btn-secondary"
          >
            Print This Page
          </button>
        </div>
      </div>
    </main>
  )
} 