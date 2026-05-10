import fs from 'fs';

const content = fs.readFileSync('src/lib/mm2Items.ts', 'utf8');
const lines = content.split('\n');

const newLines = [];
const seenNames = new Set();
let inArray = false;

for (const line of lines) {
  if (line.includes('export const mm2Items: MM2Item[] = [')) {
    inArray = true;
    newLines.push(line);
    continue;
  }
  
  if (inArray && line.trim().startsWith('];')) {
    inArray = false;
    newLines.push(line);
    continue;
  }

  if (inArray) {
    const match = line.match(/name:\s*"([^"]+)"/);
    if (match) {
      const name = match[1];
      if (seenNames.has(name)) {
        continue; // skip duplicate
      }
      seenNames.add(name);
    }
  }
  
  newLines.push(line);
}

fs.writeFileSync('src/lib/mm2Items.ts', newLines.join('\n'));
console.log('Deduplicated mm2Items.ts');
