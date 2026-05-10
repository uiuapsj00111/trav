const https = require('https');
const fs = require('fs');
const url = 'https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/e493a9e9-cb10-474b-b970-6c6f2509ebfd/image-1771973875870.png';
const file = fs.createWriteStream('public/card-back-bg.png');
https.get(url, res => {
  res.pipe(file);
  file.on('finish', () => { file.close(); console.log('done'); });
}).on('error', e => console.error(e));
