#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const DEFAULT_STYLE =
    "display:inline-block;" +
    "margin:10px 0 18px;" +
    "padding:8px 14px;" +
    "background:#2563eb;" +
    "color:#fff;" +
    "border-radius:8px;" +
    "text-decoration:none;" +
    "font-weight:600;";

const MARKER = "<!--__BACK_TO_INDEX_BUTTON__-->";

function injectIntoHtml(htmlText, label, style) {
    if (htmlText.includes(MARKER)) {
        return htmlText;
    }

    const snippet =
        `${MARKER}\n` +
        `<a href="index.html" style="${style}">` +
        `← ${label}` +
        `</a>\n`;

    const pattern = /<body[^>]*>/i;
    const match = htmlText.match(pattern);

    if (!match) {
        return htmlText;
    }

    const insertPos = match.index + match[0].length;
    return htmlText.slice(0, insertPos) + "\n" + snippet + htmlText.slice(insertPos);
}

function patchFolder(folderPath, label, style) {
    if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
        return 0;
    }

    let count = 0;
    const files = fs.readdirSync(folderPath)
        .filter(f => f.match(/^day-\d+\.html$/))
        .sort();

    for (const file of files) {
        const filePath = path.join(folderPath, file);
        const text = fs.readFileSync(filePath, 'utf-8');
        const newText = injectIntoHtml(text, label, style);

        if (newText !== text) {
            fs.writeFileSync(filePath, newText, 'utf-8');
            count++;
        }
    }

    return count;
}

const dirs = ["docs", "docs_private_noindex"];
const label = "목록으로 돌아가기";
let total = 0;

for (const dir of dirs) {
    const count = patchFolder(dir, label, DEFAULT_STYLE);
    console.log(`[${dir}] patched ${count} files`);
    total += count;
}

if (total === 0) {
    console.log("No changes (already patched or folders not found).");
} else {
    console.log(`✅ Done. Injected back button into ${total} files.`);
}
