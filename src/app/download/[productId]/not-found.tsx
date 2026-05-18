import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-6">
      <div className="text-center">
        <div className="w-20 h-20 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">📦</span>
        </div>
        <h1 className="text-2xl font-bold text-stone-800 mb-2">Download Not Found</h1>
        <p className="text-stone-500 text-sm max-w-sm mx-auto">
          This download link may have expired or the product is no longer available. Please
          contact the seller for a new link.
        </p>
      </div>
    </div>
  )
}
