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

    // 마크다운을 간단한 HTML로 변환 (기본적인 변환만)
    let bodyHtml = velogBody
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
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">학습 기간: <b>${escapeHtml(date)}</b></div>
  <pre>${bodyHtml}</pre>
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
