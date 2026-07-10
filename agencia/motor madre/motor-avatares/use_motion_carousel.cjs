const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const anchor1 = `              {/* Horizontal scrollable row of featured dish cards (with endless infinite loop) */}
              <div 
                ref={carouselRef}
                onTouchStart={handleCarouselTouchStart}
                onTouchEnd={handleCarouselTouchEnd}
                onMouseDown={handleCarouselTouchStart}
                onMouseUp={handleCarouselTouchEnd}
                onMouseLeave={handleCarouselTouchEnd}
                className="flex overflow-x-auto gap-4 pb-4 pt-2.5 px-4 scrollbar-none"
                style={{ 
                  perspective: "1200px", 
                  transformStyle: "preserve-3d"
                }}
              >`;

const rep1 = `              {/* Horizontal scrollable row of featured dish cards (with endless infinite loop) */}
              <motion.div 
                ref={carouselRef}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                onTouchStart={handleCarouselTouchStart}
                onTouchEnd={handleCarouselTouchEnd}
                onMouseDown={handleCarouselTouchStart}
                onMouseUp={handleCarouselTouchEnd}
                onMouseLeave={handleCarouselTouchEnd}
                className="flex overflow-x-auto gap-4 pb-4 pt-2.5 px-4 scrollbar-none"
                style={{ 
                  perspective: "1200px", 
                  transformStyle: "preserve-3d"
                }}
              >`;

const anchor2 = `                    </div>
                  );
                })}
              </div>
            </div>
          )}`;

const rep2 = `                    </div>
                  );
                })}
              </motion.div>
            </div>
          )}`;

code = code.replace(anchor1, rep1).replace(anchor2, rep2);
fs.writeFileSync('src/App.tsx', code);
console.log("Updated carousel to motion.div!");
