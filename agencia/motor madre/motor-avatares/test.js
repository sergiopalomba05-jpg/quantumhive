const regex = /import {[^}]+} from "react";/;
const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
if (!code.includes('useEffect(() => {\n    const onResize = () => {')) {
  console.log("No visualViewport effect");
}
