const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const anchor = `  MicOff,`;
const rep = `  MicOff,
  Square,`;

if (code.includes(anchor)) {
  code = code.replace(anchor, rep);
  fs.writeFileSync('src/App.tsx', code);
  console.log("Added Square import");
}
