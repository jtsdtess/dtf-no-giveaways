// ============================================
// DTF Фильтр розыгрышей — Content Script
// ============================================
// PRESET_KEYWORDS загружается из presets.js (подключается в manifest.json)

const POST_SELECTOR = 'div.content'
const TEXT_SELECTORS = [
  '.content-title a',
  '.content-title',
  '.block-text p',
  '.block-text',
  '.content__body',
]

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
const keywordStats = {}

/**
 * Возвращает полный список активных слов для фильтрации
 * @returns {string[]} Массив ключевых слов
 */
function getAllKeywords() {
  const activePresets = PRESET_KEYWORDS.filter((k) => !disabledPresets.includes(k))
  return [...new Set([...activePresets, ...customKeywords])]
}

/**
 * Загружает пользовательские слова из chrome.storage.sync
 * @returns {Promise<void>}
 */
function loadKeywords() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['customKeywords', 'disabledPresets'], (result) => {
      if (chrome.runtime.lastError) {
        console.error('[DTF Фильтр] Ошибка загрузки:', chrome.runtime.lastError)
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

  const originalDisplay = window.getComputedStyle(postElement).display

  const placeholder = document.createElement('div')
  placeholder.className = 'dtf-filter-placeholder'
  placeholder.style.cssText = PLACEHOLDER_STYLES.base

  placeholder.innerHTML = `
    <span style="display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 18px;">🚫</span>
      <span>[Скрыто: <strong style="color: #e94560;">${matchedKeyword}</strong>]</span>
    </span>
    <span style="color: #666; font-size: 12px;">Нажмите, чтобы показать</span>
  `

  postElement.style.display = 'none'
  postElement.parentNode.insertBefore(placeholder, postElement)

  let isHidden = true
  placeholder.addEventListener('click', () => {
    if (isHidden) {
      postElement.style.display = originalDisplay || 'block'
      placeholder.innerHTML = `
        <span style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 18px;">👁️</span>
          <span>[Показано: <strong style="color: #4ecca3;">${matchedKeyword}</strong>]</span>
        </span>
        <span style="color: #666; font-size: 12px;">Нажмите, чтобы скрыть</span>
      `
      placeholder.style.cssText =
        PLACEHOLDER_STYLES.base + PLACEHOLDER_STYLES.shown
    } else {
      postElement.style.display = 'none'
      placeholder.innerHTML = `
        <span style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 18px;">🚫</span>
          <span>[Скрыто: <strong style="color: #e94560;">${matchedKeyword}</strong>]</span>
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

  console.log(`[DTF Фильтр] Скрыт пост: "${matchedKeyword}"`)
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

  // Удаляем все плашки
  document
    .querySelectorAll('.dtf-filter-placeholder')
    .forEach((el) => el.remove())

  // Снимаем метки фильтрации
  document.querySelectorAll('[data-dtf-filtered]').forEach((post) => {
    delete post.dataset.dtfFiltered
    post.style.display = ''
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
      setTimeout(scanPosts, 150)
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
  setTimeout(scanPosts, 500)
  setupObserver()
  console.log('[DTF Фильтр] Запущен. Ключевых слов:', getAllKeywords().length)
}

init()
