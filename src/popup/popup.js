// ============================================
// DTF Фильтр — Popup Script
// ============================================
// PRESET_KEYWORDS загружается из presets.js

const SUCCESS_MSG_DELAY = 2000

// DOM элементы
const addInput = document.getElementById('addInput')
const addBtn = document.getElementById('addBtn')
const searchInput = document.getElementById('searchInput')
const searchClear = document.getElementById('searchClear')
const customTagsContainer = document.getElementById('customTagsContainer')
const presetTagsContainer = document.getElementById('presetTagsContainer')
const presetToggle = document.getElementById('presetToggle')
const saveBtn = document.getElementById('saveBtn')
const resetBtn = document.getElementById('resetBtn')
const successMsg = document.getElementById('success')
const warningMsg = document.getElementById('warning')
const hiddenCountEl = document.getElementById('hiddenCount')
const wordCountEl = document.getElementById('wordCount')
const presetCountEl = document.getElementById('presetCount')
const settingsBtn = document.getElementById('settingsBtn')
const settingsModal = document.getElementById('settingsModal')
const modalClose = document.getElementById('modalClose')
const notifyToggle = document.getElementById('notifyToggle')

// Текущее состояние
let customKeywords = []
let disabledPresets = []
let keywordStats = {}
let presetsCollapsed = false
let showNotifications = false
let searchQuery = ''

/**
 * Показывает предупреждение о несохранённых изменениях
 */

/**
 * Проверяет, подходит ли ключевое слово под поисковый запрос
 * @param {string} keyword - Ключевое слово
 * @returns {boolean} Подходит ли под фильтр
 */
function matchesSearch(keyword) {
  if (!searchQuery) return true
  return keyword.toLowerCase().includes(searchQuery.toLowerCase())
}

/**
 * Показывает предупреждение о несохранённых изменениях
 */
function showWarning() {
  warningMsg.style.display = 'block'
}

/**
 * Скрывает предупреждение о несохранённых изменениях
 */
function hideWarning() {
  warningMsg.style.display = 'none'
}

/**
 * Переключает видимость пресетов
 */
function togglePresets() {
  presetsCollapsed = !presetsCollapsed
  presetTagsContainer.classList.toggle('collapsed', presetsCollapsed)
  presetToggle.classList.toggle('collapsed', presetsCollapsed)
  presetToggle.textContent = presetsCollapsed ? '◀' : '▼'

  // Сохраняем состояние
  chrome.storage.local.set({ presetsCollapsed })
}

/**
 * Экранирует специальные символы HTML для защиты от XSS
 * @param {string} text - Исходный текст
 * @returns {string} Экранированный текст
 */
function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * Создаёт DOM-элемент тега
 * @param {string} keyword - Ключевое слово
 * @param {number} count - Счётчик скрытых постов
 * @param {boolean} isPreset - Является ли пресетом
 * @param {boolean} isDisabled - Отключен ли пресет
 * @returns {Element} Элемент тега
 */
function createTagElement(keyword, count, isPreset = false, isDisabled = false) {
  const tag = document.createElement('div')
  tag.className = `tag ${isPreset ? 'preset' : ''} ${isDisabled ? 'disabled' : ''}`

  const removeButton = isDisabled
    ? '<span class="tag-restore" title="Восстановить">+</span>'
    : '<span class="tag-remove" title="Удалить">×</span>'

  tag.innerHTML = `
    <span class="tag-text">${escapeHtml(keyword)}</span>
    <span class="tag-count ${count === 0 ? 'zero' : ''}">${count}</span>
    ${removeButton}
  `

  const actionButton = tag.querySelector(isDisabled ? '.tag-restore' : '.tag-remove')
  actionButton.addEventListener('click', () => {
    if (isPreset) {
      togglePresetKeyword(keyword)
    } else {
      removeCustomKeyword(keyword)
    }
  })

  return tag
}

/**
 * Переключает статус пресета (активен/отключен)
 * @param {string} keyword - Ключевое слово пресета
 */
function togglePresetKeyword(keyword) {
  const index = disabledPresets.indexOf(keyword)
  if (index > -1) {
    // Включаем обратно
    disabledPresets.splice(index, 1)
  } else {
    // Отключаем
    disabledPresets.push(keyword)
  }
  renderPresetTags()
  showWarning()
}

/**
 * Отрисовывает кастомные теги
 */
function renderCustomTags() {
  customTagsContainer.innerHTML = ''

  const filteredKeywords = customKeywords.filter(matchesSearch)

  if (filteredKeywords.length === 0) {
    if (searchQuery) {
      customTagsContainer.innerHTML = '<div class="empty-state">Ничего не найдено</div>'
    } else {
      customTagsContainer.innerHTML = '<div class="empty-state">Нет добавленных слов</div>'
    }
    return
  }

  filteredKeywords.forEach((keyword) => {
    const count = keywordStats[keyword] || 0
    const tag = createTagElement(keyword, count, false, false)
    customTagsContainer.appendChild(tag)
  })

  updateWordCount()
}

/**
 * Отрисовывает предустановленные теги
 */
function renderPresetTags() {
  presetTagsContainer.innerHTML = ''

  const filteredPresets = PRESET_KEYWORDS.filter(matchesSearch)

  filteredPresets.forEach((keyword) => {
    const isDisabled = disabledPresets.includes(keyword)
    const count = keywordStats[keyword] || 0
    const tag = createTagElement(keyword, count, true, isDisabled)
    presetTagsContainer.appendChild(tag)
  })

  const activePresetsCount = PRESET_KEYWORDS.length - disabledPresets.length
  presetCountEl.textContent = `${activePresetsCount}/${PRESET_KEYWORDS.length}`
  updateWordCount()
}

