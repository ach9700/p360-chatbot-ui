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
    <div class="blob blob-1" aria-hidden="true" />
    <div class="blob blob-2" aria-hidden="true" />

    <div class="form-card">
      <!-- Header -->
      <div class="card-header">
        <img src="/logo.png" alt="Proctor360" class="card-logo" />
        <h1 class="card-title">Proctor360 AI Support</h1>
        <p class="card-subtitle">Let's get you connected. Tell us a bit about yourself.</p>
      </div>

      <!-- Body -->
      <form class="card-body" novalidate @submit.prevent="handleSubmit">

        <!-- First + Last Name -->
        <div class="field-row">
          <div class="field" :class="{ 'field--err': errors.firstName }">
            <label for="firstName" class="flabel">
              First Name <span class="req">*</span>
            </label>
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
            <label for="lastName" class="flabel">
              Last Name <span class="req">*</span>
            </label>
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
          <label for="email" class="flabel">
            Email Address <span class="req">*</span>
          </label>
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
          <label for="org-input" class="flabel">
            Organization <span class="req">*</span>
          </label>

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
                  <!-- Visual divider before "Other" -->
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
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
/* ── Page / backdrop ── */
.form-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  background: linear-gradient(145deg, #0a1f4e 0%, #1a73e8 65%, #3d9df5 100%);
  position: relative;
  overflow: hidden;
}

.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(70px);
  pointer-events: none;
  opacity: 0.32;
}
.blob-1 { width: 500px; height: 500px; top: -180px; left: -180px; background: #60a5fa; }
.blob-2 { width: 420px; height: 420px; bottom: -140px; right: -140px; background: #0a1f4e; }

/* ── Card ── */
.form-card {
  width: 100%;
  max-width: 510px;
  background: #fff;
  border-radius: 22px;
  box-shadow: 0 28px 72px rgba(0,0,0,0.32);
  /* NOTE: no overflow:hidden — would clip the org dropdown */
  position: relative;
  z-index: 1;
  animation: slide-up 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
}
@keyframes slide-up {
  from { opacity: 0; transform: translateY(30px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* ── Header ── */
.card-header {
  background: linear-gradient(145deg, #0a1f4e 0%, #1a73e8 100%);
  padding: 38px 32px 30px;
  text-align: center;
  color: #fff;
  border-radius: 22px 22px 0 0;  /* replaces card overflow:hidden */
}

.card-logo {
  width: 76px;
  height: 76px;
  object-fit: contain;
  margin-bottom: 16px;
  filter: drop-shadow(0 4px 14px rgba(0,0,0,0.45));
}

.card-title {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.025em;
  margin-bottom: 7px;
}

.card-subtitle {
  font-size: 0.9375rem;
  opacity: 0.84;
  line-height: 1.55;
}

/* ── Body ── */
.card-body {
  padding: 30px 32px 34px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Two-col name row ── */
.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

/* ── Fields ── */
.field { display: flex; flex-direction: column; gap: 5px; }

.flabel {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #374151;
  letter-spacing: 0.01em;
}
.req { color: #dc2626; margin-left: 2px; }

.finput {
  height: 46px;
  padding: 0 14px;
  border: 1.5px solid #d1d5db;
  border-radius: 10px;
  font-size: 0.9375rem;
  font-family: var(--font-sans);
  color: #111827;
  background: #fff;
  transition: border-color 0.12s, box-shadow 0.12s;
  outline: none;
  width: 100%;
}
.finput::placeholder { color: #9ca3af; }
.finput:focus {
  border-color: #1a73e8;
  box-shadow: 0 0 0 3px rgba(26,115,232,0.14);
}
.field--err .finput { border-color: #dc2626; }
.field--err .finput:focus { box-shadow: 0 0 0 3px rgba(220,38,38,0.12); }

.ferror {
  font-size: 0.775rem;
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
  border: 1.5px solid #d1d5db;
  border-radius: 10px;
  background: #fff;
  transition: border-color 0.12s, box-shadow 0.12s;
  overflow: visible;
}
.combo--open .combo-wrap,
.combo-wrap:focus-within {
  border-color: #1a73e8;
  box-shadow: 0 0 0 3px rgba(26,115,232,0.14);
}
.combo--err .combo-wrap { border-color: #dc2626; }
.combo--err .combo-wrap:focus-within { box-shadow: 0 0 0 3px rgba(220,38,38,0.12); }

.combo-input {
  flex: 1;
  height: 46px;
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
  border-radius: 7px;
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
  max-height: 240px;
  overflow-y: auto;
  background: #fff;
  border: 1.5px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 16px 48px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.10);
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
  border-radius: 8px;
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

.dropdown-enter-active { transition: all 0.18s cubic-bezier(0.16,1,0.3,1); }
.dropdown-leave-active { transition: all 0.12s ease; }
.dropdown-enter-from,
.dropdown-leave-to { opacity: 0; transform: translateY(-6px) scaleY(0.95); transform-origin: top; }

/* ── Submit ── */
.btn-start {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  height: 50px;
  background: linear-gradient(135deg, #1a73e8, #1256b0);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 700;
  font-family: var(--font-sans);
  letter-spacing: 0.01em;
  cursor: pointer;
  transition: opacity 0.12s, transform 0.12s, box-shadow 0.12s;
  box-shadow: 0 4px 16px rgba(26,115,232,0.42);
  margin-top: 4px;
}
.btn-start:hover:not(:disabled) {
  opacity: 0.92;
  transform: translateY(-1px);
  box-shadow: 0 7px 22px rgba(26,115,232,0.52);
}
.btn-start:active:not(:disabled) { transform: scale(0.984); }
.btn-start:disabled { opacity: 0.6; cursor: not-allowed; }

/* ── Responsive ── */
@media (max-width: 480px) {
  .field-row { grid-template-columns: 1fr; }
  .card-header { padding: 28px 22px 24px; }
  .card-body { padding: 24px 20px 28px; }
}
</style>
