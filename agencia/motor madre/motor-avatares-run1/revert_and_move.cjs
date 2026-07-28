const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const badBlock = `  // Exit Confirmation State
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Refs for back button history handler
  const activeOverlayRef = useRef(activeOverlay);
  activeOverlayRef.current = activeOverlay;
  const showMenuDropRef = useRef(showMenuDrop);
  showMenuDropRef.current = showMenuDrop;
  const showSearchRef = useRef(showSearch);
  showSearchRef.current = showSearch;
  const expandedDishIdsRef = useRef(expandedDishIds);
  expandedDishIdsRef.current = expandedDishIds;
  const showExitConfirmRef = useRef(showExitConfirm);
  showExitConfirmRef.current = showExitConfirm;

  useEffect(() => {
    window.history.pushState({ appLayer: 'main' }, "");
    const handlePopState = (e) => {
      window.history.pushState({ appLayer: 'main' }, "");

      if (showExitConfirmRef.current) {
        setShowExitConfirm(false);
        return;
      }
      if (activeOverlayRef.current !== null) {
        setActiveOverlay(null);
        return;
      }
      if (showMenuDropRef.current) {
        setShowMenuDrop(false);
        return;
      }
      if (showSearchRef.current) {
        setShowSearch(false);
        return;
      }
      const expandedIds = Object.keys(expandedDishIdsRef.current).filter(k => expandedDishIdsRef.current[k]);
      if (expandedIds.length > 0) {
        setExpandedDishIds({});
        return;
      }

      setShowExitConfirm(true);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);`;

code = code.replace(badBlock, "");

const anchor = `  // Toasts
  const [toast, setToast] = useState<{ text: string; show: boolean }>({ text: "", show: false });`;

const newBlock = `  // Toasts
  const [toast, setToast] = useState<{ text: string; show: boolean }>({ text: "", show: false });

  // Exit Confirmation State
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Refs for back button history handler
  const activeOverlayRef = useRef(activeOverlay);
  activeOverlayRef.current = activeOverlay;
  const showMenuDropRef = useRef(showMenuDrop);
  showMenuDropRef.current = showMenuDrop;
  const showSearchRef = useRef(showSearch);
  showSearchRef.current = showSearch;
  const expandedDishIdsRef = useRef(expandedDishIds);
  expandedDishIdsRef.current = expandedDishIds;
  const showExitConfirmRef = useRef(showExitConfirm);
  showExitConfirmRef.current = showExitConfirm;

  useEffect(() => {
    window.history.pushState({ appLayer: 'main' }, "");
    const handlePopState = (e) => {
      window.history.pushState({ appLayer: 'main' }, "");

      if (showExitConfirmRef.current) {
        setShowExitConfirm(false);
        return;
      }
      if (activeOverlayRef.current !== null) {
        setActiveOverlay(null);
        return;
      }
      if (showMenuDropRef.current) {
        setShowMenuDrop(false);
        return;
      }
      if (showSearchRef.current) {
        setShowSearch(false);
        return;
      }
      const expandedIds = Object.keys(expandedDishIdsRef.current).filter(k => expandedDishIdsRef.current[k]);
      if (expandedIds.length > 0) {
        setExpandedDishIds({});
        return;
      }

      setShowExitConfirm(true);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);`;

code = code.replace(anchor, newBlock);
fs.writeFileSync('src/App.tsx', code);
console.log("Moved back button logic!");
