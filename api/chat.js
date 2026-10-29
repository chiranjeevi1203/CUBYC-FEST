/**
 * POST /api/chat — the chatbot's AI layer (Vercel serverless function).
 *
 * The website answers fest questions itself (src/lib/chatBrain.js). Anything it
 * can't answer is sent here, and Claude replies with the fest's full knowledge
 * (api/_knowledge.js, generated at build time) in its system prompt.
 *
 * Setup: deploy on Vercel and set the ANTHROPIC_API_KEY environment variable.
 * The key stays on the server — it is never sent to the browser.
 *
 * Body: { messages: [{ role: "user" | "assistant", content: string }, ...] }
 * Reply: { reply: string }
 */
import Anthropic from '@anthropic-ai/sdk';
import { KNOWLEDGE } from './_knowledge.js';

const client = new Anthropic(); // reads ANTHROPIC_API_KEY

const SYSTEM = `You are "CUBYC Comms", the friendly assistant on the website of CUBYC — FEST'2027, the first flagship annual fest of CHRIST (Deemed to be University), Yeshwanthpur Campus, Bangalore.

Answer any question visitors ask, helpfully and accurately. For anything about the fest, use only the fest knowledge below — never invent dates, fees, prizes, venues, contacts or rules. If a fest detail isn't in the knowledge, say it hasn't been announced yet and suggest following the website. For general questions unrelated to the fest, answer briefly and helpfully like a knowledgeable assistant.

Keep replies short and easy to scan on a phone: a sentence or two, or a few bullet points starting with "• ". Use **bold** for key names and times. No headings, tables or code blocks. Don't share personal opinions on politics or religion, and keep everything appropriate for a college audience.

<fest_knowledge>
${KNOWLEDGE}
</fest_knowledge>`;

const MAX_TURNS = 12;
const MAX_CHARS = 1200;

// Light per-instance rate limit: 20 requests per minute per IP.
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 20;
}

/** Keep only well-formed, alternating turns that start (and end) with the user. */
function clean(messages) {
  if (!Array.isArray(messages)) return null;
  const out = [];
  for (const m of messages.slice(-MAX_TURNS)) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') continue;
    const content = m.content.trim().slice(0, MAX_CHARS);
    if (!content) continue;
    if (out.length && out[out.length - 1].role === m.role) out[out.length - 1].content += `\n${content}`;
    else out.push({ role: m.role, content });
  }
  while (out.length && out[0].role !== 'user') out.shift();
  return out.length && out[out.length - 1].role === 'user' ? out : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: 'AI chat is not configured' });

  const ip = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || 'unknown';
  if (limited(ip)) return res.status(429).json({ error: 'Too many messages — please wait a moment.' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body ?? {};
  const messages = clean(body.messages);
  if (!messages) return res.status(400).json({ error: 'Send at least one user message.' });

  try {
    const response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      output_config: { effort: 'low' },
      // If a safety classifier declines, retry on Anthropic's recommended fallback model.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      // The system prompt never changes between requests, so it is cached.
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages,
    });

    if (response.stop_reason === 'refusal') {
      return res.status(200).json({ reply: "Sorry, I can't help with that one. Ask me anything about CUBYC — events, rules, the schedule or registration." });
    }
    const reply = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();
    return res.status(200).json({ reply: reply || "I couldn't come up with an answer — could you rephrase that?" });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return res.status(429).json({ error: 'The assistant is busy — try again in a moment.' });
    if (error instanceof Anthropic.AuthenticationError) return res.status(503).json({ error: 'AI chat is not configured correctly.' });
    if (error instanceof Anthropic.APIError) return res.status(502).json({ error: 'The assistant is unavailable right now.' });
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}
