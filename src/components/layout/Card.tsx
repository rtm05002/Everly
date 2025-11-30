import * as React from "react"

export function Card({
  className = "",
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`rounded-xl border bg-white/60 dark:bg-zinc-900/40 shadow-sm ${className}`}>
      {children}
    </div>
  )
}

export function CardHeader({
  className = "",
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return <div className={`px-4 pt-4 ${className}`}>{children}</div>
}

export function CardBody({
  className = "",
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return <div className={`px-4 pb-4 ${className}`}>{children}</div>
}



