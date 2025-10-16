#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// CSV 파일 경로
const csvPath = process.argv[2] || "C:\\Users\\user\\Downloads\\9a7ad7a3-c1fb-49fc-af7c-57693da57eff_ExportBlock-97f8ebb6-86b8-441a-a286-d1cafe1729e1\\ExportBlock-97f8ebb6-86b8-441a-a286-d1cafe1729e1-Part-1\\일정 28d811fbadda80e89d9aedc9c4b4dc5a_all.csv";

// CSV 파싱 함수
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

        while (fieldIndex < headers.length) {
            const header = headers[fieldIndex];
            let value = '';

            if (currentLine.startsWith('"')) {
                currentLine = currentLine.substring(1);
                let endFound = false;

                while (!endFound) {
                    const quoteIndex = currentLine.indexOf('"');
                    if (quoteIndex === -1) {
                        value += currentLine + '\n';
                        i++;
                        if (i >= lines.length) break;
                        currentLine = lines[i];
                    } else {
                        value += currentLine.substring(0, quoteIndex);
                        currentLine = currentLine.substring(quoteIndex + 1);

                        if (currentLine.startsWith(',') || currentLine.trim() === '') {
                            endFound = true;
                            if (currentLine.startsWith(',')) {
                                currentLine = currentLine.substring(1);
                            }
                        } else if (currentLine.startsWith('"')) {
                            value += '"';
                            currentLine = currentLine.substring(1);
                        }
                    }
                }
            } else {
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

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escapeJson(text) {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
}

function generateIndex(records) {
    // 각 Day의 데이터를 JSON으로 변환
    const daysData = records.map(record => {
        const dayMatch = record['이름'].match(/^Day (\d+)$/);
        const dayNumber = dayMatch ? parseInt(dayMatch[1]) : 0;

        // 체크리스트 개수 카운트
        const checklist = record['Checklist'] || '';
        const checklistCount = (checklist.match(/\[ \]/g) || []).length;

        return {
            day: dayNumber,
            title: record['VelogTitle'] || record['Title'] || '',
            date: record['Date'] || '',
            checklistCount: checklistCount,
            status: record['Status'] || 'Not Started'
        };
    });

    const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>React + TypeScript 84일 루틴</title>
  <meta name="description" content="React + TypeScript 84일 학습 루틴 - 기초부터 실전까지"/>

  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans KR', Arial, sans-serif;
      margin: 0;
      padding: 0;
      background: linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 50%, #80cbc4 100%);
      min-height: 100vh;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 40px 20px;
    }

    .header {
      text-align: center;
      margin-bottom: 40px;
    }

    .header h1 {
      font-size: 2.5em;
      margin: 0 0 16px 0;
      color: #367588;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
    }

    .header p {
      font-size: 1.1em;
      color: #6b7280;
      margin: 0;
    }

    .progress-section {
      background: white;
      border-radius: 16px;
      padding: 30px;
      margin-bottom: 30px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.07);
    }

    .progress-title {
      font-size: 1.2em;
      font-weight: 600;
      color: #374151;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .progress-bar-container {
      background: #f3f4f6;
      border-radius: 12px;
      height: 32px;
      overflow: hidden;
      position: relative;
    }

    .progress-bar {
      background: linear-gradient(90deg, #63B7B7 0%, #0EA7A5 100%);
      height: 100%;
      transition: width 0.5s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      color: #ffffff;
      font-size: 0.9em;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
      margin-top: 20px;
    }

    .stat-card {
      background: linear-gradient(135deg, #b2dfdb 0%, #80cbc4 100%);
      padding: 16px;
      border-radius: 12px;
      text-align: center;
    }

    .stat-number {
      font-size: 2em;
      font-weight: 700;
      color: #367588;
      margin-bottom: 4px;
    }

    .stat-label {
      font-size: 0.85em;
      color: #6b7280;
      font-weight: 600;
    }

    .controls {
      background: white;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 30px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.07);
    }

    .search-box {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #63B7B7;
      border-radius: 8px;
      font-size: 1em;
      margin-bottom: 16px;
      transition: all 0.2s;
    }

    .search-box:focus {
      outline: none;
      border-color: #3A7575;
      box-shadow: 0 0 0 3px rgba(58, 117, 117, 0.15);
    }

    .filters {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .filter-group {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .filter-btn {
      padding: 8px 16px;
      border: 2px solid #d1d5db;
      background: white;
      border-radius: 8px;
      font-size: 0.9em;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      color: #6b7280;
    }

    .filter-btn:hover {
      border-color: #63B7B7;
      background: #e0f2f1;
    }

    .filter-btn.active {
      background: #63B7B7;
      border-color: #3A7575;
      color: #ffffff;
    }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
    }

    .day-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.06);
      transition: all 0.3s;
      cursor: pointer;
      border: 2px solid transparent;
      position: relative;
      overflow: hidden;
    }

    .day-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #63B7B7 0%, #0EA7A5 100%);
      opacity: 0;
      transition: opacity 0.3s;
    }

    .day-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 16px rgba(0,0,0,0.12);
      border-color: #63B7B7;
    }

    .day-card:hover::before {
      opacity: 1;
    }

    .day-card.completed {
      border-color: #0EA7A5;
      background: linear-gradient(135deg, #e0f2f1 0%, #ffffff 100%);
    }

    .day-card.completed::before {
      background: #0EA7A5;
      opacity: 1;
    }

    .day-number {
      font-size: 0.85em;
      font-weight: 700;
      color: #367588;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .day-title {
      font-size: 1.05em;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 12px;
      line-height: 1.4;
      min-height: 2.8em;
    }

    .day-meta {
      display: flex;
      gap: 12px;
      margin-bottom: 12px;
      font-size: 0.85em;
      color: #6b7280;
    }

    .day-meta span {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .week-badge {
      display: inline-block;
      padding: 4px 10px;
      background: #b2dfdb;
      color: #367588;
      border-radius: 6px;
      font-size: 0.75em;
      font-weight: 600;
    }

    .checkbox-container {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #e5e7eb;
    }

    .checkbox-container input[type="checkbox"] {
      width: 20px;
      height: 20px;
      cursor: pointer;
      accent-color: #0EA7A5;
    }

    .checkbox-container label {
      font-size: 0.9em;
      font-weight: 600;
      color: #3A7575;
      cursor: pointer;
      user-select: none;
    }

    .no-results {
      text-align: center;
      padding: 60px 20px;
      color: #9ca3af;
      font-size: 1.1em;
    }

    @media (max-width: 768px) {
      .header h1 {
        font-size: 1.8em;
      }

      .stats {
        grid-template-columns: repeat(2, 1fr);
      }

      .filters {
        flex-direction: column;
      }

      .cards-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 React + TypeScript 84일 루틴</h1>
      <p>기초부터 실전까지, 체계적인 학습 여정</p>
    </div>

    <div class="progress-section">
      <div class="progress-title">
        <span>📊 전체 진행률</span>
      </div>
      <div class="progress-bar-container">
        <div class="progress-bar" id="progress-bar">0%</div>
      </div>
      <div class="stats">
        <div class="stat-card">
          <div class="stat-number" id="stat-completed">0</div>
          <div class="stat-label">완료한 Day</div>
        </div>
        <div class="stat-card">
          <div class="stat-number" id="stat-remaining">84</div>
          <div class="stat-label">남은 Day</div>
        </div>
        <div class="stat-card">
          <div class="stat-number" id="stat-percentage">0%</div>
          <div class="stat-label">진행률</div>
        </div>
        <div class="stat-card">
          <div class="stat-number" id="stat-week">1</div>
          <div class="stat-label">현재 주차</div>
        </div>
      </div>
    </div>

    <div class="controls">
      <input type="text" id="search-input" class="search-box" placeholder="🔍 제목으로 검색...">

      <div class="filters">
        <div class="filter-group">
          <button class="filter-btn active" data-filter="all">전체</button>
          <button class="filter-btn" data-filter="todo">미완료</button>
          <button class="filter-btn" data-filter="done">완료</button>
        </div>

        <div class="filter-group" id="week-filters">
          <!-- Week filters will be generated by JS -->
        </div>
      </div>
    </div>

    <div class="cards-grid" id="cards-grid">
      <!-- Cards will be generated by JavaScript -->
    </div>

    <div class="no-results" id="no-results" style="display: none;">
      검색 결과가 없습니다 😢
    </div>
  </div>

  <script>
    const daysData = ${JSON.stringify(daysData, null, 2)};

    // localStorage에서 완료 상태 가져오기
    function getCompletedDays() {
      const stored = localStorage.getItem('completed-days');
      return stored ? JSON.parse(stored) : [];
    }

    // localStorage에 완료 상태 저장
    function saveCompletedDays(completedDays) {
      localStorage.setItem('completed-days', JSON.stringify(completedDays));
    }

    let completedDays = getCompletedDays();
    let currentFilter = 'all';
    let currentWeekFilter = 'all';
    let searchQuery = '';

    // 통계 업데이트
    function updateStats() {
      const completed = completedDays.length;
      const remaining = 84 - completed;
      const percentage = Math.round((completed / 84) * 100);
      const currentWeek = Math.ceil((completed + 1) / 7);

      document.getElementById('stat-completed').textContent = completed;
      document.getElementById('stat-remaining').textContent = remaining;
      document.getElementById('stat-percentage').textContent = percentage + '%';
      document.getElementById('stat-week').textContent = currentWeek;

      const progressBar = document.getElementById('progress-bar');
      progressBar.style.width = percentage + '%';
      progressBar.textContent = percentage + '%';
    }

    // 카드 렌더링
    function renderCards() {
      const grid = document.getElementById('cards-grid');
      const noResults = document.getElementById('no-results');

      let filteredDays = daysData.filter(day => {
        // 상태 필터
        const isCompleted = completedDays.includes(day.day);
        if (currentFilter === 'done' && !isCompleted) return false;
        if (currentFilter === 'todo' && isCompleted) return false;

        // 주차 필터
        if (currentWeekFilter !== 'all') {
          const week = Math.ceil(day.day / 7);
          if (week !== parseInt(currentWeekFilter)) return false;
        }

        // 검색
        if (searchQuery) {
          const title = day.title.toLowerCase();
          if (!title.includes(searchQuery.toLowerCase())) return false;
        }

        return true;
      });

      if (filteredDays.length === 0) {
        grid.style.display = 'none';
        noResults.style.display = 'block';
        return;
      } else {
        grid.style.display = 'grid';
        noResults.style.display = 'none';
      }

      grid.innerHTML = filteredDays.map(day => {
        const isCompleted = completedDays.includes(day.day);
        const week = Math.ceil(day.day / 7);
        const dayStr = day.day.toString().padStart(2, '0');

        return \`
          <div class="day-card \${isCompleted ? 'completed' : ''}" onclick="window.location.href='day-\${dayStr}.html'">
            <div class="day-number">
              <span>DAY \${day.day}</span>
              <span class="week-badge">Week \${week}</span>
            </div>
            <div class="day-title">\${escapeHtml(day.title)}</div>
            <div class="day-meta">
              <span>📅 \${day.date}</span>
              <span>📝 \${day.checklistCount}개 항목</span>
            </div>
            <div class="checkbox-container" onclick="event.stopPropagation()">
              <input type="checkbox" id="check-\${day.day}" \${isCompleted ? 'checked' : ''} onchange="toggleComplete(\${day.day})">
              <label for="check-\${day.day}">완료 표시</label>
            </div>
          </div>
        \`;
      }).join('');
    }

    // 완료 토글
    function toggleComplete(dayNumber) {
      const index = completedDays.indexOf(dayNumber);
      if (index > -1) {
        completedDays.splice(index, 1);
      } else {
        completedDays.push(dayNumber);
      }
      saveCompletedDays(completedDays);
      updateStats();
      renderCards();
    }

    // HTML 이스케이프
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // 필터 버튼 이벤트
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        if (this.dataset.filter) {
          document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
          this.classList.add('active');
          currentFilter = this.dataset.filter;
        } else if (this.dataset.week) {
          document.querySelectorAll('[data-week]').forEach(b => b.classList.remove('active'));
          this.classList.add('active');
          currentWeekFilter = this.dataset.week;
        }
        renderCards();
      });
    });

    // 검색
    document.getElementById('search-input').addEventListener('input', function(e) {
      searchQuery = e.target.value;
      renderCards();
    });

    // 주차 필터 생성
    function generateWeekFilters() {
      const container = document.getElementById('week-filters');
      const weeks = ['all', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

      container.innerHTML = weeks.map(week => {
        const label = week === 'all' ? '전체 주차' : \`Week \${week}\`;
        const active = week === 'all' ? 'active' : '';
        return \`<button class="filter-btn \${active}" data-week="\${week}">\${label}</button>\`;
      }).join('');

      container.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', function() {
          container.querySelectorAll('button').forEach(b => b.classList.remove('active'));
          this.classList.add('active');
          currentWeekFilter = this.dataset.week;
          renderCards();
        });
      });
    }

    // 초기화
    generateWeekFilters();
    updateStats();
    renderCards();
  </script>
</body>
</html>`;

    return html;
}

// 메인 실행
console.log('CSV 파일 읽는 중...');
const csvText = fs.readFileSync(csvPath, 'utf-8');

console.log('CSV 파싱 중...');
const records = parseCSV(csvText);

console.log(`총 ${records.length}개의 레코드 발견`);

// index.html 생성
const html = generateIndex(records);

const outputDirs = ['docs', 'docs_private_noindex'];

for (const dir of outputDirs) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const filepath = path.join(dir, 'index.html');
    fs.writeFileSync(filepath, html, 'utf-8');
    console.log(`[${dir}] index.html 생성 완료`);
}

console.log('✅ Index 파일 생성 완료!');
