const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Add isExitingRef
const anchor = `  const showExitConfirmRef = useRef(showExitConfirm);
  showExitConfirmRef.current = showExitConfirm;`;

const newRef = `  const showExitConfirmRef = useRef(showExitConfirm);
  showExitConfirmRef.current = showExitConfirm;
  const isExitingRef = useRef(false);`;

code = code.replace(anchor, newRef);

const oldHandle = `    const handlePopState = (e) => {
      window.history.pushState({ appLayer: 'main' }, "");

      if (showExitConfirmRef.current) {`;

const newHandle = `    const handlePopState = (e) => {
      if (isExitingRef.current) return;
      window.history.pushState({ appLayer: 'main' }, "");

      if (showExitConfirmRef.current) {`;

code = code.replace(oldHandle, newHandle);

const oldExitClick = `                  onClick={() => {
                    // Try to go back fully or close
                    window.history.go(-2);
                    setTimeout(() => window.close(), 100);
                  }}`;

const newExitClick = `                  onClick={() => {
                    isExitingRef.current = true;
                    window.history.back();
                    setTimeout(() => window.close(), 100);
                  }}`;

code = code.replace(oldExitClick, newExitClick);
fs.writeFileSync('src/App.tsx', code);
console.log("Fixed exiting logic");
