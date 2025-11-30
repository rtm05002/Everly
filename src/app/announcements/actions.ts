"use server"

export async function sendAnnouncement(formData: FormData) {
  const title = formData.get("title") as string
  const body = formData.get("body") as string
  const audience = formData.get("audience") as string

  if (!title || !body || !audience) {
    throw new Error("Missing required fields")
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/announcements`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title, body, audience }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to send announcement')
  }

  return await response.json()
}






