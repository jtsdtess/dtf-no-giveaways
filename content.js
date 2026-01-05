// ============================================
// DTF Фильтр розыгрышей — Content Script
// ============================================

// Слова для фильтрации по умолчанию (дублируется в popup.js)
const DEFAULT_KEYWORDS = [
  'розыгрыш', 'розыграю', 'разыгрываю', 'разыгрываем', 'разыграем',
  'раздача', 'раздаю', 'раздаём', 'конкурс',
  'giveaway', 'give away', 'giveway',
  'приз', 'призы', 'выиграй', 'выиграть', 'победитель получит', 'победителю достанется',
  'подарю подписчику', 'подарю рандомному', 'дарю подписчику',
  'репост и подписка', 'подпишись и', 'лайк и подписка',
  'оставь коммент', 'напиши в комментах', 'случайный комментатор', 'рандомный комментатор',
  'random comment', 'выберу случайного', 'выберу рандомного', 'рандомайзер', 'randomizer',
  'итоги подведём', 'итоги подведем', 'итоги розыгрыша', 'итоги конкурса',
  'победитель будет', 'определим победителя', 'выбор победителя',
  'разыграю ключ', 'раздам ключ', 'раздам ключи', 'дарю ключ', 'дарю steam',
  'steam key', 'free key', 'халявный ключ', 'бесплатный ключ',
  'contest', 'sweepstakes', 'lottery', 'raffle', 'win a', 'chance to win', 'enter to win', 'free stuff',
  'участвуй', 'участвуйте', 'прими участие', 'примите участие', 'для участия',
  'условия участия', 'условия розыгрыша', 'условия конкурса', 'правила розыгрыша', 'правила конкурса',
]

const POST_SELECTOR = 'div.content'
const TEXT_SELECTORS = ['.content-title a', '.content-title', '.block-text p', '.block-text', '.content__body']

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
  hover: 'transform: scale(1.005); box-shadow: 0 4px 12px rgba(233, 69, 96, 0.2)',
}

let keywords = [...DEFAULT_KEYWORDS]
let hiddenCount = 0
// Статистика: { слово: количество_скрытых_постов }
const keywordStats = {}

// ============================================
// Загрузка ключевых слов из хранилища
// ============================================
function loadKeywords() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['keywords'], (result) => {
      if (chrome.runtime.lastError) {
        console.error('[DTF Фильтр] Ошибка загрузки:', chrome.runtime.lastError)
      } else if (result.keywords && Array.isArray(result.keywords)) {
        keywords = result.keywords
      }
      resolve()
    })
  })
}

// ============================================
// Проверка: содержит ли текст запрещённые слова
// ============================================
function containsKeyword(text) {
  if (!text) return null
  const lowerText = text.toLowerCase()
  for (const keyword of keywords) {
    if (lowerText.includes(keyword.toLowerCase())) {
      return keyword
    }
  }
  return null
}

// ============================================
// Получить текст из поста
// ============================================
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

// ============================================
// Скрыть пост с пометкой
// ============================================
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
      placeholder.style.cssText = PLACEHOLDER_STYLES.base + PLACEHOLDER_STYLES.shown
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
    placeholder.style.cssText = PLACEHOLDER_STYLES.base + PLACEHOLDER_STYLES.hover
  })
  placeholder.addEventListener('mouseleave', () => {
    placeholder.style.cssText = isHidden ? PLACEHOLDER_STYLES.base : PLACEHOLDER_STYLES.base + PLACEHOLDER_STYLES.shown
  })

  console.log(`[DTF Фильтр] Скрыт пост: "${matchedKeyword}"`)
}

// ============================================
// Сканировать и фильтровать посты
// ============================================
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

// ============================================
// Снять фильтр со всех постов и отсканировать заново
// ============================================
function refilterPosts() {
  // Сбрасываем статистику
  Object.keys(keywordStats).forEach((key) => delete keywordStats[key])
  hiddenCount = 0

  // Удаляем все плашки
  document.querySelectorAll('.dtf-filter-placeholder').forEach((el) => el.remove())

  // Снимаем метки фильтрации
  document.querySelectorAll('[data-dtf-filtered]').forEach((post) => {
    delete post.dataset.dtfFiltered
    post.style.display = ''
  })

  // Сканируем заново
  scanPosts()
}

// ============================================
// MutationObserver — следим за новыми постами
// ============================================
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
    keywords = message.keywords
    refilterPosts()
    sendResponse({ success: true })
    return true
  }

  if (message.type === 'GET_STATS') {
    sendResponse({
      hiddenCount,
      keywordStats: { ...keywordStats }
    })
    return true
  }
})

// ============================================
// Инициализация
// ============================================
async function init() {
  await loadKeywords()
  setTimeout(scanPosts, 500)
  setupObserver()
  console.log('[DTF Фильтр] Запущен. Ключевые слова:', keywords)
}

init()
