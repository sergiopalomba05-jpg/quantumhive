import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createVisualProfileStyle, getVisualProfileForPath } from '../src/lib/visualProfiles';

describe('QuantumHive visual profiles', () => {
  it('uses a command center background for dashboard routes', () => {
    const profile = getVisualProfileForPath('/');

    assert.equal(profile.key, 'command-center');
    assert.equal(profile.backgroundImage, '/brand/curated/bg-dashboard-command.jpeg');
  });

  it('uses a muted workflow texture for the visual planner', () => {
    const profile = getVisualProfileForPath('/planner');

    assert.equal(profile.key, 'workflow');
    assert.equal(profile.backgroundImage, '/brand/curated/bg-workflow-canvas.jpeg');
  });

  it('uses agent-builder imagery for agent creation routes', () => {
    const profile = getVisualProfileForPath('/agent-builder');

    assert.equal(profile.key, 'agents');
    assert.equal(profile.backgroundImage, '/brand/curated/bg-agent-builder.jpeg');
  });

  it('uses microchip imagery for system and worker routes', () => {
    const profile = getVisualProfileForPath('/mcp-hub');

    assert.equal(profile.key, 'systems');
    assert.equal(profile.backgroundImage, '/brand/curated/bg-chip-systems.jpeg');
  });

  it('creates CSS custom properties for the selected profile', () => {
    const style = createVisualProfileStyle(getVisualProfileForPath('/planner'));

    assert.equal(style['--qh-bg-image'], "url('/brand/curated/bg-workflow-canvas.jpeg')");
    assert.equal(style['--qh-card-texture'], "url('/brand/curated/texture-card-honeycomb.jpeg')");
    assert.equal(style['--qh-sidebar-image'], "url('/brand/curated/sidebar-primary.jpeg')");
    assert.equal(style['--qh-top-panel-image'], "url('/brand/curated/top-panel-primary.jpeg')");
    assert.equal(style['--qh-bg-opacity'], '0.18');
  });
});
