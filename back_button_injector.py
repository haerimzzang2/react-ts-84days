#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
back_button_injector.py
- Adds a "← 목록으로 돌아가기" (Back to list) button to each day-XX.html
- Works for both /docs and /docs_private_noindex (or custom paths)
- Idempotent: won't insert duplicates

Usage examples:
  python back_button_injector.py                 # patch ./docs and ./docs_private_noindex
  python back_button_injector.py --dirs docs     # patch only ./docs
  python back_button_injector.py --dirs public_folder private_folder
  python back_button_injector.py --label "Back"  # custom button label
  python back_button_injector.py --style "..."   # custom inline style

Notes:
- The script injects after the first <body> tag.
- It checks for a marker comment to avoid duplication.
"""

import re
from pathlib import Path
import argparse

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

def inject_into_html(html_text: str, label: str, style: str) -> str:
    if MARKER in html_text:
        return html_text  # already injected

    # Prepare snippet
    snippet = (
        f'{MARKER}\n'
        f'<a href="index.html" style="{style}">'
        f'← {label}'
        f'</a>\n'
    )

    # Inject right after <body ...>
    pattern = re.compile(r"<body[^>]*>", re.IGNORECASE)
    m = pattern.search(html_text)
    if not m:
        return html_text  # skip if no body

    insert_pos = m.end()
    return html_text[:insert_pos] + "\n" + snippet + html_text[insert_pos:]

def patch_folder(folder: Path, label: str, style: str) -> int:
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
    # Also patch index.html (top navigation back to itself isn't necessary, so we skip)
    return count

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dirs", nargs="+", default=["docs", "docs_private_noindex"],
                    help="folders to patch (default: docs docs_private_noindex)")
    ap.add_argument("--label", default="목록으로 돌아가기", help="button label text")
    ap.add_argument("--style", default=DEFAULT_STYLE, help="inline CSS style")
    args = ap.parse_args()

    total = 0
    for d in args.dirs:
        count = patch_folder(Path(d), args.label, args.style)
        print(f"[{d}] patched {count} files")
        total += count

    if total == 0:
        print("No changes (already patched or folders not found).")
    else:
        print(f"✅ Done. Injected back button into {total} files.")

if __name__ == "__main__":
    main()
