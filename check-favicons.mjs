import fs from 'fs';
const files = ['favicon.ico','favicon.png','favicon-32x32.png','favicon-16x16.png','apple-touch-icon.png','android-chrome-192x192.png','android-chrome-512x512.png'];
for (const f of files) {
  try {
    const s = fs.statSync('C:/Users/serge/orchids-projects/yellow-ferret/public/' + f);
    const buf = fs.readFileSync('C:/Users/serge/orchids-projects/yellow-ferret/public/' + f);
    console.log(f, s.size, 'bytes | first4:', buf.slice(0,4).toString('hex'));
  } catch(e) { console.log(f, 'MISSING'); }
}
