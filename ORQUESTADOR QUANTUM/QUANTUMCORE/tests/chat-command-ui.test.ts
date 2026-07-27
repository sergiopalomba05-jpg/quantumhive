import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BRAIN_MODELS } from '../src/core/brainRouter';

const root = process.cwd();
const readProjectFile = (path: string) => readFileSync(join(root, path), 'utf8');

describe('QuantumCore chat command UI', () => {
  it('uses compact model labels and provider logo labels for the Brain Router', () => {
    const flash = BRAIN_MODELS.find((model) => model.id === 'gemini-2.5-flash');
    const pro = BRAIN_MODELS.find((model) => model.id === 'gemini-2.5-pro');
    const gpt = BRAIN_MODELS.find((model) => model.id === 'gpt-chat-latest');
    const claude = BRAIN_MODELS.find((model) => model.id === 'claude-sonnet-5');

    assert.equal(flash?.shortLabel, '2.5 FLASH');
    assert.equal(pro?.shortLabel, '2.5 PRO');
    assert.equal(gpt?.logoLabel, 'OpenAI');
    assert.equal(claude?.logoLabel, 'Anthropic');
  });

  it('renders the brain router cards in the chat header', () => {
    const chat = readProjectFile('src/pages/ChatCentral.tsx');
    const css = readProjectFile('src/index.css');

    assert.equal(BRAIN_MODELS.length >= 5, true);
    assert.match(chat, /function ProviderLogo/);
    assert.match(chat, /header-brain-model-row/);
    assert.match(chat, /brain-router-card-header/);
    assert.match(chat, /selectBrainModel/);
    assert.match(css, /\.brain-router-card[\s\S]*min-width:\s*112px/);
  });

  it('removes the global top action bar and exposes a collapsible desktop sidebar', () => {
    const layout = readProjectFile('src/components/Layout.tsx');

    assert.doesNotMatch(layout, /<header\b/);
    assert.doesNotMatch(layout, />\s*(Aprender|Guía|Reiniciar|Contexto|Exportar)\s*</);
    assert.match(layout, /sidebarCollapsed/);
    assert.match(layout, /aria-label="Ocultar navegación"/);
    assert.match(layout, /sidebar-edge-toggle/);
    assert.doesNotMatch(layout, /Ocultar navegación"[\s\S]{0,260}glass-button/);
  });

  it('lets the chat occupy the full content plane without the old centered card cap', () => {
    const chat = readProjectFile('src/pages/ChatCentral.tsx');

    assert.match(chat, /data-chat-shell="fullscreen"/);
    assert.doesNotMatch(chat, /max-w-7xl/);
    assert.match(chat, /chat-command-shell/);
    assert.match(chat, /dominus-response/);
    assert.match(chat, /<textarea/);
    assert.doesNotMatch(chat, /Potenciar inteligencia/);
    assert.doesNotMatch(chat, />\s*Thinking Mode\s*</);
  });

  it('keeps only compact functional controls in the chat header', () => {
    const chat = readProjectFile('src/pages/ChatCentral.tsx');
    const css = readProjectFile('src/index.css');

    assert.match(chat, /domin(us|us)-header-router|dominus-header-router/);
    assert.match(chat, /V\.S 2 Cerebros/);
    assert.match(chat, /maxVsBrains/);
    assert.match(chat, /reasoningLevel/);
    assert.match(chat, /reasoning-level-dropdown/);
    assert.match(chat, /Esfuerzo de pensamiento/);
    assert.match(chat, /brain-mode-dropdown/);
    assert.match(chat, /modelId:\s*reasoningLevel === 'high' \? 'gemini-2\.5-pro'/);
    assert.doesNotMatch(chat, /<option value="council">Consejo<\/option>/);
    assert.doesNotMatch(chat, /border-b border-white\/10 bg-slate-950\/20 p-3 space-y-3 shrink-0/);
    assert.match(css, /\.dominus-header-router[\s\S]*display:\s*flex/);
    assert.match(css, /\.brain-mode-dropdown/);
    assert.match(css, /\.reasoning-level-dropdown/);
    assert.match(css, /\.header-brain-model-row/);
    assert.match(css, /\.sidebar-edge-toggle[\s\S]*top:\s*50%/);
    assert.match(css, /\.sidebar-nav-link[\s\S]*color:\s*#ffffff/);
  });

  it('moves the real QuantumCore brand to the lateral sidebar and removes it from the chat header', () => {
    const chat = readProjectFile('src/pages/ChatCentral.tsx');
    const sidebar = readProjectFile('src/components/Sidebar.tsx');

    assert.match(sidebar, /QuantumCore/);
    assert.match(sidebar, /quantumcore-sidebar-brand/);
    assert.match(sidebar, /\/brand\/custom\/quantumhive_isotipo_v01_transparente_recortado\.png/);
    assert.doesNotMatch(sidebar, /logo-lockup\.jpeg/);
    assert.doesNotMatch(chat, /QuantumCore/);
    assert.doesNotMatch(chat, /quantumcore-brand-logo/);
    assert.match(chat, /brain-mode-dropdown/);
    assert.doesNotMatch(chat, /<div className="text-sm font-bold text-slate-100">\{activeAgent\?\.name\}<\/div>/);
    assert.doesNotMatch(chat, /Online/);
    assert.doesNotMatch(chat, /Grounding:/);
  });

  it('uses the requested chat background and black text shadow for all sidebar labels', () => {
    const css = readProjectFile('src/index.css');

    assert.equal(existsSync(join(root, 'public/brand/custom/quantumhive_isotipo_v01_transparente_recortado.png')), true);
    assert.equal(existsSync(join(root, 'public/brand/custom/fondo-chat.jpeg')), true);
    assert.match(css, /--qh-chat-bg-image:\s*url\('\/brand\/custom\/fondo-chat\.jpeg'\)/);
    assert.match(css, /\.chat-glass-panel\.chat-conversation-panel[\s\S]*var\(--qh-chat-bg-image\)/);
    assert.match(css, /\.chat-bg-pattern-disabled/);
    assert.match(css, /\.sidebar-nav-link[\s\S]*text-shadow:[\s\S]*rgba\(0, 0, 0/);
    assert.match(css, /\.sidebar-section-label[\s\S]*text-shadow:[\s\S]*rgba\(0, 0, 0/);
    assert.match(css, /\.sidebar-nav-link[\s\S]*color:\s*#ffffff/);
    assert.match(css, /\.sidebar-section-label[\s\S]*color:\s*#ffffff/);
  });

  it('defines hardware-accelerated glass, tilt, stagger, and stealth sidebar classes', () => {
    const css = readProjectFile('src/index.css');
    const sidebar = readProjectFile('src/components/Sidebar.tsx');

    assert.match(css, /\.brain-router-card/);
    assert.match(css, /backdrop-filter:\s*blur\(20px\)/);
    assert.match(css, /will-change:\s*transform/);
    assert.match(css, /@keyframes\s+qh-stagger-in/);
    assert.match(css, /\.chat-message-reveal/);
    assert.match(css, /\.chat-composer-input/);
    assert.match(css, /\.sidebar-edge-toggle/);
    assert.match(css, /\.quantum-sidebar/);
    assert.match(sidebar, /sidebar-nav-link/);
    assert.match(sidebar, /sidebar-nav-active/);
    assert.match(sidebar, /sidebar-section-label/);
    assert.doesNotMatch(sidebar, /after:backdrop-blur/);
  });

  it('restores readable sidebar hover glow over the image background', () => {
    const css = readProjectFile('src/index.css');

    assert.match(css, /\.sidebar-nav-idle:hover[\s\S]*background:\s*rgba\(5, 8, 13/);
    assert.match(css, /\.sidebar-nav-idle:hover[\s\S]*box-shadow:[\s\S]*rgba\(0, 0, 0/);
    assert.match(css, /\.sidebar-nav-idle:hover[\s\S]*text-shadow:[\s\S]*rgba\(0, 0, 0/);
    assert.match(css, /\.sidebar-section-trigger:hover[\s\S]*background:\s*rgba\(5, 8, 13/);
    assert.match(css, /\.sidebar-section-trigger[\s\S]*font-weight:\s*950/);
    assert.match(css, /\.sidebar-section-label[\s\S]*font-size:\s*0\.8rem/);
    assert.match(css, /\.sidebar-section-label[\s\S]*letter-spacing:\s*0\.08em/);
    assert.match(css, /\.sidebar-section-trigger[\s\S]*background:\s*rgba\(2, 6, 23, 0\.42\)/);
    assert.match(css, /\.sidebar-nav-link[\s\S]*font-size:\s*0\.74rem/);
  });

  it('keeps the sidebar close control compact and visually integrated', () => {
    const layout = readProjectFile('src/components/Layout.tsx');
    const css = readProjectFile('src/index.css');

    assert.match(layout, /sidebarCollapsed/);
    assert.match(layout, /aria-label="Ocultar navegación"/);
    assert.match(layout, /aria-label="Mostrar navegación"/);
    assert.match(css, /\.sidebar-edge-toggle[\s\S]*width:\s*1\.85rem/);
    assert.match(css, /\.sidebar-edge-toggle[\s\S]*border-radius:\s*0 0\.85rem 0\.85rem 0/);
    assert.match(css, /\.sidebar-edge-toggle[\s\S]*background:\s*linear-gradient\(180deg, rgba\(4, 10, 22, 0\.96\), rgba\(2, 6, 23, 0\.98\)\)/);
    assert.match(css, /\.sidebar-edge-toggle[\s\S]*pointer-events:\s*auto/);
  });

  it('lets the chat header router stretch across the available plane', () => {
    const chat = readProjectFile('src/pages/ChatCentral.tsx');
    const css = readProjectFile('src/index.css');

    assert.match(chat, /chat-header-controls/);
    assert.match(css, /\.chat-header-controls[\s\S]*display:\s*flex/);
    assert.match(css, /\.chat-header-controls[\s\S]*width:\s*100%/);
    assert.match(css, /\.dominus-header-router[\s\S]*flex:\s*1\s+1\s+auto/);
    assert.match(css, /\.dominus-header-router[\s\S]*min-width:\s*0/);
    assert.match(css, /\.header-brain-model-row[\s\S]*flex:\s*1\s+1\s+auto/);
    assert.match(css, /\.header-brain-model-row[\s\S]*min-width:\s*0/);
    assert.doesNotMatch(css, /\.header-brain-model-row[\s\S]*max-width:\s*min\(44vw,\s*640px\)/);
  });
});
