// ============================================
// DTF Фильтр — Popup Script
// ============================================
// PRESET_KEYWORDS загружается из presets.js

// DOM элементы
const addInput = document.getElementById('addInput')
const addBtn = document.getElementById('addBtn')
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
const keywordsTextarea = document.getElementById('keywords')

// Текущее состояние
let customKeywords = []
let disabledPresets = [] // Отключенные предустановленные слова
let keywordStats = {}
let hasUnsavedChanges = false
let presetsCollapsed = false

// ============================================
// Показать/скрыть предупреждение о сохранении
// ============================================
function showWarning() {
  hasUnsavedChanges = true
  warningMsg.style.display = 'block'
}

function hideWarning() {
  hasUnsavedChanges = false
  warningMsg.style.display = 'none'
}

// ============================================
// Переключение видимости пресетов
// ============================================
function togglePresets() {
  presetsCollapsed = !presetsCollapsed
  presetTagsContainer.classList.toggle('collapsed', presetsCollapsed)
  presetToggle.classList.toggle('collapsed', presetsCollapsed)
  presetToggle.textContent = presetsCollapsed ? '◀' : '▼'

  // Сохраняем состояние
  chrome.storage.local.set({ presetsCollapsed })
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
// Создание элемента тега
// ============================================
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

// ============================================
// Переключение пресета (включить/отключить)
// ============================================
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

// ============================================
// Рендер кастомных тегов
// ============================================
function renderCustomTags() {
  customTagsContainer.innerHTML = ''

  if (customKeywords.length === 0) {
    customTagsContainer.innerHTML = '<div class="empty-state">Нет добавленных слов</div>'
    return
  }

  customKeywords.forEach((keyword) => {
    const count = keywordStats[keyword] || 0
    const tag = createTagElement(keyword, count, false, false)
    customTagsContainer.appendChild(tag)
  })

  updateWordCount()
}

// ============================================
// Рендер предустановленных тегов
// ============================================
function renderPresetTags() {
  presetTagsContainer.innerHTML = ''

  PRESET_KEYWORDS.forEach((keyword) => {
    const isDisabled = disabledPresets.includes(keyword)
    const count = keywordStats[keyword] || 0
    const tag = createTagElement(keyword, count, true, isDisabled)
    presetTagsContainer.appendChild(tag)
  })

  const activePresetsCount = PRESET_KEYWORDS.length - disabledPresets.length
  presetCountEl.textContent = `${activePresetsCount}/${PRESET_KEYWORDS.length}`
  updateWordCount()
}

// ============================================
// Обновление счётчика слов
// ============================================
function updateWordCount() {
  const activePresetsCount = PRESET_KEYWORDS.length - disabledPresets.length
  wordCountEl.textContent = customKeywords.length + activePresetsCount
}

// ============================================
// Добавление ключевого слова
// ============================================
function addKeyword(text) {
  const keyword = text.trim().toLowerCase()

  if (!keyword) return false
  if (customKeywords.includes(keyword)) {
    addInput.value = ''
    return false
  }

  customKeywords.unshift(keyword)
  keywordsTextarea.value = customKeywords.join('\n')
  renderCustomTags()
  addInput.value = ''
  addInput.focus()
  showWarning()

  return true
}

// ============================================
// Удаление кастомного слова
// ============================================
function removeCustomKeyword(keyword) {
  customKeywords = customKeywords.filter((k) => k !== keyword)
  keywordsTextarea.value = customKeywords.join('\n')
  renderCustomTags()
  showWarning()
}

// ============================================
// Загрузка сохранённых данных
// ============================================
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

    keywordsTextarea.value = customKeywords.join('\n')
    renderCustomTags()
    renderPresetTags()
    hideWarning()
    getStats()
  })

  // Загружаем состояние свернутости пресетов
  chrome.storage.local.get(['presetsCollapsed'], (result) => {
    if (result.presetsCollapsed) {
      presetsCollapsed = true
      presetTagsContainer.classList.add('collapsed')
      presetToggle.classList.add('collapsed')
      presetToggle.textContent = '◀'
    }
  })
}

// ============================================
// Сохранение ключевых слов
// ============================================
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
    }, 2000)

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) return
      if (tabs[0]?.url?.includes('dtf.ru')) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'UPDATE_KEYWORDS',
          customKeywords,
          disabledPresets,
        })
      }
    })
  })
}

// ============================================
// Сброс кастомных слов
// ============================================
function resetKeywords() {
  if (!confirm('Удалить все добавленные слова и восстановить пресеты?')) return

  customKeywords = []
  disabledPresets = []
  keywordsTextarea.value = ''
  keywordStats = {}
  renderCustomTags()
  renderPresetTags()
  showWarning()
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
