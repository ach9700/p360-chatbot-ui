<script setup>
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import TypingIndicator from './TypingIndicator.vue'
import { sendMessage, MAX_MESSAGE_LENGTH } from '../api/chat.js'
import { renderMarkdown } from '../utils/markdown.js'

const props = defineProps({
  userInfo: { type: Object, required: true },
})

// ── Computed user fields ───────────────────────────────────────────────────
const fullName    = computed(() => `${props.userInfo.firstName} ${props.userInfo.lastName}`)
const initials    = computed(() => {
  const f = props.userInfo.firstName?.[0] ?? ''
  const l = props.userInfo.lastName?.[0] ?? ''
  return (f + l).toUpperCase()
})

// ── Chat state ─────────────────────────────────────────────────────────────
const charCount      = computed(() => inputText.value.length)
const nearLimit      = computed(() => charCount.value >= MAX_MESSAGE_LENGTH - 500)
const overLimit      = computed(() => charCount.value > MAX_MESSAGE_LENGTH)

const messages       = ref([])
const conversationId = ref(null)
const isTyping       = ref(false)
const hasEscalated   = ref(false)
const inputText      = ref('')

const messagesEndRef = ref(null)
const inputRef       = ref(null)
const messagesAreaRef = ref(null)

// ── Sidebar ────────────────────────────────────────────────────────────────
const sidebarOpen = ref(false)

function closeSidebar() { sidebarOpen.value = false }
function toggleSidebar() { sidebarOpen.value = !sidebarOpen.value }

// Close sidebar on resize to desktop
if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 768) sidebarOpen.value = false
  })
}

// ── Message ID ────────────────────────────────────────────────────────────
let _id = 0
const uid = () => `m${++_id}`

// ── Scroll ────────────────────────────────────────────────────────────────
async function scrollToBottom(behavior = 'smooth') {
  await nextTick()
  messagesEndRef.value?.scrollIntoView({ behavior })
}

// Show scroll-to-bottom button
const showScrollBtn = ref(false)
function onScroll() {
  const el = messagesAreaRef.value
  if (!el) return
  const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
  showScrollBtn.value = distFromBottom > 120
}

// ── Textarea auto-resize ──────────────────────────────────────────────────
function resizeInput() {
  const el = inputRef.value
  if (!el) return
  el.style.height = 'auto'
  const sh = el.scrollHeight
  el.style.height = Math.min(sh, 140) + 'px'
  el.style.overflowY = sh > 140 ? 'auto' : 'hidden'
}
watch(inputText, () => nextTick(resizeInput))

// ── Mount / greeting ──────────────────────────────────────────────────────
onMounted(async () => {
  messages.value.push({
    id: uid(),
    role: 'bot',
    content: `Hi **${props.userInfo.firstName}**! 👋 I'm the Proctor360 AI support assistant.\n\nHow can I help you today?`,
  })
  await scrollToBottom('instant')
  inputRef.value?.focus()
})

// ── Send message ──────────────────────────────────────────────────────────
async function handleSend() {
  const text = inputText.value.trim()
  if (!text || isTyping.value) return

  inputText.value = ''
  await nextTick(resizeInput)

  messages.value.push({ id: uid(), role: 'user', content: text })
  await scrollToBottom()
  isTyping.value = true

  try {
    const data = await sendMessage({
      message:         text,
      conversation_id: conversationId.value,
      name:            fullName.value,
      email:           props.userInfo.email,
      organization:    props.userInfo.organization,
    })

    if (data.conversation_id) conversationId.value = data.conversation_id
    messages.value.push({ id: uid(), role: 'bot', content: data.response })
    if (data.escalate_to_human) hasEscalated.value = true
  } catch (err) {
    messages.value.push({
      id: uid(),
      role: 'bot',
      isError: true,
      content: 'Sorry, something went wrong on our end. Please try again in a moment.',
    })
  } finally {
    isTyping.value = false
    await scrollToBottom()
    inputRef.value?.focus()
  }
}

function handleKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

// Rendered HTML for bot messages
function botHtml(content) {
  return renderMarkdown(content)
}
</script>

