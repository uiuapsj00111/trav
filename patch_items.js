const fs = require('fs');

const itemsLua = fs.readFileSync('generated_items.lua', 'utf8');
const botScript = fs.readFileSync('botscript.lua', 'utf8');

// Match the entire MM2_ITEMS assignment
const regex = /local MM2_ITEMS = \{[\s\S]*?\}\n\nlocal function getItemValue/;
const match = botScript.match(regex);

if (match) {
    console.log('Found MM2_ITEMS table, replacing...');
    // Replace while keeping the function declaration
    const updatedScript = botScript.replace(regex, itemsLua + '\nlocal function getItemValue');
    fs.writeFileSync('botscript.lua', updatedScript);
    console.log('Updated botscript.lua successfully.');
} else {
    console.error('Could not find MM2_ITEMS table with regex!');
    // Try without the function declaration in the regex
    const regex2 = /local MM2_ITEMS = \{[\s\S]*?\n\}/;
    const match2 = botScript.match(regex2);
    if (match2) {
        console.log('Found MM2_ITEMS table with regex2, replacing...');
        const updatedScript = botScript.replace(regex2, itemsLua);
        fs.writeFileSync('botscript.lua', updatedScript);
        console.log('Updated botscript.lua successfully (regex2).');
    }
}
