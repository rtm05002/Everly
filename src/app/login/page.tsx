export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Use your Whop account to access your hub dashboard.
      </p>

      <a
        href="/api/auth/whop/start"
        className="mt-6 inline-flex items-center rounded-md border px-4 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-900"
      >
        Sign in with Whop
      </a>
    </div>
  )
}
