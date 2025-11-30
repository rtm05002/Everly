"use client";

import * as React from "react";
import FloatingHelpLauncher from "@/components/widget/FloatingHelpLauncher";
import HelpDrawer from "@/components/widget/HelpDrawer";

export default function HelpLauncherRoot() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <FloatingHelpLauncher
        onOpen={() => setOpen(true)}
        className="lg:right-[calc((100vw-64rem)/2+1rem)]"
      />
      <HelpDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
