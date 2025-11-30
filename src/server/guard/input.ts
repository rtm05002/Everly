export function sanitizePrompt(s: string, max = 800) {
  const trimmed = (s || '').slice(0, max).replace(/\u0000/g, '');
  return trimmed.replace(/(?:ignore|bypass|system instruction)/gi, '[filtered]');
}

