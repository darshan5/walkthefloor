import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  status: string;
  className?: string;
};

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "bg-gray-100 text-gray-700 border-gray-200" },
  IN_PROGRESS: { label: "In Progress", className: "bg-blue-50 text-blue-700 border-blue-200" },
  COMPLETED: { label: "Completed", className: "bg-green-50 text-green-700 border-green-200" },
  COMPLETED_LATE: { label: "Late", className: "bg-amber-50 text-amber-700 border-amber-200" },
  MISSED: { label: "Missed", className: "bg-red-50 text-red-700 border-red-200" },

  OPEN: { label: "Open", className: "bg-blue-50 text-blue-700 border-blue-200" },
  RESOLVED: { label: "Resolved", className: "bg-green-50 text-green-700 border-green-200" },
  OVERDUE: { label: "Overdue", className: "bg-red-50 text-red-700 border-red-200" },

  submitted: { label: "Submitted", className: "bg-gray-100 text-gray-700 border-gray-200" },
  approved: { label: "Approved", className: "bg-green-50 text-green-700 border-green-200" },
  rejected: { label: "Rejected", className: "bg-red-50 text-red-700 border-red-200" },
  in_progress: { label: "In Progress", className: "bg-blue-50 text-blue-700 border-blue-200" },
  pending_verification: { label: "Pending Verification", className: "bg-amber-50 text-amber-700 border-amber-200" },
  completed: { label: "Completed", className: "bg-green-50 text-green-700 border-green-200" },
  canceled: { label: "Canceled", className: "bg-gray-100 text-gray-500 border-gray-200" },

  new: { label: "New", className: "bg-purple-50 text-purple-700 border-purple-200" },
  assigned: { label: "Assigned", className: "bg-blue-50 text-blue-700 border-blue-200" },
  resolved: { label: "Resolved", className: "bg-green-50 text-green-700 border-green-200" },
  closed: { label: "Closed", className: "bg-gray-100 text-gray-500 border-gray-200" },

  unexcused: { label: "Unexcused", className: "bg-red-50 text-red-700 border-red-200" },
  pending_review: { label: "Pending Review", className: "bg-amber-50 text-amber-700 border-amber-200" },
  excused: { label: "Excused", className: "bg-green-50 text-green-700 border-green-200" },
  denied: { label: "Denied", className: "bg-red-50 text-red-700 border-red-200" },

  TRIALING: { label: "Trial", className: "bg-purple-50 text-purple-700 border-purple-200" },
  ACTIVE: { label: "Active", className: "bg-green-50 text-green-700 border-green-200" },
  PAST_DUE: { label: "Past Due", className: "bg-red-50 text-red-700 border-red-200" },
  SUSPENDED: { label: "Suspended", className: "bg-amber-50 text-amber-700 border-amber-200" },
  CANCELED: { label: "Canceled", className: "bg-gray-100 text-gray-500 border-gray-200" },
  PAUSED: { label: "Paused", className: "bg-gray-100 text-gray-600 border-gray-200" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    className: "bg-gray-100 text-gray-700 border-gray-200",
  };

  return (
    <Badge variant="outline" className={cn("font-normal", config.className, className)}>
      {config.label}
    </Badge>
  );
}
