import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-600">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">RiverWest Partners</h1>
          <p className="text-navy-200 mt-1">Travel Expense Reporting</p>
        </div>
        <SignUp />
      </div>
    </div>
  )
}
