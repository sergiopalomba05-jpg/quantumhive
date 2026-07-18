/**
 * QuantumHive Bus Client
 * Cliente ligero para conectarse al Agent Bus desde cualquier VM/entorno.
 * 
 * Uso:
 *   const client = new BusClient('vm-esta');
 *   await client.register('dev-01', 'Dev_01', 'developer');
 *   client.startHeartbeat();
 *   client.onEvent((event) => console.log(event));
 *   await client.publish('task_complete', { result: 'Done!' });
 */

class BusClient {
  constructor(source, busUrl = 'http://localhost:8080/api') {
    this.source = source;
    this.busUrl = busUrl;
    this.agentId = null;
    this.agentName = null;
    this.lastCheck = Date.now();
    this.heartbeatInterval = null;
    this.pollInterval = null;
    this.eventCallbacks = [];
  }

  async register(agentId, agentName, role, capabilities = []) {
    this.agentId = agentId;
    this.agentName = agentName;

    const res = await fetch(`${this.busUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId,
        agentName,
        role,
        source: this.source,
        capabilities,
      }),
    });

    if (!res.ok) throw new Error(`Register failed: ${res.statusText}`);
    return (await res.json()).id;
  }

  startHeartbeat(intervalMs = 30000) {
    this.heartbeatInterval = setInterval(async () => {
      try {
        await fetch(`${this.busUrl}/heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: this.agentId,
            agentName: this.agentName,
            source: this.source,
            status: 'online',
          }),
        });
      } catch (err) {
        console.error('Heartbeat failed:', err.message);
      }
    }, intervalMs);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  async publish(eventType, payload = {}, target = undefined) {
    const res = await fetch(`${this.busUrl}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: this.agentId,
        agentName: this.agentName,
        eventType,
        payload,
        source: this.source,
        target,
      }),
    });

    if (!res.ok) throw new Error(`Publish failed: ${res.statusText}`);
    return (await res.json()).eventId;
  }

  onEvent(callback) {
    this.eventCallbacks.push(callback);
  }

  startPolling(intervalMs = 5000) {
    this.pollInterval = setInterval(async () => {
      try {
        const res = await fetch(
          `${this.busUrl}/events/${this.agentId}?since=${this.lastCheck}`,
        );
        const { events } = await res.json();

        for (const event of events) {
          for (const cb of this.eventCallbacks) {
            cb(event);
          }
        }

        this.lastCheck = Date.now();
      } catch (err) {
        console.error('Poll failed:', err.message);
      }
    }, intervalMs);
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  async getActiveAgents() {
    const res = await fetch(`${this.busUrl}/agents`);
    return (await res.json()).agents;
  }

  async unregister() {
    this.stopHeartbeat();
    this.stopPolling();

    await fetch(`${this.busUrl}/unregister`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: this.agentId }),
    });
  }
}

// Export for Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BusClient };
}
if (typeof window !== 'undefined') {
  window.BusClient = BusClient;
}
