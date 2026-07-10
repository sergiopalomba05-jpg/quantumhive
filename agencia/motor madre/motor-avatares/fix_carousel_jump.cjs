const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldTickBlock = `    const startTimeout = setTimeout(() => {
      if (carouselRef.current) {
        carouselAutoplayPosRef.current = carouselRef.current.scrollLeft;
      }
      animFrameId = requestAnimationFrame(tick);
    }, 1500);`;

const newTickBlock = `    const startTimeout = setTimeout(() => {
      if (carouselRef.current) {
        carouselAutoplayPosRef.current = carouselRef.current.scrollLeft;
      }
      lastTime = performance.now();
      animFrameId = requestAnimationFrame(tick);
    }, 1500);`;

code = code.replace(oldTickBlock, newTickBlock);
fs.writeFileSync('src/App.tsx', code);
console.log("Replaced start timeout!");
