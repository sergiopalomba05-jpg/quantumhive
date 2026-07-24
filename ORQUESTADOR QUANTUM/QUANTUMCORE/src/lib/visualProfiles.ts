export interface VisualProfile {
  key: 'command-center' | 'workflow' | 'agents' | 'systems' | 'capture' | 'default';
  backgroundImage: string;
  cardTexture: string;
  sidebarTexture: string;
  sidebarImage: string;
  topPanelImage: string;
  logoLockup: string;
  overlayOpacity: number;
  backgroundPosition: string;
}

const asset = (name: string) => `/brand/curated/${name}`;

export const VISUAL_PROFILES: Record<VisualProfile['key'], VisualProfile> = {
  'command-center': {
    key: 'command-center',
    backgroundImage: asset('bg-dashboard-command.jpeg'),
    cardTexture: asset('texture-card-honeycomb.jpeg'),
    sidebarTexture: asset('texture-sidebar-graphite.jpeg'),
    sidebarImage: asset('sidebar-primary.jpeg'),
    topPanelImage: asset('top-panel-primary.jpeg'),
    logoLockup: asset('logo-lockup.jpeg'),
    overlayOpacity: 0.22,
    backgroundPosition: 'center',
  },
  workflow: {
    key: 'workflow',
    backgroundImage: asset('bg-workflow-canvas.jpeg'),
    cardTexture: asset('texture-card-honeycomb.jpeg'),
    sidebarTexture: asset('texture-sidebar-graphite.jpeg'),
    sidebarImage: asset('sidebar-primary.jpeg'),
    topPanelImage: asset('top-panel-primary.jpeg'),
    logoLockup: asset('logo-lockup.jpeg'),
    overlayOpacity: 0.18,
    backgroundPosition: 'center',
  },
  agents: {
    key: 'agents',
    backgroundImage: asset('bg-agent-builder.jpeg'),
    cardTexture: asset('texture-organic-hive.jpeg'),
    sidebarTexture: asset('texture-sidebar-graphite.jpeg'),
    sidebarImage: asset('sidebar-primary.jpeg'),
    topPanelImage: asset('top-panel-primary.jpeg'),
    logoLockup: asset('logo-lockup.jpeg'),
    overlayOpacity: 0.2,
    backgroundPosition: 'center',
  },
  systems: {
    key: 'systems',
    backgroundImage: asset('bg-chip-systems.jpeg'),
    cardTexture: asset('texture-card-honeycomb.jpeg'),
    sidebarTexture: asset('texture-sidebar-graphite.jpeg'),
    sidebarImage: asset('sidebar-primary.jpeg'),
    topPanelImage: asset('top-panel-primary.jpeg'),
    logoLockup: asset('logo-lockup.jpeg'),
    overlayOpacity: 0.19,
    backgroundPosition: 'center',
  },
  capture: {
    key: 'capture',
    backgroundImage: asset('bg-mobile-hive.jpeg'),
    cardTexture: asset('texture-organic-hive.jpeg'),
    sidebarTexture: asset('texture-sidebar-graphite.jpeg'),
    sidebarImage: asset('sidebar-primary.jpeg'),
    topPanelImage: asset('top-panel-primary.jpeg'),
    logoLockup: asset('logo-lockup.jpeg'),
    overlayOpacity: 0.16,
    backgroundPosition: 'center 35%',
  },
  default: {
    key: 'default',
    backgroundImage: asset('bg-global-command.jpeg'),
    cardTexture: asset('texture-card-honeycomb.jpeg'),
    sidebarTexture: asset('texture-sidebar-graphite.jpeg'),
    sidebarImage: asset('sidebar-primary.jpeg'),
    topPanelImage: asset('top-panel-primary.jpeg'),
    logoLockup: asset('logo-lockup.jpeg'),
    overlayOpacity: 0.17,
    backgroundPosition: 'center',
  },
};

const ROUTE_PROFILES: Array<{ profile: VisualProfile['key']; paths: string[] }> = [
  { profile: 'command-center', paths: ['/', '/start', '/brief', '/approvals', '/events'] },
  { profile: 'workflow', paths: ['/planner', '/projects', '/tasks', '/repo-connector'] },
  { profile: 'agents', paths: ['/agent-builder', '/agents', '/chat', '/channels', '/live-assistant'] },
  { profile: 'systems', paths: ['/mcp-hub', '/worker-registry', '/brain-registry', '/models', '/cloud', '/dev-env', '/connections', '/databases', '/workspace'] },
  { profile: 'capture', paths: ['/ideas', '/video-inbox', '/voice'] },
];

export function getVisualProfileForPath(pathname: string): VisualProfile {
  const exactMatch = ROUTE_PROFILES.find(({ paths }) => paths.includes(pathname));
  if (exactMatch) {
    return VISUAL_PROFILES[exactMatch.profile];
  }

  const prefixMatch = ROUTE_PROFILES.find(({ paths }) => paths.some((path) => path !== '/' && pathname.startsWith(`${path}/`)));
  return prefixMatch ? VISUAL_PROFILES[prefixMatch.profile] : VISUAL_PROFILES.default;
}

export function createVisualProfileStyle(profile: VisualProfile): Record<string, string> {
  return {
    '--qh-bg-image': `url('${profile.backgroundImage}')`,
    '--qh-card-texture': `url('${profile.cardTexture}')`,
    '--qh-sidebar-texture': `url('${profile.sidebarTexture}')`,
    '--qh-sidebar-image': `url('${profile.sidebarImage}')`,
    '--qh-top-panel-image': `url('${profile.topPanelImage}')`,
    '--qh-logo-lockup': `url('${profile.logoLockup}')`,
    '--qh-bg-opacity': String(profile.overlayOpacity),
    '--qh-bg-position': profile.backgroundPosition,
  };
}
