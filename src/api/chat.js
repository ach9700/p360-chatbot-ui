const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:7896/api').replace(/\/$/, '')

if (import.meta.env.PROD && !API_BASE.startsWith('https://')) {
  throw new Error(
    `[p360-chatbot-ui] SECURITY: VITE_API_BASE_URL must use HTTPS in production. ` +
    `Got: "${API_BASE}". Build aborted.`
  )
}

// ── Constants ──────────────────────────────────────────────────────────────
const MAX_MESSAGE_LENGTH = 4000  // chars — mirrors Django-side limit

/**
 * @typedef {{ message: string, conversation_id: string|null, name: string, email: string, organization: string }} ChatPayload
 * @typedef {{ response: string, conversation_id: string, sources: any[], escalate_to_human: boolean }} ChatResponse
 *
 * @param {ChatPayload} payload
 * @returns {Promise<ChatResponse>}
 */
export async function sendMessage(payload) {
  // Client-side payload validation — prevent oversized or malformed requests
  if (!payload.message || typeof payload.message !== 'string') {
    throw new Error('Message is required.')
  }
  if (payload.message.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Message is too long (max ${MAX_MESSAGE_LENGTH} characters).`)
  }
  if (!payload.email || typeof payload.email !== 'string') {
    throw new Error('Email is required.')
  }

  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      // Only send known fields — never forward unknown/extra properties
      message:         payload.message,
      conversation_id: payload.conversation_id ?? null,
      name:            String(payload.name ?? '').slice(0, 200),
      email:           String(payload.email).slice(0, 200),
      organization:    String(payload.organization ?? '').slice(0, 200),
    }),
  })

  if (!res.ok) {
    let detail = `Request failed (${res.status})`
    try {
      const body = await res.json()
      if (body?.error)  detail = String(body.error).slice(0, 500)
      else if (body?.detail) detail = String(body.detail).slice(0, 500)
    } catch {
      // ignore JSON parse errors — use generic message above
    }
    throw new Error(detail)
  }

  const data = await res.json()

  // Validate response shape — never trust unexpected fields
  return {
    response:          String(data.response ?? ''),
    conversation_id:   data.conversation_id ? String(data.conversation_id) : null,
    sources:           Array.isArray(data.sources) ? data.sources : [],
    escalate_to_human: Boolean(data.escalate_to_human),
  }
}

export { MAX_MESSAGE_LENGTH }

