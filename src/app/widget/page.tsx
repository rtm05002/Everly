"use client";
import { useEffect, useState } from "react";

export default function Widget() {
  const [token, setToken] = useState<string|undefined>();
  const hubId = "demo-hub"; const memberId = "demo-member";

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/widget/session", {
        method:"POST", headers:{ "content-type":"application/json" },
        body: JSON.stringify({ hubId, memberId })
      });
      const { token } = await res.json(); setToken(token);
    })();
  }, []);

  return (
    <div className="p-4 w-full max-w-md">
      <div className="mb-3">
        <div className="text-sm text-muted-foreground">Welcome back</div>
        <div className="text-xl font-semibold">Everly</div>
      </div>

      <div className="rounded-2xl border p-4 space-y-3">
        <div className="text-sm">Onboarding progress</div>
        <div className="h-2 bg-muted rounded-full"><div className="h-2 bg-foreground rounded-full w-2/3"/></div>
        <div className="text-xs text-muted-foreground">3 / 5 steps complete</div>
      </div>

      <div className="mt-4 rounded-2xl border p-4">
        <div className="font-medium mb-2">Active Challenge</div>
        <div className="text-sm mb-3">Post your first trade idea  earn $5</div>
        <button className="px-3 py-2 rounded-lg border">Claim</button>
      </div>

      <div className="mt-4 rounded-2xl border p-4">
        <div className="font-medium mb-2">Help</div>
        <div className="text-sm text-muted-foreground mb-2">Ask something and get instant help.</div>
        <input className="w-full border rounded-lg px-3 py-2" placeholder="How do I start?" />
      </div>

      <div className="mt-4 text-xs text-muted-foreground">token: {token ? "ok" : "loading"}</div>
    </div>
  );
}

