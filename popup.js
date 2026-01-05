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

const keywordsTextarea = document.getElementById('keywords')
const saveBtn = document.getElementById('saveBtn')
const resetBtn = document.getElementById('resetBtn')
const successMsg = document.getElementById('success')
const hiddenCountEl = document.getElementById('hiddenCount')

// ============================================
// Загрузка сохранённых ключевых слов
// ============================================
function loadKeywords() {
  chrome.storage.sync.get(['keywords'], (result) => {
    if (chrome.runtime.lastError) {
      console.error('[DTF Фильтр] Ошибка загрузки:', chrome.runtime.lastError)
      keywordsTextarea.value = DEFAULT_KEYWORDS.join('\n')
      return
    }
    const keywords = result.keywords || DEFAULT_KEYWORDS
    keywordsTextarea.value = keywords.join('\n')
  })
}

// ============================================
// Сохранение ключевых слов
// ============================================
function saveKeywords() {
  const text = keywordsTextarea.value
  const keywords = text
    .split('\n')
    .map((k) => k.trim())
    .filter((k) => k.length > 0)

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
  keywordsTextarea.value = DEFAULT_KEYWORDS.join('\n')
}

// ============================================
// Получение статистики скрытых постов
// ============================================
function getStats() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].url.includes('dtf.ru')) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_STATS' }, (response) => {
        if (response && response.hiddenCount !== undefined) {
          hiddenCountEl.textContent = response.hiddenCount
        }
      })
    }
  })
}

// ============================================
// Обработчики событий
// ============================================
saveBtn.addEventListener('click', saveKeywords)
resetBtn.addEventListener('click', resetKeywords)

keywordsTextarea.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault()
    saveKeywords()
  }
})

// ============================================
// Инициализация
// ============================================
loadKeywords()
getStats()
