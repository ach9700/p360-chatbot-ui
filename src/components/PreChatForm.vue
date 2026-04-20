<script setup>
import { ref, reactive, computed } from 'vue'
import { ORGANIZATIONS } from '../data/organizations.js'

const emit = defineEmits(['submit'])

// ── Form state ─────────────────────────────────────────────────────────────
const form = reactive({
  firstName: '',
  lastName: '',
  email: '',
  organization: '',
})

const errors = reactive({
  firstName: '',
  lastName: '',
  email: '',
  organization: '',
})

const isSubmitting = ref(false)

// ── Org combobox ───────────────────────────────────────────────────────────
const orgQuery = ref('')
const orgOpen = ref(false)
const orgHighlight = ref(-1)
const orgInputRef = ref(null)
const orgListRef = ref(null)

const filteredOrgs = computed(() => {
  const q = orgQuery.value.toLowerCase().trim()
  if (!q) return ORGANIZATIONS
  return ORGANIZATIONS.filter((o) => o.toLowerCase().includes(q))
})

function openOrg() {
  orgOpen.value = true
  orgHighlight.value = form.organization
    ? ORGANIZATIONS.indexOf(form.organization)
    : -1
}

function closeOrg() {
  orgOpen.value = false
  if (!form.organization) {
    orgQuery.value = ''
  } else {
    orgQuery.value = form.organization
  }
}

function selectOrg(org) {
  form.organization = org
  orgQuery.value = org
  orgOpen.value = false
  errors.organization = ''
  orgHighlight.value = -1
}

function clearOrg() {
  form.organization = ''
  orgQuery.value = ''
  orgOpen.value = false
}

function handleOrgKeydown(e) {
  if (!orgOpen.value) {
    if (e.key === 'ArrowDown' || e.key === 'Enter') openOrg()
    return
  }
  const len = filteredOrgs.value.length
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    orgHighlight.value = Math.min(orgHighlight.value + 1, len - 1)
    scrollHighlightIntoView()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    orgHighlight.value = Math.max(orgHighlight.value - 1, 0)
    scrollHighlightIntoView()
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (orgHighlight.value >= 0 && filteredOrgs.value[orgHighlight.value]) {
      selectOrg(filteredOrgs.value[orgHighlight.value])
    }
  } else if (e.key === 'Escape') {
    closeOrg()
    orgInputRef.value?.blur()
  }
}

function scrollHighlightIntoView() {
  if (!orgListRef.value) return
  const items = orgListRef.value.querySelectorAll('.combo-opt')
  items[orgHighlight.value]?.scrollIntoView({ block: 'nearest' })
}

// ── Validation ─────────────────────────────────────────────────────────────
function validateEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)
}

function clearError(field) {
  errors[field] = ''
}

function validate() {
  let ok = true
  errors.firstName = ''
  errors.lastName = ''
  errors.email = ''
  errors.organization = ''

  if (!form.firstName.trim()) { errors.firstName = 'First name is required.'; ok = false }
  if (!form.lastName.trim())  { errors.lastName  = 'Last name is required.';  ok = false }
  if (!form.email.trim()) {
    errors.email = 'Email address is required.'; ok = false
  } else if (!validateEmail(form.email.trim())) {
    errors.email = 'Please enter a valid email address.'; ok = false
  }
  if (!form.organization) { errors.organization = 'Please select your organization.'; ok = false }
  return ok
}

// ── Submit ─────────────────────────────────────────────────────────────────
function handleSubmit() {
  if (!validate() || isSubmitting.value) return
  isSubmitting.value = true
  emit('submit', {
    firstName: form.firstName.trim(),
    lastName:  form.lastName.trim(),
    email:     form.email.trim().toLowerCase(),
    organization: form.organization,
  })
}
</script>

