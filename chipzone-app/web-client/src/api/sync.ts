export const syncApi = {
  getLastSync: async () => null,
  sync: async () => ({ success: false, message: "Not supported" }),
  getStatus: async () => ({
    isRunning: false,
    running: false, // Alias for legacy code
    ipAddresses: [],
    port: 8080,
    activeConnections: 0
  }),
  start: async (_port: number) => ({ success: false }),
  stop: async () => ({ success: false })
};