/**
 * Обновляет счётчик слов в интерфейсе
 */
function updateWordCount() {
  const activePresetsCount = PRESET_KEYWORDS.length - disabledPresets.length
  wordCountEl.textContent = customKeywords.length + activePresetsCount
}

/**
 * Добавляет новое ключевое слово
 * @param {string} text - Текст для добавления
 * @returns {boolean} Успешно ли добавлено
 */
function addKeyword(text) {
  const keyword = text.trim().toLowerCase()

  if (!keyword) return false
  if (customKeywords.includes(keyword)) {
    addInput.value = ''
    return false
  }

  customKeywords.unshift(keyword)
  renderCustomTags()
  addInput.value = ''
  addInput.focus()
  showWarning()

  return true
}

/**
 * Удаляет кастомное ключевое слово
 * @param {string} keyword - Слово для удаления
 */
function removeCustomKeyword(keyword) {
  customKeywords = customKeywords.filter((k) => k !== keyword)
  renderCustomTags()
  showWarning()
}

/**
 * Открывает модальное окно настроек
 */
function openSettings() {
  settingsModal.classList.add('open')
}

/**
 * Закрывает модальное окно настроек
 */
function closeSettings() {
  settingsModal.classList.remove('open')
}

/**
 * Переключает настройку уведомлений
 */
function toggleNotification() {
  showNotifications = notifyToggle.checked
  chrome.storage.local.set({ showNotifications })
}

/**
 * Загружает сохранённые данные из chrome.storage
 */
function loadKeywords() {
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

    renderCustomTags()
    renderPresetTags()
    hideWarning()
    getStats()
  })

  // Загружаем состояние свернутости пресетов и уведомлений
  chrome.storage.local.get(['presetsCollapsed', 'showNotifications'], (result) => {
    if (result.presetsCollapsed) {
      presetsCollapsed = true
      presetTagsContainer.classList.add('collapsed')
      presetToggle.classList.add('collapsed')
      presetToggle.textContent = '◀'
    }
    if (result.showNotifications) {
      showNotifications = result.showNotifications
      notifyToggle.checked = showNotifications
    }
  })
}

/**
 * Сохраняет ключевые слова в chrome.storage и обновляет фильтрацию на вкладке
 */
function saveKeywords() {
  chrome.storage.sync.set({ customKeywords, disabledPresets }, () => {
    if (chrome.runtime.lastError) {
      console.error('[DTF Фильтр] Ошибка сохранения:', chrome.runtime.lastError)
      alert('Ошибка сохранения. Попробуйте снова.')
      return
    }

    hideWarning()
    successMsg.style.display = 'block'
    setTimeout(() => {
      successMsg.style.display = 'none'
    }, SUCCESS_MSG_DELAY)

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError || !tabs[0]) return
      if (tabs[0].url?.includes('dtf.ru')) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'UPDATE_KEYWORDS',
          customKeywords,
          disabledPresets,
        }, () => {
          // Игнорируем ошибку если content script не готов
          if (chrome.runtime.lastError) {
            // Content script ещё не загружен — это нормально
          }
        })
      }
    })
  })
}

/**
 * Сбрасывает все кастомные слова и восстанавливает пресеты
 */
function resetKeywords() {
  if (!confirm('Удалить все добавленные слова и восстановить пресеты?')) return

  customKeywords = []
  disabledPresets = []
  keywordStats = {}
  renderCustomTags()
  renderPresetTags()
  showWarning()
}

/**
 * Получает статистику скрытых постов с активной вкладки
 */
function getStats() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (chrome.runtime.lastError || !tabs[0]) {
      hiddenCountEl.textContent = '—'
      return
    }
    if (tabs[0].url?.includes('dtf.ru')) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_STATS' }, (response) => {
        if (chrome.runtime.lastError) {
          // Content script не готов — игнорируем
          hiddenCountEl.textContent = '—'
          return
        }
        if (response) {
          hiddenCountEl.textContent = response.hiddenCount || '—'
          keywordStats = response.keywordStats || {}
          renderCustomTags()
          renderPresetTags()
        }
      })
    } else {
      hiddenCountEl.textContent = '—'
      keywordStats = {}
      renderCustomTags()
      renderPresetTags()
    }
  })
}

// ============================================
// Обработчики событий
// ============================================
saveBtn.addEventListener('click', saveKeywords)
resetBtn.addEventListener('click', resetKeywords)
presetToggle.addEventListener('click', togglePresets)
settingsBtn.addEventListener('click', openSettings)
modalClose.addEventListener('click', closeSettings)
settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) closeSettings()
})
notifyToggle.addEventListener('change', toggleNotification)

addBtn.addEventListener('click', () => {
  addKeyword(addInput.value)
})

addInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    addKeyword(addInput.value)
  }
})

// Поиск по тегам
searchInput.addEventListener('input', (e) => {
  searchQuery = e.target.value.trim()
  searchClear.classList.toggle('visible', searchQuery.length > 0)

  // Раскрываем секции при поиске, возвращаем состояние при очистке
  if (searchQuery.length > 0) {
    presetTagsContainer.classList.remove('collapsed')
  } else {
    presetTagsContainer.classList.toggle('collapsed', presetsCollapsed)
  }

  renderCustomTags()
  renderPresetTags()
})

searchClear.addEventListener('click', () => {
  searchQuery = ''
  searchInput.value = ''
  searchClear.classList.remove('visible')

  // Возвращаем состояние свернутости пресетов
  presetTagsContainer.classList.toggle('collapsed', presetsCollapsed)

  renderCustomTags()
  renderPresetTags()
  searchInput.focus()
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
