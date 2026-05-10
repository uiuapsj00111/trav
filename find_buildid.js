const fs = require('fs');
const html = fs.readFileSync('bloxluck_full_test.html', 'utf8');
const buildIdMatch = html.match(/"buildId":"(.*?)"/);
if (buildIdMatch) {
    console.log(buildIdMatch[1]);
} else {
    console.log('Build ID not found');
}
