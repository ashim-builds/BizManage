const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'apps/web/src');

function findMatchingCloseDiv(content, startIndex) {
  let depth = 1;
  // Start looking after the opening <div
  let i = content.indexOf('>', startIndex) + 1;
  while (i < content.length && depth > 0) {
    const nextOpen = content.indexOf('<div', i);
    const nextClose = content.indexOf('</div', i);
    
    if (nextClose === -1) return -1;
    
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      i = nextOpen + 4;
    } else {
      depth--;
      i = nextClose + 6;
      if (depth === 0) {
        return content.indexOf('>', nextClose) + 1;
      }
    }
  }
  return -1;
}

function processFile(filePath) {
  if (!filePath.endsWith('.tsx')) return;
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Skip if already has ModalPortal
  if (content.includes('ModalPortal')) return;
  
  let modified = false;
  let searchIdx = 0;
  
  while (true) {
    const matchStr = '<div className="fixed inset-0';
    const idx = content.indexOf(matchStr, searchIdx);
    if (idx === -1) break;
    
    const endIdx = findMatchingCloseDiv(content, idx);
    if (endIdx !== -1) {
      // Wrap it
      content = content.slice(0, idx) + '<ModalPortal>' + content.slice(idx, endIdx) + '</ModalPortal>' + content.slice(endIdx);
      modified = true;
      searchIdx = endIdx + 26; // account for added tags
    } else {
      searchIdx = idx + matchStr.length;
    }
  }
  
  if (modified) {
    // Add import
    const importRegex = /^import .+? from .+?;$/gm;
    let lastImportIdx = 0;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      lastImportIdx = match.index + match[0].length;
    }
    
    const importStmt = "\nimport { ModalPortal } from '@/components/ui/ModalPortal';";
    content = content.slice(0, lastImportIdx) + importStmt + content.slice(lastImportIdx);
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated ' + filePath);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else {
      processFile(fullPath);
    }
  }
}

walkDir(srcDir);
console.log('Done.');
