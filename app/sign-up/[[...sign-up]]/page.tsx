import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-600">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {/* RW monogram */}
          <div className="inline-flex items-center justify-center w-14 h-14 border border-yellow-500/60 mb-4">
            <span style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }} className="text-yellow-400 text-2xl font-bold tracking-tight select-none">
              RW
            </span>
          </div>
          <h1 className="text-xl font-semibold tracking-[0.2em] uppercase text-white">RiverWest</h1>
          <p className="text-yellow-400/80 text-xs tracking-[0.18em] uppercase mt-0.5">Properties</p>
          <p className="text-navy-300 text-xs tracking-widest uppercase mt-2 pt-2 border-t border-navy-500">Travel Reporting</p>
        </div>
        <SignUp />
      </div>
    </div>
  )
}
