const fs = require('fs');
const code = fs.readFileSync('src/App.tsx', 'utf8');

let m = code.match(/const \[activeOverlay.*?useState.*?;/g);
console.log("activeOverlay:", m);

m = code.match(/const \[showMenuDrop.*?useState.*?;/g);
console.log("showMenuDrop:", m);

m = code.match(/const \[showSearch.*?useState.*?;/g);
console.log("showSearch:", m);

m = code.match(/const \[expandedDishIds.*?useState.*?;/g);
console.log("expandedDishIds:", m);
