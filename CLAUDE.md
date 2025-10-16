# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React + TypeScript 84-day learning routine starter pack designed for Korean learners. The repository generates and manages content for:
- Notion calendar imports (CSV format)
- GitHub Pages deployment (public and private/noindex versions)
- Velog synchronization

The project is primarily Python-based for content generation and deployment, with the actual learning content being HTML files for each day (day-01.html through day-84.html).

## Repository Structure

```
react-ts-84days/
├── data/                          # Notion calendar import CSV files
│   └── react_ts_calendar_D1-D84_full_v2_withVelogBody.csv
├── notion/                        # Notion page bulk import ZIP
│   └── notion_md_v2_day01-84.zip
├── docs/                          # GitHub Pages public content (84 day-XX.html files + index)
├── docs_private_noindex/          # GitHub Pages private content (noindex, 84 day-XX.html files)
├── html/                          # Empty working directory
├── back_button_injector.py        # Injects "← 목록으로 돌아가기" buttons into day-XX.html files
├── sync_notion_velog.py           # CSV → Notion/Docs synchronization (placeholder)
└── deploy_pages.py                # GitHub Pages deployment (placeholder)
```

## Key Scripts and Commands

### Back Button Injection
The `back_button_injector.py` script adds navigation buttons to HTML files:

```bash
# Patch both docs and docs_private_noindex (default)
python back_button_injector.py

# Patch only specific directories
python back_button_injector.py --dirs docs

# Patch multiple directories
python back_button_injector.py --dirs docs docs_private_noindex

# Custom button label
python back_button_injector.py --label "Back"

# Custom inline style
python back_button_injector.py --style "display:inline-block;margin:10px;..."
```

**How it works:**
- Targets all `day-*.html` files in specified directories
- Injects a back button after the first `<body>` tag
- Idempotent: uses `<!--__BACK_TO_INDEX_BUTTON__-->` marker to prevent duplicates
- Default button: "← 목록으로 돌아가기" with blue styling

### Deployment and Sync (Placeholders)
```bash
# Deploy to GitHub Pages
python deploy_pages.py

# Sync CSV to Notion/Docs
python sync_notion_velog.py
```

**Note:** These are currently placeholder scripts that print usage instructions.

## Content Architecture

### HTML Day Files
Each `day-XX.html` (01-84) follows this structure:
- Title: "🧠 Day X — React & TypeScript 실전 루틴"
- Meta description with date
- Learning objectives (학습 기간)
- Sections:
  - 🎯 오늘의 목표 (Today's goals)
  - 🎥 참고 자료 (References to MDN, Notion)
  - 💻 실습 코드 (Practice code in TypeScript)
  - ✅ 체크리스트 (Checklist)
  - 📝 오늘의 회고 (Reflection)

### Dual Deployment Strategy
- `docs/`: Public GitHub Pages with search indexing
- `docs_private_noindex/`: Private GitHub Pages without search indexing (for internal use)

Both directories contain identical sets of 84 HTML files but serve different audiences.

## Development Workflow

1. **Modifying HTML Content:**
   - Edit files in `docs/` and/or `docs_private_noindex/` directly
   - Ensure both directories stay in sync if changes apply to both

2. **Adding Navigation:**
   - Run `back_button_injector.py` after creating or modifying day HTML files
   - Script automatically detects and patches only unpatchted files

3. **Data Updates:**
   - Modify CSV in `data/` directory
   - Use `sync_notion_velog.py` to propagate changes (when implemented)

4. **Deployment:**
   - Use `deploy_pages.py` to publish to GitHub Pages (when implemented)

## Git Workflow

Current branch: `main`
Recent commits show:
- 상단바 추가 (Top bar added)
- 루틴 추가 (Routine added)
- init (Initial setup)

When committing:
- Use Korean commit messages for consistency with existing commits
- Focus on content/script changes rather than generated HTML
