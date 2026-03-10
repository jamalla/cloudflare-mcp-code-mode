import './style.css'
import typescriptLogo from './typescript.svg'
import viteLogo from '/vite.svg'
import { setupCounter } from './counter.ts'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <a href="https://vite.dev" target="_blank">
      <img src="${viteLogo}" class="logo" alt="Vite logo" />
    </a>
    <a href="https://www.typescriptlang.org/" target="_blank">
      <img src="${typescriptLogo}" class="logo vanilla" alt="TypeScript logo" />
    </a>
    <h1>Vite + TypeScript</h1>
    <div class="card">
      <button id="counter" type="button"></button>
    </div>
    <p class="read-the-docs">
      Click on the Vite and TypeScript logos to learn more
    </p>
    <section class="weather-chat">
      <h2>Weather Chat</h2>
      <div id="chat-messages" class="chat-messages">
        <div class="chat-msg bot">Ask me about weather in any city.</div>
      </div>
      <form id="chat-form" class="chat-form">
        <input id="chat-input" type="text" placeholder="Try: weather in Tokyo this week" required />
        <button id="chat-send" type="submit">Send</button>
      </form>
    </section>
  </div>
`

setupCounter(document.querySelector<HTMLButtonElement>('#counter')!)

const chatForm = document.querySelector<HTMLFormElement>('#chat-form')
const chatInput = document.querySelector<HTMLInputElement>('#chat-input')
const chatMessages = document.querySelector<HTMLDivElement>('#chat-messages')
const chatSend = document.querySelector<HTMLButtonElement>('#chat-send')

function addMessage(role: 'user' | 'bot', text: string) {
  if (!chatMessages) return
  const msg = document.createElement('div')
  msg.className = `chat-msg ${role}`
  msg.textContent = text
  chatMessages.appendChild(msg)
  chatMessages.scrollTop = chatMessages.scrollHeight
}

function extractTextFromDataStream(raw: string): string {
  // AI SDK streams data lines; extract text deltas when present.
  const deltas: string[] = []
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('data:')) continue
    const payload = trimmed.slice(5).trim()
    if (!payload || payload === '[DONE]') continue
    try {
      const parsed = JSON.parse(payload)
      if (parsed?.type === 'text-delta' && typeof parsed.textDelta === 'string') {
        deltas.push(parsed.textDelta)
      }
    } catch {
      // Ignore non-JSON lines from the stream.
    }
  }
  return deltas.join('').trim()
}

chatForm?.addEventListener('submit', async (event) => {
  event.preventDefault()
  const text = chatInput?.value.trim()
  if (!text || !chatInput || !chatSend) return

  addMessage('user', text)
  chatInput.value = ''
  chatSend.disabled = true

  try {
    const response = await fetch('http://localhost:8787/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: text }],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(errText || `Request failed: ${response.status}`)
    }

    const raw = await response.text()
    const extracted = extractTextFromDataStream(raw)
    addMessage('bot', extracted || raw || 'No response content.')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    addMessage('bot', `Error: ${message}`)
  } finally {
    chatSend.disabled = false
    chatInput?.focus()
  }
})
