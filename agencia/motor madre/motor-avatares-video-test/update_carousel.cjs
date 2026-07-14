const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /<div \s*ref=\{carouselRef\}[\s\S]*?className="flex overflow-x-auto gap-4 pb-4 pt-2\.5 px-4 scrollbar-none"/;

const match = code.match(regex);
if (match) {
  const replacement = match[0]
    .replace('<div', '<motion.div')
    .replace('className="flex', 'initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, ease: "easeOut" }} className="flex');
  
  code = code.replace(regex, replacement);

  // also replace the closing tag of this div
  // The carousel closing tag is just after the closing bracket of the map.
  // Wait, replacing just the div with motion.div for the container is tricky with regex if we don't catch the end tag.
}
