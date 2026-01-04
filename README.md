# 🚫 DTF Фильтр розыгрышей

Расширение для Google Chrome, которое автоматически скрывает посты с розыгрышами, конкурсами и раздачами на сайте [DTF.ru](https://dtf.ru).

## Возможности

- **Автоматическая фильтрация** — посты скрываются при загрузке и при скролле (infinite scroll)
- **Гибкая настройка** — добавляй и удаляй ключевые слова через popup-меню
- **Не удаляет посты** — скрытые посты можно развернуть кликом по плашке
- **60+ ключевых слов** — из коробки фильтрует большинство розыгрышей

## Скриншоты

| Скрытый пост                      | Popup настроек                  |
| --------------------------------- | ------------------------------- |
| ![hidden](screenshots/hidden.png) | ![popup](screenshots/popup.png) |

## Установка

1. Скачай или клонируй репозиторий
2. Открой `chrome://extensions/`
3. Включи **«Режим разработчика»** (переключатель справа сверху)
4. Нажми **«Загрузить распакованное расширение»**
5. Выбери папку с расширением

## Использование

После установки расширение работает автоматически на всех страницах DTF.

**Настройка ключевых слов:**

1. Кликни на иконку расширения в панели браузера
2. Отредактируй список слов (по одному на строку)
3. Нажми «Сохранить»

## Структура проекта

```
dtf-filter/
├── manifest.json    # Конфигурация расширения (Manifest V3)
├── content.js       # Логика фильтрации постов
├── popup.html       # Интерфейс настроек
├── popup.js         # Скрипт popup-меню
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

A Google Chrome extension that automatically hides giveaway, contest, and raffle posts on [DTF.ru](https://dtf.ru) — a popular Russian gaming and entertainment platform.

## Features

- **Automatic filtering** — posts are hidden on page load and during infinite scroll
- **Customizable keywords** — add or remove filter words via popup menu
- **Non-destructive** — hidden posts can be revealed with a single click
- **60+ keywords** — filters most giveaways out of the box

## Screenshots

| Hidden post                       | Settings popup                  |
| --------------------------------- | ------------------------------- |
| ![hidden](screenshots/hidden.png) | ![popup](screenshots/popup.png) |

## Installation

1. Download or clone this repository
2. Open `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top right corner)
4. Click **Load unpacked**
5. Select the extension folder

## Usage

The extension works automatically on all DTF pages after installation.

**Customizing keywords:**

1. Click the extension icon in the browser toolbar
2. Edit the keyword list (one word per line)
3. Click «Сохранить» (Save)

## Project Structure

```
dtf-filter/
├── manifest.json    # Extension config (Manifest V3)
├── content.js       # Post filtering logic
├── popup.html       # Settings UI
├── popup.js         # Popup script
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

Full list available in `content.js`.

## License

MIT
