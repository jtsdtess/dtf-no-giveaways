// ============================================
// DTF Фильтр — Popup Script
// ============================================

// Дублируется в content.js — держать в синхроне
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

// DOM элементы
const addInput = document.getElementById('addInput')
const addBtn = document.getElementById('addBtn')
const tagsContainer = document.getElementById('tagsContainer')
const saveBtn = document.getElementById('saveBtn')
const resetBtn = document.getElementById('resetBtn')
const successMsg = document.getElementById('success')
const hiddenCountEl = document.getElementById('hiddenCount')
const wordCountEl = document.getElementById('wordCount')
const keywordsTextarea = document.getElementById('keywords') // скрытый, для совместимости

// Текущее состояние
let keywords = [...DEFAULT_KEYWORDS]
let keywordStats = {}

// ============================================
// Рендер тегов
// ============================================
function renderTags() {
  tagsContainer.innerHTML = ''

  if (keywords.length === 0) {
    tagsContainer.innerHTML = '<div class="empty-state">Нет ключевых слов</div>'
    wordCountEl.textContent = '0'
    return
  }

  wordCountEl.textContent = keywords.length

  keywords.forEach((keyword) => {
    const count = keywordStats[keyword] || 0

    const tag = document.createElement('div')
    tag.className = 'tag'
    tag.innerHTML = `
      <span class="tag-text">${escapeHtml(keyword)}</span>
      <span class="tag-count ${count === 0 ? 'zero' : ''}">${count}</span>
      <span class="tag-remove" title="Удалить">×</span>
    `

    tag.querySelector('.tag-remove').addEventListener('click', () => {
      removeKeyword(keyword)
    })

    tagsContainer.appendChild(tag)
  })
}

// ============================================
// Экранирование HTML
// ============================================
function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// ============================================
// Добавление ключевого слова
// ============================================
function addKeyword(text) {
  const keyword = text.trim().toLowerCase()

  if (!keyword) return false
  if (keywords.includes(keyword)) {
    addInput.value = ''
    return false
  }

  keywords.push(keyword)
  keywordsTextarea.value = keywords.join('\n')
  renderTags()
  addInput.value = ''
  addInput.focus()

  return true
}

// ============================================
// Удаление ключевого слова
// ============================================
function removeKeyword(keyword) {
  keywords = keywords.filter((k) => k !== keyword)
  keywordsTextarea.value = keywords.join('\n')
  renderTags()
}

// ============================================
// Загрузка сохранённых ключевых слов
// ============================================
function loadKeywords() {
  chrome.storage.sync.get(['keywords'], (result) => {
    if (chrome.runtime.lastError) {
      console.error('[DTF Фильтр] Ошибка загрузки:', chrome.runtime.lastError)
      keywords = [...DEFAULT_KEYWORDS]
    } else if (result.keywords && Array.isArray(result.keywords)) {
      keywords = result.keywords
    }

    keywordsTextarea.value = keywords.join('\n')
    renderTags()
    getStats()
  })
}

// ============================================
// Сохранение ключевых слов
// ============================================
function saveKeywords() {
  chrome.storage.sync.set({ keywords }, () => {
    if (chrome.runtime.lastError) {
      console.error('[DTF Фильтр] Ошибка сохранения:', chrome.runtime.lastError)
      alert('Ошибка сохранения. Попробуйте снова.')
      return
    }

    successMsg.style.display = 'block'
    setTimeout(() => {
      successMsg.style.display = 'none'
    }, 2000)

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) return
      if (tabs[0]?.url?.includes('dtf.ru')) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'UPDATE_KEYWORDS',
          keywords,
        })
      }
    })
  })
}

// ============================================
// Сброс к значениям по умолчанию
// ============================================
function resetKeywords() {
  if (!confirm('Сбросить все слова к значениям по умолчанию?')) return

  keywords = [...DEFAULT_KEYWORDS]
  keywordsTextarea.value = keywords.join('\n')
  keywordStats = {}
  renderTags()
}

// ============================================
// Получение статистики скрытых постов
// ============================================
function getStats() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (chrome.runtime.lastError) return
    if (tabs[0]?.url?.includes('dtf.ru')) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_STATS' }, (response) => {
        if (response) {
          hiddenCountEl.textContent = response.hiddenCount || '—'
          keywordStats = response.keywordStats || {}
          renderTags()
        }
      })
    } else {
      hiddenCountEl.textContent = '—'
      keywordStats = {}
      renderTags()
    }
  })
}

// ============================================
// Обработчики событий
// ============================================
saveBtn.addEventListener('click', saveKeywords)
resetBtn.addEventListener('click', resetKeywords)

addBtn.addEventListener('click', () => {
  addKeyword(addInput.value)
})

addInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    addKeyword(addInput.value)
  }
})

// Ctrl+S для сохранения
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault()
    saveKeywords()
  }
})

// ============================================
// Инициализация
// ============================================
loadKeywords()
