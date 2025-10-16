#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// CSV 파일 경로
const csvPath = process.argv[2] || "C:\\Users\\user\\Downloads\\9a7ad7a3-c1fb-49fc-af7c-57693da57eff_ExportBlock-97f8ebb6-86b8-441a-a286-d1cafe1729e1\\ExportBlock-97f8ebb6-86b8-441a-a286-d1cafe1729e1-Part-1\\일정 28d811fbadda80e89d9aedc9c4b4dc5a_all.csv";

// CSV를 간단히 파싱하는 함수 (복잡한 CSV 처리)
function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const headers = parseCSVLine(lines[0]);
    const records = [];

    let i = 1;
    while (i < lines.length) {
        if (!lines[i].trim()) {
            i++;
            continue;
        }

        const record = {};
        let currentLine = lines[i];
        let fieldIndex = 0;

        // 한 레코드를 파싱 (여러 줄에 걸쳐 있을 수 있음)
        while (fieldIndex < headers.length) {
            const header = headers[fieldIndex];
            let value = '';

            // 큰따옴표로 시작하는 필드
            if (currentLine.startsWith('"')) {
                currentLine = currentLine.substring(1);
                let endFound = false;

                while (!endFound) {
                    const quoteIndex = currentLine.indexOf('"');
                    if (quoteIndex === -1) {
                        // 다음 줄로 계속
                        value += currentLine + '\n';
                        i++;
                        if (i >= lines.length) break;
                        currentLine = lines[i];
                    } else {
                        // 따옴표 발견
                        value += currentLine.substring(0, quoteIndex);
                        currentLine = currentLine.substring(quoteIndex + 1);

                        // 다음 문자가 콤마 또는 줄 끝인지 확인
                        if (currentLine.startsWith(',') || currentLine.trim() === '') {
                            endFound = true;
                            if (currentLine.startsWith(',')) {
                                currentLine = currentLine.substring(1);
                            }
                        } else if (currentLine.startsWith('"')) {
                            // 이스케이프된 따옴표 ("")
                            value += '"';
                            currentLine = currentLine.substring(1);
                        }
                    }
                }
            } else {
                // 일반 필드
                const commaIndex = currentLine.indexOf(',');
                if (commaIndex === -1) {
                    value = currentLine.trim();
                    currentLine = '';
                } else {
                    value = currentLine.substring(0, commaIndex).trim();
                    currentLine = currentLine.substring(commaIndex + 1);
                }
            }

            record[header] = value;
            fieldIndex++;
        }

        // Day X 패턴 확인
        if (record['이름'] && record['이름'].match(/^Day \d+$/)) {
            records.push(record);
        }

        i++;
    }

    return records;
}

function parseCSVLine(line) {
    const fields = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            fields.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    fields.push(current.trim());
    return fields;
}