<template>
  <div class="chat-root" @click.self="closeSidebar">

    <!-- ── Mobile backdrop ── -->
    <Transition name="fade">
      <div v-if="sidebarOpen" class="mob-backdrop" aria-hidden="true" @click="closeSidebar" />
    </Transition>

    <!-- ═══════════════════════════════════════════════════════════════
         SIDEBAR
    ════════════════════════════════════════════════════════════════ -->
    <aside class="sidebar" :class="{ 'sidebar--open': sidebarOpen }" aria-label="Session info">
      <!-- Sidebar header -->
      <div class="sb-header">
        <div class="sb-brand">
          <img src="/logo.png" alt="Proctor360" class="sb-logo" />
          <div class="sb-brand-text">
            <span class="sb-title">Proctor360</span>
            <span class="sb-sub">AI Support</span>
          </div>
        </div>
        <!-- Close btn (mobile only) -->
        <button class="sb-close" aria-label="Close panel" @click="closeSidebar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>

      <div class="sb-divider" />

      <!-- Session label -->
      <div class="sb-section-label">Active Session</div>

      <!-- User info card -->
      <div class="sb-user-card">
        <div class="sb-avatar" aria-hidden="true">{{ initials }}</div>
        <div class="sb-user-info">
          <span class="sb-user-name">{{ fullName }}</span>
          <span class="sb-user-email">{{ userInfo.email }}</span>
          <span class="sb-user-org">{{ userInfo.organization }}</span>
        </div>
      </div>

      <!-- Spacer fills remaining space -->
      <div class="sb-spacer" />

      <!-- Footer -->
      <div class="sb-footer">
        <div class="sb-status">
          <span class="status-dot" aria-hidden="true" />
          <span>AI assistant online</span>
        </div>
        <p class="sb-legal">Powered by Proctor360 AI</p>
      </div>
    </aside>

    <!-- ═══════════════════════════════════════════════════════════════
         MAIN CHAT AREA
    ════════════════════════════════════════════════════════════════ -->
    <div class="chat-main">

      <!-- Mobile topbar -->
      <header class="mob-topbar" aria-label="Chat header">
        <button class="mob-menu-btn" aria-label="Open session info" @click="toggleSidebar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
        <div class="mob-topbar-brand">
          <img src="/logo.png" alt="" class="mob-topbar-logo" aria-hidden="true" />
          <span class="mob-topbar-title">Proctor360 AI</span>
        </div>
        <div class="mob-topbar-spacer" />
      </header>

      <!-- Escalation banner -->
      <Transition name="banner">
        <div v-if="hasEscalated" class="escalation-banner" role="alert">
          <svg class="banner-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>
            This conversation has been flagged for human support.
            Someone from our team will follow up with you at
            <strong>{{ userInfo.email }}</strong>.
          </span>
        </div>
      </Transition>

      <!-- Messages area -->
      <main
        ref="messagesAreaRef"
        class="messages-area"
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
        @scroll="onScroll"
      >
        <!-- Chat opener / welcome heading (hidden visually above first message) -->
        <div class="chat-welcome" aria-hidden="true">
          <img src="/logo.png" alt="" class="welcome-logo" />
          <p class="welcome-text">How can we help you today?</p>
        </div>

        <!-- Message rows -->
        <TransitionGroup name="msg" tag="div" class="messages-list">
          <div
            v-for="msg in messages"
            :key="msg.id"
            class="msg-row"
            :class="msg.role === 'user' ? 'msg-row--user' : 'msg-row--bot'"
          >
            <!-- Bot avatar -->
            <div v-if="msg.role === 'bot'" class="bot-avatar" aria-hidden="true">
              <img src="/logo.png" alt="" />
            </div>

            <!-- Bubble -->
            <div
              v-if="msg.role === 'bot'"
              class="bubble bubble--bot"
              :class="{ 'bubble--error': msg.isError }"
            >
              <!-- Rendered markdown via v-html (safe — see utils/markdown.js) -->
              <div class="msg-content" v-html="botHtml(msg.content)" />
            </div>

            <div v-else class="bubble bubble--user">
              {{ msg.content }}
            </div>

            <!-- User avatar initials -->
            <div v-if="msg.role === 'user'" class="user-avatar" aria-hidden="true">
              {{ initials }}
            </div>
          </div>
        </TransitionGroup>

        <!-- Typing indicator -->
        <Transition name="msg">
          <div v-if="isTyping" class="msg-row msg-row--bot" key="typing">
            <div class="bot-avatar" aria-hidden="true">
              <img src="/logo.png" alt="" />
            </div>
            <div class="bubble bubble--bot bubble--typing">
              <TypingIndicator />
            </div>
          </div>
        </Transition>

        <!-- Scroll anchor -->
        <div ref="messagesEndRef" style="height:1px;" />
      </main>

      <!-- Scroll-to-bottom pill -->
      <Transition name="fade">
        <button
          v-if="showScrollBtn"
          class="scroll-btn"
          aria-label="Scroll to bottom"
          @click="scrollToBottom()"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </Transition>

      <!-- Input area -->
      <footer class="input-area">
        <div class="input-box" :class="{ 'input-box--active': inputText.trim() }">
          <textarea
            ref="inputRef"
            v-model="inputText"
            class="input-ta"
            placeholder="Message Proctor360 AI…"
            rows="1"
            :disabled="isTyping"
            aria-label="Message input"
            :maxlength="MAX_MESSAGE_LENGTH"
            @keydown="handleKeydown"
          />
          <button
            class="send-btn"
            :class="{ 'send-btn--ready': inputText.trim() && !isTyping && !overLimit }"
            :disabled="!inputText.trim() || isTyping || overLimit"
            aria-label="Send message"
            @click="handleSend"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M22 2L11 13" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M22 2L15 22 11 13 2 9l20-7z" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
        <div class="input-footer">
          <p class="input-hint">Enter — send &nbsp;·&nbsp; Shift + Enter — new line</p>
          <Transition name="counter">
            <span v-if="nearLimit" class="char-counter" :class="{ 'char-counter--over': overLimit }">
              {{ charCount }} / {{ MAX_MESSAGE_LENGTH }}
            </span>
          </Transition>
        </div>
      </footer>
    </div>
  </div>
