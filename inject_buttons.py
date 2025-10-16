#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import re
from pathlib import Path

DEFAULT_STYLE = (
    "display:inline-block;"
    "margin:10px 0 18px;"
    "padding:8px 14px;"
    "background:#2563eb;"
    "color:#fff;"
    "border-radius:8px;"
    "text-decoration:none;"
    "font-weight:600;"
)

MARKER = "<!--__BACK_TO_INDEX_BUTTON__-->"

def inject_into_html(html_text, label, style):
    if MARKER in html_text:
        return html_text

    snippet = (
        f'{MARKER}\n'
        f'<a href="index.html" style="{style}">'
        f'← {label}'
        f'</a>\n'
    )

    pattern = re.compile(r"<body[^>]*>", re.IGNORECASE)
    m = pattern.search(html_text)
    if not m:
        return html_text

    insert_pos = m.end()
    return html_text[:insert_pos] + "\n" + snippet + html_text[insert_pos:]

def patch_folder(folder, label, style):
    if not folder.exists() or not folder.is_dir():
        return 0
    count = 0
    for p in sorted(folder.glob("day-*.html")):
        try:
            text = p.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            text = p.read_text(errors="ignore")
        new_text = inject_into_html(text, label, style)
        if new_text != text:
            p.write_text(new_text, encoding="utf-8")
            count += 1
    return count

dirs = ["docs", "docs_private_noindex"]
label = "목록으로 돌아가기"
total = 0

for d in dirs:
    count = patch_folder(Path(d), label, DEFAULT_STYLE)
    print(f"[{d}] patched {count} files")
    total += count

if total == 0:
    print("No changes (already patched or folders not found).")
else:
    print(f"✅ Done. Injected back button into {total} files.")
