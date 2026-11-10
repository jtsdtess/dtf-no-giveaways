// ============================================
// DTF Фильтр слов — Content Script
// ============================================
// PRESET_KEYWORDS загружается из presets.js (подключается в manifest.json)

const POST_SELECTOR = 'div.content'
const INITIAL_SCAN_DELAY = 500
const MUTATION_SCAN_DELAY = 50
const TOAST_REMOVE_DELAY = 3000
const INTERSECTION_THRESHOLD = 0.1
const TEXT_SELECTORS = [
  '.content-title a',
  '.content-title',
  '.block-text p',
  '.block-text',
  '.content__body',
]

// Инъекция базовых стилей (с высокой специфичностью)
const style = document.createElement('style')
style.textContent = `
  .content.dtf-filter-hidden,
  div.content.dtf-filter-hidden,
  [data-dtf-filtered].dtf-filter-hidden {
    display: none !important;
    visibility: hidden !important;
    height: 0 !important;
    overflow: hidden !important;
  }

  @keyframes dtf-slideIn {
    from { transform: translateY(-20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  @keyframes dtf-fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
`
document.head.appendChild(style)

// Стили для плашки скрытого поста
const PLACEHOLDER_STYLES = {
  base: `
    padding: 16px 20px;
    margin: 8px 0;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border: 1px solid #e94560;
    border-radius: 8px;
    color: #a0a0a0;
    font-size: 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    transition: all 0.2s ease;
    box-sizing: border-box;
  `,
  shown: 'border-color: #4ecca3',
  hover:
    'transform: scale(1.005); box-shadow: 0 4px 12px rgba(233, 69, 96, 0.2)',
}

let customKeywords = []
let disabledPresets = []
let hiddenCount = 0
let showNotifications = false
const keywordStats = {}

// Отслеживаем какие плашки уже показывали уведомление
const notifiedPlaceholders = new WeakSet()

// Intersection Observer для уведомлений когда плашка появляется на экране
const intersectionObserver = new IntersectionObserver(
  (entries) => {
    if (!showNotifications) return
    entries.forEach((entry) => {
      if (entry.isIntersecting && !notifiedPlaceholders.has(entry.target)) {
        notifiedPlaceholders.add(entry.target)
        const keyword = entry.target.dataset.keyword
        if (keyword) {
          showToast(keyword)
        }
      }
    })
  },
  { threshold: INTERSECTION_THRESHOLD }
)

// Стили для тост-уведомления
const TOAST_STYLES = `
  position: fixed;
  top: 20px;
  right: 20px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border: 1px solid #e94560;
  border-radius: 8px;
  padding: 12px 16px;
  color: #eee;
  font-size: 13px;
  z-index: 10000;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  animation: dtf-slideIn 0.2s ease, dtf-fadeOut 0.3s ease 2.3s forwards;
  max-width: 300px;
`

/**
 * Возвращает полный список активных слов для фильтрации
 * @returns {string[]} Массив ключевых слов
 */
function getAllKeywords() {
  const activePresets = PRESET_KEYWORDS.filter((k) => !disabledPresets.includes(k))
  return [...new Set([...activePresets, ...customKeywords])]
}

/**
 * Показывает тост-уведомление о скрытом посте
 * @param {string} keyword - Найденное ключевое слово
 */
function showToast(keyword) {
  const toast = document.createElement('div')
  toast.className = 'dtf-filter-toast'
  toast.style.cssText = TOAST_STYLES
  toast.innerHTML = `
    <span style="font-size: 16px;">🚫</span>
    <span>Скрыт пост: <strong style="color: #e94560;">${escapeHtml(keyword)}</strong></span>
  `
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), TOAST_REMOVE_DELAY)
}

/**
 * Экранирует HTML для безопасности
 * @param {string} text - Исходный текст
 * @returns {string} Экранированный текст
 */
function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * Загружает пользовательские слова из chrome.storage.sync
 * @returns {Promise<void>}
 */
function loadKeywords() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['customKeywords', 'disabledPresets'], (result) => {
      if (chrome.runtime.lastError) {
        console.error('[DTF Фильтр слов] Ошибка загрузки:', chrome.runtime.lastError)
      } else {
        if (result.customKeywords && Array.isArray(result.customKeywords)) {
          customKeywords = result.customKeywords
        }
        if (result.disabledPresets && Array.isArray(result.disabledPresets)) {
          disabledPresets = result.disabledPresets
        }
      }
      resolve()
    })

    chrome.storage.local.get(['showNotifications'], (result) => {
      if (result.showNotifications !== undefined) {
        showNotifications = result.showNotifications
      }
    })
  })
}

/**
 * Проверяет, содержит ли текст запрещённые слова
 * @param {string} text - Проверяемый текст
 * @returns {string|null} Найденное ключевое слово или null
 */
function containsKeyword(text) {
  if (!text) return null
  const lowerText = text.toLowerCase()
  const keywords = getAllKeywords()
  for (const keyword of keywords) {
    if (lowerText.includes(keyword.toLowerCase())) {
      return keyword
    }
  }
  return null
}

/**
 * Извлекает текст из поста по заданным селекторам
 * @param {Element} postElement - Элемент поста
 * @returns {string} Собранный текст поста
 */
function getPostText(postElement) {
  let text = ''

  TEXT_SELECTORS.forEach((selector) => {
    const elements = postElement.querySelectorAll(selector)
    elements.forEach((el) => {
      text += ' ' + (el.textContent || '')
    })
  })

  return text
}

