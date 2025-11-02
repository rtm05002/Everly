import { redirect } from "next/navigation"

export default function Home() {
  // Redirect to overview page which has the proper server-side implementation
  redirect("/overview")
}

