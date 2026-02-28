import { redirect } from 'next/navigation'
import { getEmployee } from '@/lib/auth'
import { EmployeeStatus } from '@prisma/client'
import { SignOutButton } from '@clerk/nextjs'
import { Clock, LogOut } from 'lucide-react'

export default async function PendingPage() {
  const employee = await getEmployee()

  if (!employee) redirect('/sign-in')
  if (employee.status === EmployeeStatus.ACTIVE) redirect('/reports')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="w-10 h-10 border border-yellow-600/70 bg-[#1E3A5F] flex items-center justify-center">
            <span className="text-yellow-400 text-lg font-bold leading-none">RW</span>
          </div>
          <div>
            <p className="text-[#1E3A5F] text-xs font-semibold tracking-[0.2em] uppercase leading-tight">
              RiverWest
            </p>
            <p className="text-gray-500 text-[9px] tracking-[0.18em] uppercase leading-tight mt-0.5">
              Properties
            </p>
            <p className="text-gray-400 text-[9px] tracking-widest uppercase leading-tight mt-1 border-t border-gray-200 pt-1">
              Travel Reporting
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
              <Clock className="h-8 w-8 text-amber-500" />
            </div>
          </div>

          <div>
            <h1 className="text-xl font-bold text-gray-900">Account Pending Activation</h1>
            <p className="text-gray-500 text-sm mt-2">
              Hi <strong>{employee.name}</strong>, your account has been created but is awaiting
              activation by the Application Owner.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-md p-4 text-sm text-blue-700 text-left">
            <p className="font-medium mb-1">What happens next?</p>
            <ul className="list-disc list-inside space-y-1 text-blue-600">
              <li>The Application Owner has been notified of your sign-up</li>
              <li>They will assign your role and approver(s)</li>
              <li>You will receive an email when your account is activated</li>
            </ul>
          </div>

          <p className="text-xs text-gray-400">
            Signed in as {employee.email}
          </p>

          <SignOutButton redirectUrl="/sign-in">
            <button className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mx-auto transition-colors">
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </SignOutButton>
        </div>
      </div>
    </div>
  )
}