/**
 * Скрывает пост и заменяет его кликабельной плашкой
 * @param {Element} postElement - Элемент поста
 * @param {string} matchedKeyword - Найденное ключевое слово
 */
function hidePost(postElement, matchedKeyword) {
  if (postElement.dataset.dtfFiltered) return

  postElement.dataset.dtfFiltered = 'true'
  hiddenCount++

  // Записываем статистику по слову
  keywordStats[matchedKeyword] = (keywordStats[matchedKeyword] || 0) + 1

  const placeholder = document.createElement('div')
  placeholder.className = 'dtf-filter-placeholder'
  placeholder.dataset.keyword = matchedKeyword
  placeholder.style.cssText = PLACEHOLDER_STYLES.base

  placeholder.innerHTML = `
    <span style="display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 18px;">🚫</span>
      <span>[Скрыто: <strong style="color: #e94560;">${escapeHtml(matchedKeyword)}</strong>]</span>
    </span>
    <span style="color: #666; font-size: 12px;">Нажмите, чтобы показать</span>
  `

  // Добавляем класс для скрытия вместо inline style (более надёжно)
  postElement.classList.add('dtf-filter-hidden')
  postElement.parentNode.insertBefore(placeholder, postElement)

  // Отслеживаем когда плашка появится на экране для уведомления
  intersectionObserver.observe(placeholder)

  let isHidden = true
  placeholder.addEventListener('click', () => {
    if (isHidden) {
      postElement.classList.remove('dtf-filter-hidden')
      placeholder.innerHTML = `
        <span style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 18px;">👁️</span>
          <span>[Показано: <strong style="color: #4ecca3;">${escapeHtml(matchedKeyword)}</strong>]</span>
        </span>
        <span style="color: #666; font-size: 12px;">Нажмите, чтобы скрыть</span>
      `
      placeholder.style.cssText =
        PLACEHOLDER_STYLES.base + PLACEHOLDER_STYLES.shown
    } else {
      postElement.classList.add('dtf-filter-hidden')
      placeholder.innerHTML = `
        <span style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 18px;">🚫</span>
          <span>[Скрыто: <strong style="color: #e94560;">${escapeHtml(matchedKeyword)}</strong>]</span>
        </span>
        <span style="color: #666; font-size: 12px;">Нажмите, чтобы показать</span>
      `
      placeholder.style.cssText = PLACEHOLDER_STYLES.base
    }
    isHidden = !isHidden
  })

  placeholder.addEventListener('mouseenter', () => {
    placeholder.style.cssText =
      PLACEHOLDER_STYLES.base + PLACEHOLDER_STYLES.hover
  })
  placeholder.addEventListener('mouseleave', () => {
    placeholder.style.cssText = isHidden
      ? PLACEHOLDER_STYLES.base
      : PLACEHOLDER_STYLES.base + PLACEHOLDER_STYLES.shown
  })
}

/**
 * Сканирует все посты на странице и скрывает содержащие ключевые слова
 */
function scanPosts() {
  const posts = document.querySelectorAll(POST_SELECTOR)

  posts.forEach((post) => {
    if (post.dataset.dtfFiltered) return

    const hasTitle = post.querySelector('.content-title')
    if (!hasTitle) return

    const postText = getPostText(post)
    const matchedKeyword = containsKeyword(postText)

    if (matchedKeyword) {
      hidePost(post, matchedKeyword)
    }
  })
}

/**
 * Снимает фильтр со всех постов и выполняет повторное сканирование
 */
function refilterPosts() {
  // Сбрасываем статистику
  Object.keys(keywordStats).forEach((key) => delete keywordStats[key])
  hiddenCount = 0

  // Отключаем observer и удаляем все плашки
  document
    .querySelectorAll('.dtf-filter-placeholder')
    .forEach((el) => {
      intersectionObserver.unobserve(el)
      el.remove()
    })

  // Снимаем метки фильтрации и класс
  document.querySelectorAll('[data-dtf-filtered]').forEach((post) => {
    delete post.dataset.dtfFiltered
    post.classList.remove('dtf-filter-hidden')
  })

  // Сканируем заново
  scanPosts()
}

/**
 * Настраивает MutationObserver для отслеживания новых постов при скролле
 */
function setupObserver() {
  const observer = new MutationObserver((mutations) => {
    let shouldScan = false

    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            shouldScan = true
          }
        })
      }
    })

    if (shouldScan) {
      setTimeout(scanPosts, MUTATION_SCAN_DELAY)
    }
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })
}

// ============================================
// Слушаем сообщения от popup
// ============================================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UPDATE_KEYWORDS') {
    customKeywords = message.customKeywords || []
    disabledPresets = message.disabledPresets || []
    refilterPosts()
    sendResponse({ success: true })
    return true
  }

  if (message.type === 'GET_STATS') {
    sendResponse({
      hiddenCount,
      keywordStats: { ...keywordStats },
      customKeywords,
      presetKeywords: PRESET_KEYWORDS,
      disabledPresets,
    })
    return true
  }
})

/**
 * Инициализирует расширение: загружает настройки и запускает фильтрацию
 * @returns {Promise<void>}
 */
async function init() {
  await loadKeywords()
  setTimeout(scanPosts, INITIAL_SCAN_DELAY)
  setupObserver()
}

init()
