'use client'

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="max-w-md rounded-xl border bg-background p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-foreground">Something went wrong</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          We&apos;re unable to load this page right now. Try again or head back to the dashboard.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Go home
          </a>
        </div>
      </div>
    </main>
  )
}

