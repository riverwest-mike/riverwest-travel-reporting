import { SignUp } from '@clerk/nextjs'

const clerkAppearance = {
  variables: {
    colorPrimary: '#1e3a5f',
    colorBackground: '#ffffff',
    fontFamily: 'var(--font-inter), system-ui, sans-serif',
    borderRadius: '4px',
    colorInputBorder: '#d4cfc8',
    colorText: '#1a2030',
    colorTextSecondary: '#64748b',
    colorInputText: '#1a2030',
    spacingUnit: '15px',
  },
  elements: {
    card: 'shadow-none bg-transparent p-0',
    headerTitle: 'font-semibold text-[#1a2030] text-xl tracking-tight',
    headerSubtitle: 'text-slate-500 text-sm',
    socialButtonsBlockButton:
      'border border-[#d4cfc8] text-[#1a2030] hover:bg-[#f7f6f3] transition-colors',
    formButtonPrimary:
      'bg-[#1e3a5f] hover:bg-[#172d4a] text-white font-medium tracking-wide transition-colors',
    formFieldInput:
      'border-[#d4cfc8] focus:border-[#1e3a5f] focus:ring-[#1e3a5f] focus:ring-1',
    formFieldLabel: 'text-[#374151] font-medium text-sm',
    footer: 'text-sm',
    footerActionLink: 'text-[#1e3a5f] hover:text-[#172d4a] font-medium',
    dividerLine: 'bg-[#e8e4de]',
    dividerText: 'text-[#94a3b8] text-xs',
    identityPreviewText: 'text-[#374151]',
    identityPreviewEditButton: 'text-[#1e3a5f]',
    alertText: 'text-sm',
  },
}

export default function SignUpPage() {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[1fr_1fr]">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col bg-navy-600 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative z-10 p-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border border-gold-400/60 flex items-center justify-center shrink-0">
              <span className="font-playfair text-gold-400 text-lg font-bold tracking-tight select-none">
                RW
              </span>
            </div>
            <div>
              <p className="text-white text-xs font-semibold tracking-[0.22em] uppercase leading-tight">
                RiverWest
              </p>
              <p className="text-gold-400/75 text-[9px] tracking-[0.2em] uppercase leading-tight mt-0.5">
                Properties
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center px-10 pb-8">
          <div className="mb-2">
            <div className="w-8 h-px bg-gold-400/60 mb-6" />
            <h2 className="font-playfair text-white text-4xl font-bold leading-tight tracking-tight">
              Request
            </h2>
            <h2 className="font-playfair text-gold-400 text-4xl font-bold leading-tight tracking-tight">
              Access
            </h2>
          </div>
          <p className="text-navy-200 text-sm leading-relaxed mt-5 max-w-xs">
            Create your account to start submitting mileage reports. An administrator will activate your account shortly.
          </p>
        </div>

        <div className="relative z-10 px-10 pb-10">
          <div className="w-full h-px bg-navy-500 mb-5" />
          <p className="text-navy-400 text-xs tracking-widest uppercase">
            RiverWest Partners · Columbus, OH
          </p>
        </div>
      </div>

      {/* Right sign-up panel */}
      <div className="flex flex-col min-h-screen lg:min-h-0 bg-[#FAFAF7]">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 px-6 pt-8 pb-6">
          <div className="w-9 h-9 border border-gold-400/60 bg-navy-600 flex items-center justify-center">
            <span className="font-playfair text-gold-400 text-sm font-bold tracking-tight select-none">
              RW
            </span>
          </div>
          <div>
            <p className="text-navy-600 text-xs font-semibold tracking-[0.22em] uppercase leading-tight">
              RiverWest
            </p>
            <p className="text-gold-500/80 text-[9px] tracking-[0.2em] uppercase leading-tight mt-0.5">
              Properties · Travel Reporting
            </p>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-10 lg:py-0">
          <div className="w-full max-w-sm">
            <div className="mb-8">
              <h1 className="font-playfair text-2xl font-bold text-navy-700 tracking-tight">
                Create account
              </h1>
              <p className="text-muted-foreground text-sm mt-1.5">
                Request access to the travel reporting portal
              </p>
            </div>
            <SignUp appearance={clerkAppearance} />
          </div>
        </div>

        <div className="hidden lg:block px-10 pb-8 text-center">
          <p className="text-xs text-muted-foreground/60 tracking-wide">
            © {new Date().getFullYear()} RiverWest Partners
          </p>
        </div>
      </div>
    </div>
  )
}
