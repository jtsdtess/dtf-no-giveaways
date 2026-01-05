# 🚫 DTF Фильтр розыгрышей

Расширение для Google Chrome, которое автоматически скрывает посты с розыгрышами, конкурсами и раздачами на сайте [DTF.ru](https://dtf.ru).

## Возможности

- **Автоматическая фильтрация** — посты скрываются при загрузке и при скролле (infinite scroll)
- **Визуальные теги** — управление словами через интерактивные теги с счётчиками скрытых постов
- **Предустановленные слова** — ~90 слов из коробки, можно отключать индивидуально
- **Кастомные слова** — добавляй свои слова для фильтрации
- **Не удаляет посты** — скрытые посты можно развернуть кликом по плашке

## Скриншоты

| Скрытый пост                           | Popup настроек                      |
| -------------------------------------- | ----------------------------------- |
| ![hidden](assets/screenshots/hidden.png) | ![popup](assets/screenshots/popup.png) |

## Установка

1. Скачай или клонируй репозиторий
2. Открой `chrome://extensions/`
3. Включи **«Режим разработчика»**
4. Нажми **«Загрузить распакованное расширение»**
5. Выбери папку с расширением

## Использование

После установки расширение работает автоматически на всех страницах DTF.

**Настройка слов:**

1. Кликни на иконку расширения
2. В поле ввода введи слово и нажми Enter или «+ Добавить»
3. Для отключения пресета нажми × на зелёном теге
4. Для восстановления пресета нажми + на сером теге
5. Нажми «Сохранить» для применения изменений

**Горячие клавиши:**
- `Ctrl+S` — сохранить изменения

## Структура проекта

```
dtf-filter/
├── manifest.json           # Конфигурация расширения (Manifest V3)
├── src/
│   ├── content/
│   │   ├── content.js      # Логика фильтрации постов
│   │   └── presets.js      # Предустановленные слова
│   └── popup/
│       ├── popup.html      # Интерфейс настроек
│       ├── popup.js        # Скрипт popup
│       └── popup.css       # Стили popup
├── assets/
│   └── screenshots/        # Скриншоты
└── README.md
```

## Как это работает

1. `content.js` инжектится на страницы DTF
2. При загрузке сканируются все посты на наличие ключевых слов
3. `MutationObserver` отслеживает появление новых постов при скролле
4. Найденные посты скрываются и заменяются кликабельной плашкой

## Лицензия

MIT

---

# 🚫 DTF Giveaway Filter

A Google Chrome extension that automatically hides giveaway, contest, and raffle posts on [DTF.ru](https://dtf.ru).

## Features

- **Automatic filtering** — posts are hidden on page load and during infinite scroll
- **Visual tag UI** — manage keywords via interactive tags with hidden post counters
- **Preset keywords** — ~90 built-in words, individually toggleable
- **Custom keywords** — add your own filter words
- **Non-destructive** — hidden posts can be revealed with a single click

## Screenshots

| Hidden post                              | Settings popup                      |
| ---------------------------------------- | ----------------------------------- |
| ![hidden](assets/screenshots/hidden.png) | ![popup](assets/screenshots/popup.png) |

## Installation

1. Download or clone this repository
2. Open `chrome://extensions/`
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select the extension folder

## Usage

The extension works automatically on all DTF pages after installation.

**Customizing keywords:**

1. Click the extension icon
2. Type a word and press Enter or click «+ Добавить»
3. To disable a preset, click × on a green tag
4. To restore a preset, click + on a gray tag
5. Click «Сохранить» to apply changes

**Keyboard shortcuts:**
- `Ctrl+S` — save changes

## Project Structure

```
dtf-filter/
├── manifest.json           # Extension config (Manifest V3)
├── src/
│   ├── content/
│   │   ├── content.js      # Post filtering logic
│   │   └── presets.js      # Preset keywords
│   └── popup/
│       ├── popup.html      # Settings UI
│       ├── popup.js        # Popup script
│       └── popup.css       # Popup styles
├── assets/
│   └── screenshots/        # Screenshots
└── README.md
```

## How It Works

1. `content.js` is injected into DTF pages
2. On load, all posts are scanned for matching keywords
3. `MutationObserver` watches for new posts during scrolling
4. Matched posts are hidden and replaced with a clickable placeholder

## Default Keywords

The extension filters posts containing (case-insensitive):

| Russian                       | English                   |
| ----------------------------- | ------------------------- |
| розыгрыш, раздача, конкурс    | giveaway, contest, raffle |
| приз, выиграй, выиграть       | win a, chance to win      |
| для участия, условия конкурса | enter to win, free stuff  |

Full list available in `src/content/presets.js`.

## License

MIT