// HTML 생성 함수
function generateHTML(record, dayNumber) {
    const title = record['VelogTitle'] || record['Title'] || `Day ${dayNumber}`;
    const date = record['Date'] || '';
    const velogBody = record['VelogBody'] || '';

    // 마크다운 텍스트 처리
    let markdownText = velogBody
        // 체크리스트 앞의 - 제거 (- [ ] -> [ ])
        .replace(/^- \[( |x|X)\]/gm, '[$1]')
        // HTML 이스케이프
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const html = `<!doctype html>
<html lang="ko"><head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(title)} | React+TypeScript 84일 루틴 | 학습 기간 ${escapeHtml(date)}"/>

  <!-- Marked.js for Markdown rendering -->
  <script src="https://cdn.jsdelivr.net/npm/marked@11.1.1/marked.min.js"></script>

  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans KR', Arial, sans-serif;
      margin: 0;
      padding: 0;
      line-height: 1.6;
      color: #333;
      background: #fafafa;
    }

    .header {
      background: white;
      border-bottom: 2px solid #e5e7eb;
      padding: 20px;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }

    .header-content {
      max-width: 1600px;
      margin: 0 auto;
    }

    .back-button {
      display: inline-block;
      margin-bottom: 12px;
      padding: 8px 16px;
      background: #63B7B7;
      color: #ffffff;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.9em;
      transition: background 0.2s;
    }

    .back-button:hover {
      background: #3A7575;
    }

    .nav-buttons {
      display: flex;
      gap: 12px;
      margin-top: 16px;
      align-items: center;
    }

    .nav-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 18px;
      background: #e0f2f1;
      color: #367588;
      border: 2px solid #63B7B7;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.9em;
      transition: all 0.2s;
    }

    .nav-btn:hover:not(.disabled) {
      background: #b2dfdb;
      border-color: #3A7575;
    }

    .nav-btn.disabled {
      opacity: 0.4;
      cursor: not-allowed;
      pointer-events: none;
    }

    .day-selector {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 18px;
      background: #b2dfdb;
      border: 2px solid #63B7B7;
      border-radius: 6px;
      margin-left: auto;
    }

    .day-selector label {
      font-size: 0.9em;
      font-weight: 600;
      color: #367588;
      white-space: nowrap;
    }

    .day-selector select {
      padding: 8px 32px 8px 12px;
      border: 2px solid #63B7B7;
      border-radius: 4px;
      background: white;
      color: #3A7575;
      font-weight: 600;
      font-size: 0.9em;
      cursor: pointer;
      transition: all 0.2s;
      outline: none;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath fill='%2363B7B7' d='M4 6l4 4 4-4'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 8px center;
      background-size: 16px;
    }

    .day-selector select:hover {
      border-color: #3A7575;
      background-color: #e0f2f1;
    }

    .day-selector select:focus {
      border-color: #3A7575;
      background-color: #e0f2f1;
      box-shadow: 0 0 0 3px rgba(58, 117, 117, 0.2);
    }

    h1 {
      font-size: 1.75em;
      margin: 0 0 8px 0;
      color: #1a1a1a;
    }

    .meta {
      color: #666;
      font-size: 0.9em;
    }

    .split-container {
      display: flex;
      max-width: 1600px;
      margin: 0 auto;
      height: calc(100vh - 140px);
    }

    .panel {
      flex: 1;
      overflow-y: auto;
      padding: 30px;
    }

    .panel-left {
      background: #f9fafb;
      border-right: 2px solid #e5e7eb;
    }

    .panel-right {
      background: white;
    }

    .panel-title {
      font-size: 0.85em;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid #d1d5db;
    }

    #markdown-editor {
      width: 100%;
      min-height: 500px;
      padding: 16px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 0.9em;
      line-height: 1.6;
      background: white;
      resize: vertical;
    }

    #markdown-editor:focus {
      outline: none;
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }

    .copy-button {
      margin-top: 12px;
      padding: 8px 16px;
      background: #0EA7A5;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      font-size: 0.9em;
      transition: background 0.2s;
    }

    .copy-button:hover {
      background: #3A7575;
    }

    .copy-button:active {
      background: #367588;
    }

    .velog-button {
      margin-top: 12px;
      margin-left: 12px;
      padding: 8px 16px;
      background: #63B7B7;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      font-size: 0.9em;
      transition: background 0.2s;
    }

    .velog-button:hover {
      background: #367588;
    }

    .velog-button:active {
      background: #3A7575;
    }

    #content h1 {
      font-size: 1.75em;
      margin-top: 32px;
      margin-bottom: 16px;
      color: #1a1a1a;
      border-bottom: 3px solid #63B7B7;
      padding-bottom: 12px;
    }

    #content h2 {
      margin-top: 32px;
      margin-bottom: 16px;
      color: #367588;
      font-size: 1.5em;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 8px;
    }

    #content h3 {
      margin-top: 24px;
      margin-bottom: 12px;
      color: #374151;
      font-size: 1.25em;
    }

    #content p {
      margin-bottom: 16px;
    }

    #content ul, #content ol {
      margin-bottom: 16px;
      padding-left: 28px;
    }

    #content li {
      margin-bottom: 8px;
    }

    #content a {
      color: #0EA7A5;
      text-decoration: none;
      border-bottom: 1px solid transparent;
      transition: border-color 0.2s;
    }

    #content a:hover {
      border-bottom-color: #63B7B7;
    }

    #content pre {
      background: #1f2937;
      color: #f9fafb;
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      margin-bottom: 16px;
    }

    #content code {
      background: #e0f2f1;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 0.9em;
      color: #367588;
    }

    #content pre code {
      background: none;
      padding: 0;
      color: #f9fafb;
    }

    #content blockquote {
      border-left: 4px solid #63B7B7;
      padding-left: 16px;
      margin-left: 0;
      color: #666;
      font-style: italic;
      background: #e0f2f1;
      padding: 12px 16px;
      border-radius: 4px;
    }

    #content hr {
      border: none;
      border-top: 2px solid #e5e7eb;
      margin: 32px 0;
    }

    #content input[type="checkbox"] {
      margin-right: 8px;
    }

    #content table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }

    #content table th,
    #content table td {
      border: 1px solid #e5e7eb;
      padding: 8px 12px;
      text-align: left;
    }

    #content table th {
      background: #f3f4f6;
      font-weight: 600;
    }

    @media (max-width: 1024px) {
      .split-container {
        flex-direction: column;
        height: auto;
      }

      .panel-left {
        border-right: none;
        border-bottom: 2px solid #e5e7eb;
      }

      .panel {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-content">
      <a href="index.html" class="back-button">← 목록으로 돌아가기</a>
      <h1>${escapeHtml(title)}</h1>
      <div class="meta">📅 학습 기간: <b>${escapeHtml(date)}</b></div>

      <div class="nav-buttons">
        <a href="day-${(dayNumber - 1).toString().padStart(2, '0')}.html" class="nav-btn ${dayNumber <= 1 ? 'disabled' : ''}">
          <span>←</span>
          <span>이전 Day</span>
        </a>

        <a href="day-${(dayNumber + 1).toString().padStart(2, '0')}.html" class="nav-btn ${dayNumber >= 84 ? 'disabled' : ''}">
          <span>다음 Day</span>
          <span>→</span>
        </a>

        <div class="day-selector">
          <label for="day-select">📅 이동:</label>
          <select id="day-select" onchange="location.href = this.value">
            ${Array.from({length: 84}, (_, i) => {
              const day = i + 1;
              const dayStr = day.toString().padStart(2, '0');
              const selected = day === dayNumber ? 'selected' : '';
              return `<option value="day-${dayStr}.html" ${selected}>Day ${day}</option>`;
            }).join('\n            ')}
          </select>
        </div>
      </div>
    </div>
  </div>

  <div class="split-container">
    <div class="panel panel-left">
      <div class="panel-title">📝 마크다운 소스</div>
      <textarea id="markdown-editor" spellcheck="false"></textarea>
      <button class="copy-button" onclick="copyMarkdown()">📋 소스 복사</button>
      <button class="velog-button" onclick="openVelog()">✍️ Velog에 작성하기</button>
    </div>

    <div class="panel panel-right">
      <div class="panel-title">👀 렌더링 미리보기</div>
      <div id="content"></div>
    </div>
  </div>

  <script id="markdown-source" type="text/plain">${markdownText}</script>
  <script>
    // Marked.js 설정
    marked.setOptions({
      breaks: true,
      gfm: true
    });

    // 마크다운 소스 로드
    const markdownSource = document.getElementById('markdown-source').textContent;
    const editor = document.getElementById('markdown-editor');
    const content = document.getElementById('content');

    // 에디터에 소스 설정
    editor.value = markdownSource;

    // 초기 렌더링
    content.innerHTML = marked.parse(markdownSource);

    // 실시간 렌더링 (편집 시)
    editor.addEventListener('input', function() {
      content.innerHTML = marked.parse(editor.value);
    });

    // 복사 기능
    function copyMarkdown() {
      editor.select();
      document.execCommand('copy');

      const btn = event.target;
      const originalText = btn.textContent;
      btn.textContent = '✅ 복사 완료!';
      btn.style.background = '#63B7B7';

      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '#0EA7A5';
      }, 2000);
    }

    // Velog 글쓰기 열기
    function openVelog() {
      // 마크다운 내용을 클립보드에 복사
      const markdown = editor.value;

      // 클립보드에 복사
      navigator.clipboard.writeText(markdown).then(() => {
        // Velog 글쓰기 페이지 열기
        window.open('https://velog.io/write', '_blank');

        // 버튼 피드백
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '✅ 클립보드에 복사됨!';
        btn.style.background = '#0EA7A5';

        setTimeout(() => {
          btn.textContent = originalText;
          btn.style.background = '#63B7B7';
        }, 2500);
      }).catch(err => {
        alert('클립보드 복사에 실패했습니다. 수동으로 복사해주세요.');
      });
    }
  </script>
</body></html>`;

    return html;
}

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// 메인 실행
console.log('CSV 파일 읽는 중...');
const csvText = fs.readFileSync(csvPath, 'utf-8');

console.log('CSV 파싱 중...');
const records = parseCSV(csvText);

console.log(`총 ${records.length}개의 레코드 발견`);

// docs와 docs_private_noindex 폴더에 HTML 생성
const outputDirs = ['docs', 'docs_private_noindex'];

for (const dir of outputDirs) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    let count = 0;
    for (const record of records) {
        const dayMatch = record['이름'].match(/^Day (\d+)$/);
        if (dayMatch) {
            const dayNumber = parseInt(dayMatch[1]);
            const dayString = dayNumber.toString().padStart(2, '0');
            const filename = `day-${dayString}.html`;
            const filepath = path.join(dir, filename);

            const html = generateHTML(record, dayNumber);
            fs.writeFileSync(filepath, html, 'utf-8');
            count++;
        }
    }

    console.log(`[${dir}] ${count}개 파일 생성 완료`);
}

console.log('✅ 모든 HTML 파일 생성 완료!');