<template>
  <div class="form-page">

    <!-- ── Left: Form ── -->
    <div class="form-left">
      <div class="form-inner">

        <div class="form-header">
          <h1 class="form-title">Get Started</h1>
          <p class="form-subtitle">Tell us a bit about yourself to connect.</p>
        </div>

        <form class="form-fields" novalidate @submit.prevent="handleSubmit">

          <!-- First + Last Name -->
          <div class="field-row">
            <div class="field" :class="{ 'field--err': errors.firstName }">
              <label for="firstName" class="flabel">First Name <span class="req">*</span></label>
              <input
                id="firstName" v-model="form.firstName" type="text" class="finput"
                placeholder="Jane" autocomplete="given-name" maxlength="100"
                :aria-invalid="!!errors.firstName"
                @input="clearError('firstName')"
              />
              <Transition name="ferr">
                <p v-if="errors.firstName" class="ferror" role="alert">{{ errors.firstName }}</p>
              </Transition>
            </div>

            <div class="field" :class="{ 'field--err': errors.lastName }">
              <label for="lastName" class="flabel">Last Name <span class="req">*</span></label>
              <input
                id="lastName" v-model="form.lastName" type="text" class="finput"
                placeholder="Smith" autocomplete="family-name" maxlength="100"
                :aria-invalid="!!errors.lastName"
                @input="clearError('lastName')"
              />
              <Transition name="ferr">
                <p v-if="errors.lastName" class="ferror" role="alert">{{ errors.lastName }}</p>
              </Transition>
            </div>
          </div>

          <!-- Email -->
          <div class="field" :class="{ 'field--err': errors.email }">
            <label for="email" class="flabel">Email Address <span class="req">*</span></label>
            <input
              id="email" v-model="form.email" type="email" class="finput"
              placeholder="jane@example.com" autocomplete="email" maxlength="254"
              :aria-invalid="!!errors.email"
              @input="clearError('email')"
            />
            <Transition name="ferr">
              <p v-if="errors.email" class="ferror" role="alert">{{ errors.email }}</p>
            </Transition>
          </div>

          <!-- Organization combobox -->
          <div class="field" :class="{ 'field--err': errors.organization }">
            <label for="org-input" class="flabel">Test Organization <span class="req">*</span></label>

            <div class="combo" :class="{ 'combo--open': orgOpen, 'combo--err': errors.organization }">
              <div class="combo-wrap">
                <input
                  id="org-input"
                  ref="orgInputRef"
                  v-model="orgQuery"
                  type="text"
                  class="combo-input"
                  placeholder="Search or select your organization…"
                  autocomplete="off"
                  role="combobox"
                  :aria-expanded="orgOpen"
                  aria-haspopup="listbox"
                  aria-autocomplete="list"
                  :aria-activedescendant="orgHighlight >= 0 ? `opt-${orgHighlight}` : undefined"
                  @focus="openOrg"
                  @blur="closeOrg"
                  @input="orgOpen = true; orgHighlight = -1; errors.organization = ''"
                  @keydown="handleOrgKeydown"
                />
                <button
                  v-if="orgQuery"
                  type="button" class="combo-clear" tabindex="-1" aria-label="Clear"
                  @mousedown.prevent="clearOrg"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                  </svg>
                </button>
                <button
                  type="button" class="combo-chevron" tabindex="-1" aria-hidden="true"
                  @mousedown.prevent="orgOpen ? closeOrg() : (orgInputRef?.focus(), openOrg())"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
              </div>

              <Transition name="dropdown">
                <ul v-if="orgOpen" ref="orgListRef" class="combo-list" role="listbox" @mousedown.prevent>
                  <template v-for="(org, idx) in filteredOrgs" :key="org">
                    <li v-if="org === 'Other'" class="combo-divider" role="presentation" aria-hidden="true">
                      <span>Other</span>
                    </li>
                    <li
                      :id="`opt-${idx}`"
                      class="combo-opt"
                      :class="{
                        'combo-opt--hi':  orgHighlight === idx,
                        'combo-opt--sel': form.organization === org,
                      }"
                      role="option"
                      :aria-selected="form.organization === org"
                      @click="selectOrg(org)"
                      @mouseenter="orgHighlight = idx"
                    >
                      <svg v-if="form.organization === org" class="opt-check" width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                      {{ org }}
                    </li>
                  </template>
                  <li v-if="!filteredOrgs.length" class="combo-empty">
                    No match for "{{ orgQuery }}"
                  </li>
                </ul>
              </Transition>
            </div>

            <Transition name="ferr">
              <p v-if="errors.organization" class="ferror" role="alert">{{ errors.organization }}</p>
            </Transition>
          </div>

          <!-- Submit -->
          <button type="submit" class="btn-start" :disabled="isSubmitting">
            <span>{{ isSubmitting ? 'Starting…' : 'Start Chat' }}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>

        </form>
      </div>
    </div>

    <!-- ── Right: Animated branding ── -->
    <div class="form-right">
      <div class="welcome-content">
        <div class="welcome-logo-wrap">
          <img src="/logo.png" alt="Proctor360" class="welcome-logo" />
        </div>
        <div class="welcome-org">Proctor360</div>
        <div class="welcome-tagline">
          <span class="typing-text">Welcome to Chat Support</span>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* ── Split layout ── */
