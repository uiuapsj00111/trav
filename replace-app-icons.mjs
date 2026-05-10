import fs from 'fs';

// Copy favicon-32x32.png -> src/app/favicon.ico (as ICO wrapping the PNG)
// ICO format: header + directory + image data
const png32 = fs.readFileSync('C:/Users/serge/orchids-projects/yellow-ferret/public/favicon-32x32.png');

// ICO header: reserved(2) + type(2) + count(2)
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);   // reserved
header.writeUInt16LE(1, 2);   // type: 1 = ICO
header.writeUInt16LE(1, 4);   // count: 1 image

// ICO directory entry (16 bytes)
const dir = Buffer.alloc(16);
dir.writeUInt8(32, 0);        // width: 32
dir.writeUInt8(32, 1);        // height: 32
dir.writeUInt8(0, 2);         // color count: 0 (no palette)
dir.writeUInt8(0, 3);         // reserved
dir.writeUInt16LE(1, 4);      // planes
dir.writeUInt16LE(32, 6);     // bit count
dir.writeUInt32LE(png32.length, 8);  // size of image data
dir.writeUInt32LE(22, 12);    // offset: 6 (header) + 16 (dir) = 22

const ico = Buffer.concat([header, dir, png32]);
fs.writeFileSync('C:/Users/serge/orchids-projects/yellow-ferret/src/app/favicon.ico', ico);
console.log('favicon.ico written to src/app:', ico.length, 'bytes');

// Copy android-chrome-512x512.png -> src/app/icon.png (used by Next.js as og icon)
const png512 = fs.readFileSync('C:/Users/serge/orchids-projects/yellow-ferret/public/android-chrome-512x512.png');
fs.writeFileSync('C:/Users/serge/orchids-projects/yellow-ferret/src/app/icon.png', png512);
console.log('icon.png written to src/app:', png512.length, 'bytes');
