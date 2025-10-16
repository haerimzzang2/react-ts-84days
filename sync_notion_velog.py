#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
sync_notion_velog.py — CSV 기반으로 Notion/Velog/HTML/Docs를 갱신하는 간단 동기화 스크립트
Usage:
  python sync_notion_velog.py [--private] [--commit]

Prereq:
  - ./data/react_ts_calendar_D1-D84_full_v2_withVelogBody.csv 존재
  - git remote/origin 설정
"""
import argparse, csv, html, os, re, shutil, subprocess, zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CSV_PATH = ROOT / "data" / "react_ts_calendar_D1-D84_full_v2_withVelogBody.csv"
NOTION_OUT = ROOT / "notion"
HTML_OUT = ROOT / "html"
DOCS_DIR = ROOT / "docs"
VELOG_HTML_SRC = ROOT / "velog_html_v2"  # 선택: 기존 생성본이 있다면 우선 사용

def read_rows():
    items = []
    with CSV_PATH.open(encoding="utf-8") as f:
        r = csv.DictReader(f)
        for row in r:
            items.append(row)
    return items

def ensure_dirs():
    NOTION_OUT.mkdir(parents=True, exist_ok=True)
    HTML_OUT.mkdir(parents=True, exist_ok=True)
    DOCS_DIR.mkdir(parents=True, exist_ok=True)

def build_notion_zip(rows):
    tmpdir = ROOT / "_notion_tmp"
    if tmpdir.exists():
        shutil.rmtree(tmpdir)
    tmpdir.mkdir()
    for row in rows:
        day_str = (row.get("Day") or "Day ?").strip()
        try:
            n = int(day_str.replace("Day","").strip())
        except:
            continue
        title = (row.get("VelogTitle") or row.get("Title") or f"Day {n}").strip()
        body = (row.get("VelogBody") or "").rstrip()
        date = (row.get("Date") or "").strip()
        notion_link = (row.get("NotionLink") or "").strip()
        safe_title = (row.get("Title") or f"Day {n}").replace("/", "／")
        md_name = tmpdir / f"Day {n:02d} — {safe_title}.md"
        header = f"# {title}\n\n> 날짜: **{date}**  \n> 루틴: React + TypeScript 84일 학습  \n> 노션: {notion_link}\n\n---\n\n"
        md_name.write_text(header + body + "\n", encoding="utf-8")
    outzip = NOTION_OUT / "notion_md_from_csv.zip"
    with zipfile.ZipFile(outzip, "w", compression=zipfile.ZIP_DEFLATED) as z:
        for f in sorted(tmpdir.glob("*.md")):
            z.write(f, arcname=f.name)
    shutil.rmtree(tmpdir)
    return outzip

def md_to_pre_html(md: str) -> str:
    return "<pre>" + html.escape(md) + "</pre>"

def add_noindex(html_text: str) -> str:
    if 'name="robots"' in html_text or "name='robots'" in html_text:
        return re.sub(r'<meta\s+name=["\']robots["\']\s+content=["\'][^"\']*["\']\s*/?>',
                      '<meta name="robots" content="noindex, nofollow"/>',
                      html_text, flags=re.IGNORECASE)
    return re.sub(r'(<head[^>]*>)', r'\1\n  <meta name="robots" content="noindex, nofollow"/>',
                  html_text, count=1, flags=re.IGNORECASE)

def build_docs(rows, private=False):
    # priority: existing velog_html_v2 -> else generate minimal from CSV
    if DOCS_DIR.exists():
        for f in DOCS_DIR.glob("*"):
            f.unlink()
    else:
        DOCS_DIR.mkdir(parents=True, exist_ok=True)

    # Generate each day html
    for row in rows:
        day_str = (row.get("Day") or "Day ?").strip()
        try:
            n = int(day_str.replace("Day","").strip())
        except:
            continue
        title = (row.get("VelogTitle") or row.get("Title") or f"Day {n}").strip()
        date = (row.get("Date") or "").strip()
        body_md = (row.get("VelogBody") or "")
        body_html = md_to_pre_html(body_md)
        page = f"""<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>{html.escape(title)}</title>
  <meta name="description" content="{html.escape(title)} | React+TypeScript 84일 루틴 | 학습 기간 {html.escape(date)}"/>
</head>
<body>
  <h1>{html.escape(title)}</h1>
  <div class="meta">학습 기간: <b>{html.escape(date)}</b></div>
  {body_html}
</body>
</html>"""
        if private:
            page = add_noindex(page)
        (DOCS_DIR / f"day-{n:02d}.html").write_text(page, encoding="utf-8")

    # Build index with simple search
    items_js = []
    for row in rows:
        day_str = (row.get("Day") or "Day ?").strip()
        try:
            n = int(day_str.replace("Day","").strip())
        except:
            continue
        t = (row.get("VelogTitle") or row.get("Title") or f"Day {n}").replace('"','\\"')
        d = (row.get("Date") or "")
        items_js.append(f'{{"href":"day-{n:02d}.html","text":"Day {n:02d} — {t}","date":"{d}"}}')
    robots_meta = '<meta name="robots" content="noindex, nofollow"/>' if private else ''
    index_html = f"""<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>React + TypeScript 84일 루틴 아카이브</title>
  {robots_meta}
  <style>body{{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Noto Sans KR',Arial,sans-serif;max-width:900px;margin:32px auto;padding:0 16px}}input{{width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:10px}}</style>
</head>
<body>
  <h1>React + TypeScript 84일 루틴</h1>
  <input id="q" type="search" placeholder="제목/파일 검색..." oninput="filter()" />
  <ul id="list"></ul>
  <script>
    const items=[{",".join(items_js)}];
    const list=document.getElementById('list');const q=document.getElementById('q');
    function render(arr){{list.innerHTML=arr.map(it=>`<li><a href="${{it.href}}">${{it.text}}</a> <small>${{it.date}}</small></li>`).join('')}}
    function filter(){{const t=q.value.toLowerCase().trim();if(!t)return render(items);render(items.filter(it=>it.text.toLowerCase().includes(t)||it.href.toLowerCase().includes(t)))}}
    render(items);
  </script>
</body>
</html>"""
    if private:
        index_html = add_noindex(index_html)
    (DOCS_DIR / "index.html").write_text(index_html, encoding="utf-8")

def maybe_git_commit(message: str):
    try:
        subprocess.check_call(["git","add","docs"])
        subprocess.check_call(["git","commit","-m",message])
        subprocess.check_call(["git","push","origin","main"])
        print("✅ git push 완료")
    except Exception as e:
        print("⚠️ git push 실패:", e)

def main():
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--private", action="store_true", help="검색엔진 비색인 (noindex + robots Disallow)")
    p.add_argument("--commit", action="store_true", help="docs 변경 커밋/푸시까지 자동")
    args = p.parse_args()

    rows = read_rows()
    ensure_dirs()

    # 1) Notion md 재생성(zip)
    notion_zip = build_notion_zip(rows)
    print("🧩 Notion ZIP 갱신:", notion_zip)

    # 2) docs (HTML) 재생성
    build_docs(rows, private=args.private)
    # robots.txt
    (DOCS_DIR / "robots.txt").write_text("User-agent: *\nDisallow: /\n" if args.private else "User-agent: *\nAllow: /\n", encoding="utf-8")
    print("🌐 docs 갱신:", DOCS_DIR)

    if args.commit:
        maybe_git_commit("sync: docs updated (private)" if args.private else "sync: docs updated (public)")

if __name__ == "__main__":
    main()
