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
    <div className="min-h-screen bg-[#FAFAF7] flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="flex items-center gap-3 justify-center mb-10">
          <div className="w-10 h-10 border border-gold-400/60 bg-navy-600 flex items-center justify-center">
            <span className="font-playfair text-gold-400 text-lg font-bold leading-none tracking-tight">RW</span>
          </div>
          <div>
            <p className="text-navy-600 text-xs font-semibold tracking-[0.22em] uppercase leading-tight">
              RiverWest
            </p>
            <p className="text-gold-500/80 text-[9px] tracking-[0.2em] uppercase leading-tight mt-0.5">
              Properties
            </p>
            <p className="text-muted-foreground text-[9px] tracking-widest uppercase leading-tight mt-1 border-t border-border pt-1">
              Travel Reporting
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white border border-border rounded-md shadow-sm p-8 text-center space-y-5">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200/70 flex items-center justify-center">
              <Clock className="h-7 w-7 text-amber-500" />
            </div>
          </div>

          <div>
            <h1 className="font-playfair text-xl font-bold text-foreground tracking-tight">
              Account Pending Activation
            </h1>
            <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
              Hi <strong className="text-foreground font-medium">{employee.name}</strong>, your account
              has been created and is awaiting activation by the Application Owner.
            </p>
          </div>

          <div className="bg-navy-50 border border-navy-100 rounded-sm p-4 text-sm text-navy-700 text-left">
            <p className="font-medium text-navy-600 mb-1.5 text-xs uppercase tracking-wider">What happens next</p>
            <ul className="space-y-1.5 text-navy-600/80 text-sm">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 w-1 h-1 rounded-full bg-gold-400 shrink-0" />
                The Application Owner has been notified of your sign-up
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 w-1 h-1 rounded-full bg-gold-400 shrink-0" />
                They will assign your role and approver(s)
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 w-1 h-1 rounded-full bg-gold-400 shrink-0" />
                You will receive an email when your account is activated
              </li>
            </ul>
          </div>

          <p className="text-xs text-muted-foreground/70">
            Signed in as {employee.email}
          </p>

          <SignOutButton redirectUrl="/sign-in">
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mx-auto transition-colors">
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </SignOutButton>
        </div>

        <p className="text-center text-xs text-muted-foreground/50 mt-8 tracking-wide">
          © {new Date().getFullYear()} RiverWest Partners
        </p>
      </div>
    </div>
  )
}
