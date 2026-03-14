import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: 'approved' | 'attention' | 'critical';
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export function StatusBadge({ status, size = 'md', text, className }: StatusBadgeProps) {
  const getStatusText = (status: string) => {
    if (text) return text;
    
    switch (status) {
      case 'approved':
        return 'APROVADO';
      case 'attention':
        return 'ATENÇÃO';
      case 'critical':
        return 'CRÍTICO';
      default:
        return status.toUpperCase();
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-success/10 text-success border-success/20';
      case 'attention':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'critical':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getSizeStyles = (size: string) => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-xs';
      case 'md':
        return 'px-3 py-1 text-sm';
      case 'lg':
        return 'px-4 py-2 text-base';
      default:
        return 'px-3 py-1 text-sm';
    }
  };

  return (
    <span 
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        getStatusStyles(status),
        getSizeStyles(size),
        className
      )}
      data-testid={`status-badge-${status}`}
    >
      {getStatusText(status)}
    </span>
  );
}