</template>

<style scoped>
/* ═══════════════════════ Layout root ═══════════════════════ */
.chat-root {
  display: flex;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: var(--chat-bg);
}

/* ═══════════════════════ Sidebar ═══════════════════════════ */
.sidebar {
  display: flex;
  flex-direction: column;
  width: 272px;
  flex-shrink: 0;
  background: var(--sb-bg);
  border-right: 1px solid var(--sb-border);
  overflow-y: auto;
  transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 50;
}

.sb-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 16px;
}

.sb-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sb-logo {
  width: 38px;
  height: 38px;
  object-fit: contain;
  border-radius: 8px;
  flex-shrink: 0;
}

.sb-brand-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.sb-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--sb-text);
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.sb-sub {
  font-size: 0.72rem;
  color: var(--sb-muted);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.sb-close {
  display: none;   /* shown on mobile only */
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: var(--sb-surface);
  border-radius: 8px;
  color: var(--sb-muted);
  cursor: pointer;
  transition: color 0.12s, background 0.12s;
}
.sb-close:hover { color: var(--sb-text); background: var(--sb-border); }

.sb-divider {
  height: 1px;
  background: var(--sb-border);
  margin: 0 16px;
}

.sb-section-label {
  padding: 16px 20px 8px;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--sb-muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

/* User card */
.sb-user-card {
  margin: 0 12px;
  padding: 14px 14px;
  background: var(--sb-surface);
  border-radius: 12px;
  border: 1px solid var(--sb-border);
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.sb-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1a73e8, #0e3c7e);
  color: #fff;
  font-size: 0.875rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  letter-spacing: 0.03em;
}

.sb-user-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.sb-user-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--sb-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sb-user-email {
  font-size: 0.75rem;
  font-weight: 700;
  color: #e5e7eb;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: 0.01em;
}

.sb-user-org {
  font-size: 0.72rem;
  color: var(--sb-accent);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

.sb-spacer { flex: 1; }

.sb-footer {
  padding: 16px 20px 20px;
  border-top: 1px solid var(--sb-border);
}

.sb-status {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 0.8125rem;
  color: var(--sb-muted);
  margin-bottom: 8px;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 0 2.5px rgba(34,197,94,0.3);
  flex-shrink: 0;
  animation: pulse-dot 2.4s ease-in-out infinite;
}
@keyframes pulse-dot {
  0%, 100% { box-shadow: 0 0 0 2.5px rgba(34,197,94,0.3); }
  50%       { box-shadow: 0 0 0 5px rgba(34,197,94,0.10); }
}

.sb-legal {
  font-size: 0.6875rem;
  color: #4b5563;
  letter-spacing: 0.01em;
}

/* ═══════════════════════ Mobile backdrop ═══════════════════ */
.mob-backdrop {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(2px);
  z-index: 40;
}

/* ═══════════════════════ Chat main ═════════════════════════ */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  min-width: 0;
}

/* Mobile topbar (hidden on desktop) */
.mob-topbar {
  display: none;
  align-items: center;
  height: 56px;
  padding: 0 16px;
  background: var(--chat-surface);
  border-bottom: 1px solid var(--chat-border);
  gap: 12px;
  flex-shrink: 0;
}

.mob-menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: none;
  background: transparent;
  border-radius: 9px;
  color: var(--chat-muted);
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.mob-menu-btn:hover { background: var(--chat-bg); color: var(--chat-text); }

.mob-topbar-logo {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.mob-topbar-title {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--chat-text);
  letter-spacing: -0.01em;
}

.mob-topbar-brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mob-topbar-spacer { flex: 1; }

/* Escalation banner */
.escalation-banner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 13px 20px;
  background: #fffbeb;
  border-bottom: 1px solid #fde68a;
  color: #78350f;
  font-size: 0.875rem;
  line-height: 1.55;
  flex-shrink: 0;
}
.banner-icon { flex-shrink: 0; color: #f59e0b; margin-top: 1px; }
.escalation-banner strong { font-weight: 700; color: #7c2d12; letter-spacing: 0.01em; }

.banner-enter-active { transition: all 0.25s ease; }
.banner-leave-active { transition: all 0.15s ease; }
.banner-enter-from, .banner-leave-to { opacity: 0; transform: translateY(-100%); }

/* ═══════════════════════ Messages area ═════════════════════ */
.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 24px 0 12px;
  display: flex;
  flex-direction: column;
  scroll-behavior: smooth;
}
.messages-area::-webkit-scrollbar { width: 5px; }
.messages-area::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 5px; }
.messages-area::-webkit-scrollbar-track { background: transparent; }

/* Welcome illustration (shows before messages fill the area) */
.chat-welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 40px 24px 20px;
  opacity: 0.18;
  pointer-events: none;
  user-select: none;
}
.welcome-logo { width: 56px; height: 56px; object-fit: contain; }
.welcome-text { font-size: 1rem; font-weight: 500; color: var(--chat-muted); }

