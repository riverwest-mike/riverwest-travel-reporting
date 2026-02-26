import { Badge } from '@/components/ui/badge'
import { ReportStatus } from '@prisma/client'

export function StatusBadge({ status }: { status: ReportStatus }) {
  switch (status) {
    case ReportStatus.DRAFT:
      return <Badge variant="secondary">Draft</Badge>
    case ReportStatus.SUBMITTED:
      return <Badge variant="warning">Pending Review</Badge>
    case ReportStatus.APPROVED:
      return <Badge variant="success">Approved</Badge>
    case ReportStatus.REJECTED:
      return <Badge variant="destructive">Rejected</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}
