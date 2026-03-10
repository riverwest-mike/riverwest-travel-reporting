import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 tracking-wide',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-navy-600 text-white',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground',
        outline:
          'border-border text-foreground bg-transparent',
        success:
          'border-transparent bg-emerald-50 text-emerald-700 border-emerald-200/60',
        warning:
          'border-transparent bg-amber-50 text-amber-700 border-amber-200/60',
        info:
          'border-transparent bg-navy-50 text-navy-700 border-navy-200/60',
        gold:
          'border-transparent bg-gold-300/40 text-gold-600 border-gold-300/60',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