.messages-list { display: flex; flex-direction: column; gap: 4px; }

/* ── Message rows ── */
.msg-row {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  padding: 4px 20px;
  max-width: 860px;
  width: 100%;
  margin: 0 auto;
}
.msg-row--user {
  flex-direction: row-reverse;
}

/* ── Avatars ── */
.bot-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #e8f0fe;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  border: 1.5px solid #d0e4fc;
}
.bot-avatar img {
  width: 20px;
  height: 20px;
  object-fit: contain;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1a73e8, #0e3c7e);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  letter-spacing: 0.03em;
}

/* ── Bubbles ── */
.bubble {
  max-width: min(68%, 640px);
  border-radius: 18px;
  line-height: 1.62;
  font-size: 0.9375rem;
  word-break: break-word;
}

.bubble--bot {
  background: var(--bubble-bot-bg);
  border: 1px solid var(--bubble-bot-border);
  border-bottom-left-radius: 5px;
  padding: 13px 17px;
  color: var(--bubble-bot-text);
  box-shadow: 0 1px 4px rgba(0,0,0,0.07);
}

.bubble--user {
  background: var(--bubble-user-bg);
  color: var(--bubble-user-text);
  border-bottom-right-radius: 5px;
  padding: 12px 17px;
  box-shadow: 0 2px 8px rgba(26,115,232,0.25);
  white-space: pre-wrap;
}

.bubble--error {
  background: var(--error-bg) !important;
  color: var(--error) !important;
  border-color: #fecaca !important;
}

.bubble--typing {
  padding: 14px 18px;
}

/* ── Markdown content styles (inside bot bubbles) ── */
:deep(.msg-content > *:first-child) { margin-top: 0; }
:deep(.msg-content > *:last-child)  { margin-bottom: 0; }

:deep(.msg-content p) {
  margin: 0 0 0.65em;
  line-height: 1.65;
}

:deep(.msg-content ul),
:deep(.msg-content ol) {
  padding-left: 1.6rem;
  margin: 0.5em 0 0.65em;
}

:deep(.msg-content li) {
  margin: 0.3em 0;
  line-height: 1.65;
}

:deep(.msg-content ul)  { list-style-type: disc; }
:deep(.msg-content ol)  { list-style-type: decimal; }

:deep(.msg-content h3),
:deep(.msg-content h4) {
  font-size: 0.9375rem;
  font-weight: 700;
  color: #111827;
  margin: 0.9em 0 0.4em;
  letter-spacing: -0.01em;
}