.form-page {
  height: 100vh;
  width: 100vw;
  display: grid;
  grid-template-columns: 1fr 1fr;
  overflow: hidden;
}

/* ───────────────────────────────────────────────
   LEFT SIDE — white, clean
─────────────────────────────────────────────── */
.form-left {
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 56px 52px;
  overflow-y: auto;
}

.form-inner {
  width: 100%;
  max-width: 480px;
  animation: fade-up 0.5s ease-out both;
}

.form-header {
  margin-bottom: 36px;
}

.form-title {
  font-size: 2rem;
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.025em;
  margin-bottom: 8px;
}

.form-subtitle {
  font-size: 1rem;
  color: #6b7280;
  line-height: 1.6;
}

/* ── Form fields ── */
.form-fields {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.flabel {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  letter-spacing: 0.005em;
}

.req { color: #dc2626; margin-left: 2px; }

.finput {
  height: 48px;
  padding: 0 14px;
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  font-family: var(--font-sans);
  color: #111827;
  background: #fff;
  transition: border-color 0.15s, box-shadow 0.15s;
  outline: none;
  width: 100%;
}
.finput::placeholder { color: #9ca3af; }
.finput:focus {
  border-color: #1a73e8;
  box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.12);
}
.field--err .finput { border-color: #dc2626; }
.field--err .finput:focus { box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1); }

.ferror {
  font-size: 0.75rem;
  color: #dc2626;
  line-height: 1.4;
}
.ferr-enter-active { transition: all 0.15s ease; }
.ferr-leave-active { transition: all 0.1s ease; }
.ferr-enter-from, .ferr-leave-to { opacity: 0; transform: translateY(-3px); }

/* ── Combobox ── */
.combo { position: relative; }

.combo-wrap {
  display: flex;
  align-items: center;
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  transition: border-color 0.15s, box-shadow 0.15s;
  overflow: visible;
}
.combo--open .combo-wrap,
.combo-wrap:focus-within {
  border-color: #1a73e8;
  box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.12);
}
.combo--err .combo-wrap { border-color: #dc2626; }
.combo--err .combo-wrap:focus-within { box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1); }

.combo-input {
  flex: 1;
  height: 48px;
  padding: 0 4px 0 14px;
  border: none;
  outline: none;
  font-size: 0.9375rem;
  font-family: var(--font-sans);
  color: #111827;
  background: transparent;
  min-width: 0;
}
.combo-input::placeholder { color: #9ca3af; }

.combo-clear, .combo-chevron {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #6b7280;
  border-radius: 6px;
  margin-right: 4px;
  transition: color 0.12s, background 0.12s;
}
.combo-clear:hover { color: #dc2626; background: #fee2e2; }
.combo-chevron { transition: color 0.12s, transform 0.2s; }
.combo--open .combo-chevron { transform: rotate(180deg); color: #1a73e8; }

.combo-list {
  position: absolute;
  top: calc(100% + 6px);
  left: 0; right: 0;
  max-height: 220px;
  overflow-y: auto;
  background: #fff;
  border: 1.5px solid #e5e7eb;
  border-radius: 10px;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.08);
  z-index: 9999;
  padding: 4px;
  list-style: none;
}
.combo-list::-webkit-scrollbar { width: 4px; }
.combo-list::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }

.combo-opt {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border-radius: 6px;
  font-size: 0.875rem;
  color: #111827;
  cursor: pointer;
  transition: background 0.1s;
  user-select: none;
}
.combo-opt--hi  { background: #eff6ff; }
.combo-opt--sel { color: #1a73e8; font-weight: 600; }
.opt-check { flex-shrink: 0; color: #1a73e8; }

.combo-divider {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px 4px;
  margin-top: 4px;
  pointer-events: none;
}
.combo-divider::before,
.combo-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e5e7eb;
}
.combo-divider span {
  font-size: 0.7rem;
  font-weight: 600;
  color: #9ca3af;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  white-space: nowrap;
}

.combo-empty {
  padding: 12px;
  text-align: center;
  font-size: 0.875rem;
  color: #6b7280;
  font-style: italic;
}

.dropdown-enter-active { transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1); }
.dropdown-leave-active { transition: all 0.12s ease; }
.dropdown-enter-from,
.dropdown-leave-to { opacity: 0; transform: translateY(-6px) scaleY(0.95); transform-origin: top; }

/* ── Submit button ── */
.btn-start {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 52px;
  background: #1a73e8;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  font-family: var(--font-sans);
  cursor: pointer;
  transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
  box-shadow: 0 2px 8px rgba(26, 115, 232, 0.3);
  margin-top: 8px;
}
.btn-start:hover:not(:disabled) {
  background: #1558c0;
  box-shadow: 0 4px 14px rgba(26, 115, 232, 0.4);
}
.btn-start:active:not(:disabled) { transform: scale(0.98); }
.btn-start:disabled { opacity: 0.5; cursor: not-allowed; }

/* ───────────────────────────────────────────────
   RIGHT SIDE — blue gradient, soft Material You
─────────────────────────────────────────────── */
.form-right {
  background: linear-gradient(160deg, #0a1f4e 0%, #1a4fad 55%, #2d7ef5 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 56px 52px;
  position: relative;
  overflow: hidden;
}

/* Soft background circles for depth — no hard edges */
.form-right::before {
  content: '';
  position: absolute;
  width: 600px;
  height: 600px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 65%);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}
.form-right::after {
  content: '';
  position: absolute;
  width: 300px;
  height: 300px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(100,180,255,0.12) 0%, transparent 70%);
  bottom: -60px;
  right: -60px;
  pointer-events: none;
}

.welcome-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
  text-align: center;
  position: relative;
  z-index: 1;
}

/* 1. Logo — blur-to-sharp entrance + gentle float loop */
.welcome-logo-wrap {
  will-change: transform, opacity, filter;
  animation: blur-rise 0.9s cubic-bezier(0, 0, 0.2, 1) 0.2s both;
}

.welcome-logo {
  width: 180px;
  height: 180px;
  object-fit: contain;
  filter: drop-shadow(0 12px 40px rgba(0, 0, 0, 0.28));
  animation: float 5s ease-in-out 1.2s infinite;
}

/* 2. Org name — blur-to-sharp, Plus Jakarta Sans */
.welcome-org {
  font-family: 'Plus Jakarta Sans', var(--font-sans);
  font-size: 3.5rem;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: -0.03em;
  line-height: 1.1;
  will-change: transform, opacity, filter;
  animation: blur-rise 0.9s cubic-bezier(0, 0, 0.2, 1) 0.65s both;
  text-shadow: 0 2px 24px rgba(0, 0, 0, 0.2);
}

/* 3. Tagline pill — frosted glass card with typing */
.welcome-tagline {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 100px;
  padding: 14px 28px;
  font-family: 'Plus Jakarta Sans', var(--font-sans);
  font-size: 1.25rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  min-height: 3.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: 0.01em;
  will-change: opacity, transform;
  animation: blur-rise 0.7s cubic-bezier(0, 0, 0.2, 1) 1.2s both;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255,255,255,0.15);
}

