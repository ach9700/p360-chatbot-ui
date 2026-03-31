function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Apply inline formatting to already-HTML-escaped text */
function inline(text) {
  // Bold-italic
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  // Italic (asterisk only – avoids breaking list markers)
  text = text.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
  // Inline code
  text = text.replace(/`([^`\n]+)`/g, '<code>$1</code>')
  // Named links  [label](url) — href must start with http(s):// or mailto:
  text = text.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)"<>\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1&#8599;</a>',
  )
  // Named mailto links  [label](mailto:address)
  text = text.replace(
    /\[([^\]]+)\]\(mailto:([^)"<>\s]+)\)/g,
    (_, label, addr) =>
      `<a href="mailto:${addr}" class="md-link md-link--email"><strong>${label}</strong></a>`,
  )
  // Bare URLs (not already inside href="…")
  text = text.replace(
    /(?<=^|[\s(])(https?:\/\/[^\s<>")\]]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="md-link">$1&#8599;</a>',
  )
  // Bare email addresses (not already inside href="…")
  text = text.replace(
    /(?<![="])([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/g,
    '<a href="mailto:$1" class="md-link md-link--email"><strong>$1</strong></a>',
  )
  return text
}

/**
 * Render a markdown string to safe HTML.
 * @param {string} raw
 * @returns {string}
 */
export function renderMarkdown(raw) {
  if (!raw || typeof raw !== 'string') return ''

  const lines = raw.split('\n')
  const blocks = []
  /** @type {string[]} */ let listBuf = []
  /** @type {'ul'|'ol'|null} */ let listType = null
  let codeLines = []
  let inCode = false
  let codeLang = ''
  // When true, we saw a blank line while inside a list — hold off flushing
  // until we confirm the next non-blank line is NOT a list item.
  let listPendingFlush = false

  function flushList() {
    if (!listBuf.length) return
    const tag = listType === 'ol' ? 'ol' : 'ul'
    blocks.push(
      `<${tag}>\n${listBuf
        .map((li) => `  <li>${inline(li)}</li>`)
        .join('\n')}\n</${tag}>`,
    )
    listBuf = []
    listType = null
    listPendingFlush = false
  }

  for (const line of lines) {
    // ── Fenced code block ─────────────────────────────────────────────
    if (line.startsWith('```')) {
      if (!inCode) {
        flushList()
        inCode = true
        codeLang = line.slice(3).trim()
        codeLines = []
      } else {
        const langAttr = codeLang ? ` class="language-${escapeHtml(codeLang)}"` : ''
        blocks.push(`<pre><code${langAttr}>${escapeHtml(codeLines.join('\n'))}</code></pre>`)
        inCode = false
        codeLines = []
        codeLang = ''
      }
      continue
    }
    if (inCode) {
      codeLines.push(line)
      continue
    }

    // ── Headings ──────────────────────────────────────────────────────
    const h4m = line.match(/^#{3,} (.+)$/)
    const h3m = line.match(/^## (.+)$/)
    const h2m = line.match(/^# (.+)$/)
    if (h4m) { flushList(); blocks.push(`<h4>${inline(escapeHtml(h4m[1]))}</h4>`); continue }
    if (h3m) { flushList(); blocks.push(`<h3>${inline(escapeHtml(h3m[1]))}</h3>`); continue }
    if (h2m) { flushList(); blocks.push(`<h3>${inline(escapeHtml(h2m[1]))}</h3>`); continue }

    // ── Horizontal rule ───────────────────────────────────────────────
    if (/^---+$/.test(line.trim())) {
      flushList(); blocks.push('<hr>'); continue
    }

    // ── Unordered list ────────────────────────────────────────────────
    const ulm = line.match(/^[ \t]*[-*] (.+)$/)
    if (ulm) {
      if (listType === 'ol') flushList()
      listType = 'ul'
      listPendingFlush = false
      listBuf.push(escapeHtml(ulm[1]))
      continue
    }

    // ── Ordered list ──────────────────────────────────────────────────
    const olm = line.match(/^[ \t]*\d+\. (.+)$/)
    if (olm) {
      if (listType === 'ul') flushList()
      listType = 'ol'
      listPendingFlush = false
      listBuf.push(escapeHtml(olm[1]))
      continue
    }

    // ── Empty line ────────────────────────────────────────────────────
    if (line.trim() === '') {
      if (listType) {
        // Don't flush yet — next line might be another list item (loose lists)
        listPendingFlush = true
      } else {
        if (blocks.length) blocks.push('<div class="md-spacer"></div>')
      }
      continue
    }

    // ── Non-list content: flush any pending list first ─────────────────
    if (listPendingFlush) {
      flushList()
      blocks.push('<div class="md-spacer"></div>')
    } else {
      flushList()
    }

    // ── Regular paragraph line ────────────────────────────────────────
    blocks.push(`<p>${inline(escapeHtml(line))}</p>`)
  }

  flushList()
  if (inCode && codeLines.length) {
    blocks.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`)
  }

  // Trim leading/trailing spacers
  while (blocks[0]?.includes('md-spacer')) blocks.shift()
  while (blocks[blocks.length - 1]?.includes('md-spacer')) blocks.pop()

  return blocks.join('\n')
}
