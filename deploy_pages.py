#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
React + TypeScript 84days — GitHub Pages 자동 배포 스크립트 (v2)
- /velog_html_v2 의 day-XX.html 파일을 /docs 로 복사 (없으면 CSV로 최소 HTML 생성)
- CSV에서 제목/날짜를 읽어 index.html(클라이언트 검색) 자동 생성
- --base-url 전달 시 sitemap.xml/robots.txt 생성
- --private 전달 시 모든 HTML에 <meta name="robots" content="noindex, nofollow"> 주입 + robots.txt Disallow

Usage:
  python deploy_pages.py [--commit] [--base-url https://username.github.io/repo] [--private]

Prereq:
  - 루트에 아래 파일/폴더가 존재
    ./react_ts_calendar_D1-D84_full_v2_withVelogBody.csv
    ./velog_html_v2/ (없으면 CSV로부터 간단 HTML 자동 생성)
  - Git이 설정되어 있고, origin/main 사용
"""
import argparse
import csv
import html
import re
import shutil
import subprocess
from datetime import datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent
CSV_PATH = REPO_ROOT / "react_ts_calendar_D1-D84_full_v2_withVelogBody.csv"
SRC_HTML_DIR = REPO_ROOT / "velog_html_v2"
DOCS_DIR = REPO_ROOT / "docs"

def read_days_from_csv(csv_path: Path):
    items = []
    with csv_path.open(encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            day_str = (row.get("Day") or "").strip()
            try:
                day_num = int(day_str.replace("Day","").strip())
            except Exception:
                continue
            title = row.get("VelogTitle") or row.get("Title") or f"Day {day_num}"
            date = row.get("Date","")
            items.append({"day": day_num, "title": title, "date": date})
    items.sort(key=lambda x: x["day"])
    return items

def ensure_docs():
    DOCS_DIR.mkdir(parents=True, exist_ok=True)

def write_html(path: Path, html_text: str, private: bool):
    if private:
        # 주입/치환: <meta name="robots" content="noindex, nofollow">
        if 'name="robots"' in html_text or "name='robots'" in html_text:
            html_text = re.sub(r'<meta\s+name=["\']robots["\']\s+content=["\'][^"\']*["\']\s*/?>',
                               '<meta name="robots" content="noindex, nofollow"/>',
                               html_text, flags=re.IGNORECASE)
        else:
            html_text = re.sub(r'(<head[^>]*>)',
                               r'\1\n  <meta name="robots" content="noindex, nofollow"/>',
                               html_text, count=1, flags=re.IGNORECASE)
    path.write_text(html_text, encoding="utf-8")

def copy_or_generate_html(items, private: bool):
    if SRC_HTML_DIR.exists():
        for day in items:
            n = str(day["day"]).zfill(2)
            src = SRC_HTML_DIR / f"day-{n}.html"
            if src.exists():
                text = src.read_text(encoding="utf-8", errors="ignore")
                write_html(DOCS_DIR / src.name, text, private)
    else:
        for day in items:
            n = str(day["day"]).zfill(2)
            title = html.escape(day["title"])
            date = html.escape(day["date"])
            body = """<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>%s</title>
  <meta name="description" content="%s | React+TypeScript 84일 루틴 | 학습 기간 %s"/>
</head>
<body>
  <h1>%s</h1>
  <p>학습 기간: %s</p>
  <p>본문은 원본 CSV의 VelogBody를 참조하세요.</p>
</body>
</html>""" % (title, title, date, title, date)
            write_html(DOCS_DIR / f"day-{n}.html", body, private)

def generate_index_html(items, private: bool):
    js_rows = []
    for it in items:
        href = f"day-{str(it['day']).zfill(2)}.html"
        text = f"Day {str(it['day']).zfill(2)} — {it['title']}"
        date = it['date']
        js_rows.append('{"href":"%s","text":"%s","date":"%s"}' % (href.replace('"','\\"'), text.replace('"','\\"'), date.replace('"','\\"')))
    titles_js = "[%s]" % (",".join(js_rows))

    robots_meta = '<meta name="robots" content="noindex, nofollow"/>' if private else ""
    index_html = """<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>React + TypeScript 84일 루틴 아카이브</title>
  <meta name="description" content="React + TS 84일 학습 루틴 - Day 1 ~ Day 84 HTML 아카이브"/>
  %s
  <style>
    body { font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Noto Sans KR','Apple SD Gothic Neo',Arial,sans-serif; max-width: 900px; margin: 32px auto; padding: 0 16px; }
    h1 { margin: 0 0 8px; }
    .desc { color:#666;margin-bottom:16px;}
    input { width:100%; padding:10px 12px; border:1px solid #ddd; border-radius:10px; font-size:16px; }
    ul { list-style: none; padding:0; }
    li { margin:10px 0; padding: 12px 14px; border:1px solid #eee; border-radius: 12px; }
    a { text-decoration: none; color:#2563eb; font-weight:600; }
    .muted { color:#666; font-size: 14px; }
  </style>
</head>
<body>
  <h1>React + TypeScript 84일 루틴</h1>
  <p class="desc">Day 01 ~ Day 84 HTML 아카이브. 아래 검색창에 키워드를 입력해 보세요 (예: "Next.js", "Query", "Context").</p>
  <input id="q" type="search" placeholder="제목/파일 검색..." oninput="filter()" />
  <ul id="list"></ul>

  <script>
    const items = %s;
    const list = document.getElementById('list');
    const q = document.getElementById('q');

    function render(arr){
      list.innerHTML = arr.map(it => (
        `<li><a href="${it.href}">${it.text}</a><div class="muted">${it.date}</div></li>`
      )).join('');
    }

    function filter(){
      const term = q.value.toLowerCase().trim();
      if(!term) return render(items);
      render(items.filter(it => it.text.toLowerCase().includes(term) || it.href.toLowerCase().includes(term)));
    }

    render(items);
  </script>
</body>
</html>
""" % (robots_meta, titles_js)
    write_html(DOCS_DIR / "index.html", index_html, private)

def generate_sitemap_and_robots(items, base_url: str, private: bool):
    # robots.txt
    if private:
        (DOCS_DIR / "robots.txt").write_text("User-agent: *\nDisallow: /\n", encoding="utf-8")
        # private 모드에서는 sitemap을 만들지 않음
        if (DOCS_DIR / "sitemap.xml").exists():
            (DOCS_DIR / "sitemap.xml").unlink()
        return

    # public 모드
    if base_url:
        urls = ["%s/day-%s.html" % (base_url.rstrip("/"), str(it['day']).zfill(2)) for it in items]
        now = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        sm = ['<?xml version="1.0" encoding="UTF-8"?>',
              "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">"]
        for u in urls:
            sm.append("  <url><loc>%s</loc><lastmod>%s</lastmod></url>" % (u, now))
        sm.append("</urlset>")
        (DOCS_DIR / "sitemap.xml").write_text("\n".join(sm), encoding="utf-8")
        (DOCS_DIR / "robots.txt").write_text("User-agent: *\nAllow: /\nSitemap: "+base_url.rstrip("/")+"/sitemap.xml\n", encoding="utf-8")

def git_commit_and_push(message: str):
    subprocess.check_call(["git", "add", "docs"])
    subprocess.check_call(["git", "commit", "-m", message])
    subprocess.check_call(["git", "push", "origin", "main"])

def main():
    import sys
    parser = argparse.ArgumentParser()
    parser.add_argument("--commit", action="store_true", help="git add/commit/push까지 자동 실행")
    parser.add_argument("--base-url", type=str, default="", help="사이트 기본 URL (예: https://<user>.github.io/<repo>) — public 모드에서 sitemap/robots 생성")
    parser.add_argument("--private", action="store_true", help="검색엔진 비색인(내부용): 모든 HTML에 noindex, robots.txt Disallow 설정")
    args = parser.parse_args()

    if not CSV_PATH.exists():
        print("CSV가 없습니다:", CSV_PATH)
        sys.exit(1)

    items = read_days_from_csv(CSV_PATH)
    ensure_docs()
    copy_or_generate_html(items, private=args.private)
    generate_index_html(items, private=args.private)
    generate_sitemap_and_robots(items, base_url=args.base_url, private=args.private)

    if args.commit:
        try:
            msg = "deploy: GitHub Pages /docs 업데이트 (private)" if args.private else "deploy: GitHub Pages /docs 업데이트 (public)"
            git_commit_and_push(msg)
            print("✅ git push 완료")
        except subprocess.CalledProcessError as e:
            print("⚠️ git push 실패:", e)

    print("✅ 완료! docs/ 폴더를 Pages 소스로 설정하세요. (Settings → Pages)")
    if args.private:
        print("🔒 private 모드: 검색엔진 비색인 설정이 적용되었습니다. (noindex + robots.txt Disallow)")

if __name__ == "__main__":
    main()