.typing-text {
  display: inline-block;
  overflow: hidden;
  white-space: nowrap;
  width: 0;
  animation: typing 2s steps(24, end) 1.9s forwards;
}

.typing-text::after {
  content: '|';
  color: rgba(255, 255, 255, 0.75);
  font-weight: 300;
  animation: blink 0.8s step-end infinite 1.9s;
}

/* ── Keyframes ── */

/* Blur-to-sharp entrance (Material You recommended) */
@keyframes blur-rise {
  from {
    opacity: 0;
    transform: translateY(20px);
    filter: blur(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }
}

/* Gentle perpetual float for the logo */
@keyframes float {
  0%, 100% { transform: translateY(0px);  }
  50%       { transform: translateY(-10px); }
}

@keyframes typing {
  from { width: 0; }
  to   { width: 24ch; }
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}

/* Left panel entrance */
@keyframes fade-up {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ───────────────────────────────────────────────
   RESPONSIVE
─────────────────────────────────────────────── */
@media (max-width: 768px) {
  .form-page {
    grid-template-columns: 1fr;
  }

  .form-right {
    display: none;
  }

  .form-left {
    height: 100vh;
    padding: 32px 24px;
  }

  .form-inner {
    max-width: 100%;
  }

  .field-row {
    grid-template-columns: 1fr;
  }

  .form-title {
    font-size: 1.5rem;
  }
}
</style>
