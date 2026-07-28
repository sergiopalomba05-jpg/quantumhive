const fs = require('fs');
const code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /const \[activeOverlay.*?useState.*?;/g;
console.log(code.match(regex));