:deep(.msg-content strong) { font-weight: 700; color: #111827; }
:deep(.msg-content em) { font-style: italic; }

:deep(.msg-content code) {
  font-family: var(--font-mono);
  font-size: 0.82em;
  background: #f0f4ff;
  border: 1px solid #dbe4ff;
  color: #1755c4;
  padding: 0.1em 0.42em;
  border-radius: 5px;
}

:deep(.msg-content pre) {
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 10px;
  padding: 14px 16px;
  overflow-x: auto;
  margin: 0.75em 0;
}

:deep(.msg-content pre code) {
  background: none;
  border: none;
  color: #e2e8f0;
  font-size: 0.84em;
  padding: 0;
}

:deep(.msg-content .md-link) {
  color: #1a73e8;
  text-decoration: underline;
  text-underline-offset: 2px;
  word-break: break-all;
  font-weight: 500;
  transition: color 0.1s;
}
:deep(.msg-content .md-link:hover) { color: #1256b0; }
:deep(.msg-content .md-link--email) { word-break: break-all; }
:deep(.msg-content .md-link--email strong) { font-weight: 700; }

:deep(.msg-content hr) {
  border: none;
  border-top: 1px solid #e5e7eb;
  margin: 0.9em 0;
}

:deep(.msg-content .md-spacer) { height: 0.55em; }

/* ── Message transitions ── */
.msg-enter-active { transition: all 0.28s cubic-bezier(0.16,1,0.3,1); }
.msg-leave-active { transition: all 0.15s ease; }
.msg-enter-from  { opacity: 0; transform: translateY(12px); }
.msg-leave-to    { opacity: 0; }

/* ── Scroll-to-bottom button ── */
.scroll-btn {
  position: absolute;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--chat-surface);
  border: 1.5px solid var(--chat-border);
  color: var(--chat-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  transition: box-shadow 0.12s, background 0.12s;
  z-index: 10;
}
.scroll-btn:hover { background: var(--chat-bg); box-shadow: 0 4px 12px rgba(0,0,0,0.18); }

/* ── Input area ── */
.input-area {
  flex-shrink: 0;
  padding: 12px 20px 16px;
  background: var(--chat-surface);
  border-top: 1px solid var(--chat-border);
}

.input-box {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  background: var(--chat-input-bg);
  border: 1.5px solid var(--chat-border);
  border-radius: var(--r-xl);
  padding: 10px 10px 10px 18px;
  transition: border-color 0.12s, box-shadow 0.12s;
  max-width: 820px;
  margin: 0 auto;
}
.input-box:focus-within {
  border-color: #1a73e8;
  box-shadow: 0 0 0 3px rgba(26,115,232,0.12);
}

.input-ta {
  flex: 1;
  border: none;
  outline: none;
  font-size: 0.9375rem;
  font-family: var(--font-sans);
  color: var(--chat-text);
  background: transparent;
  resize: none;
  max-height: 140px;
  line-height: 1.55;
  padding: 1px 0;
  overflow-y: hidden;
}
.input-ta::placeholder { color: #9ca3af; }
.input-ta:disabled { opacity: 0.5; }

.send-btn {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: none;
  background: #e5e7eb;
  color: var(--chat-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.12s, color 0.12s, transform 0.1s, box-shadow 0.12s;
}
.send-btn--ready {
  background: #1a73e8;
  color: #fff;
  box-shadow: 0 2px 8px rgba(26,115,232,0.4);
}
.send-btn--ready:hover {
  background: #1256b0;
  box-shadow: 0 4px 12px rgba(26,115,232,0.5);
}
.send-btn:active:not(:disabled) { transform: scale(0.88); }
.send-btn:disabled { cursor: not-allowed; }

.input-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  max-width: 820px;
  margin: 7px auto 0;
}
.input-hint {
  font-size: 0.7rem;
  color: var(--chat-muted);
  opacity: 0.65;
  letter-spacing: 0.01em;
}
.char-counter {
  font-size: 0.7rem;
  color: var(--chat-muted);
  font-variant-numeric: tabular-nums;
  transition: color 0.2s;
}
.char-counter--over {
  color: #dc2626;
  font-weight: 600;
}
.counter-enter-active, .counter-leave-active { transition: opacity 0.2s; }
.counter-enter-from, .counter-leave-to { opacity: 0; }

/* Fade transition (backdrop, scroll btn) */
.fade-enter-active { transition: opacity 0.2s ease; }
.fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ═══════════════════════ RESPONSIVE ════════════════════════ */
@media (max-width: 767px) {
  .sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    width: 280px;
    transform: translateX(-100%);
    box-shadow: 4px 0 24px rgba(0,0,0,0.25);
  }
  .sidebar--open { transform: translateX(0); }

  .sb-close { display: flex; }

  .mob-backdrop { display: block; }
  .mob-topbar   { display: flex; }

  .msg-row { padding: 4px 12px; }
  .bubble  { max-width: 86%; }
  .input-hint { display: none; }
  .chat-welcome { padding: 20px 16px 12px; }
}

@media (min-width: 768px) {
  .mob-topbar { display: none; }
}
</style>
