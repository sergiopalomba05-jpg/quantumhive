export function getServerPort(env: { PORT?: string } = {}) {
  const port = Number(env.PORT);
  return Number.isFinite(port) && port > 0 ? port : 3000;
}

export function resolveLiveSocketUrl(protocol: string, host: string) {
  const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${host}/live`;
}
