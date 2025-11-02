export default function Page() {
  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="text-muted-foreground">
        Temporary developer login. This will be replaced with Whop OAuth.
      </p>
      <a
        href="/api/dev/login"
        className="inline-flex items-center rounded-md px-4 py-2 bg-primary text-primary-foreground hover:opacity-90"
      >
        Continue (dev)
      </a>
    </div>
  );
}
