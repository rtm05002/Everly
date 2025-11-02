import { type LucideIcon } from "lucide-react"
import { Button } from "./button"

interface EmptyProps {
  icon?: LucideIcon
  title?: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function Empty({ 
  icon: Icon, 
  title = "No data found", 
  description, 
  action,
  className = ""
}: EmptyProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      {Icon && (
        <div className="mb-4 rounded-full bg-muted p-3">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
      
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {title}
      </h3>
      
      {description && (
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">
          {description}
        </p>
      )}
      
      {action && (
        <Button onClick={action.onClick} className="bg-primary text-primary-foreground hover:bg-primary/90">
          {action.label}
        </Button>
      )}
    </div>
  )
}