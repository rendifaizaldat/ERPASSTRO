// tools/auditor/db-checker.ts

const API_BASE_URL = "http://localhost:4000/api/audit";

export const dbChecker = {
  async getLatestShift() {
    const res = await fetch(`${API_BASE_URL}/latest-shift`);
    return res.json();
  },

  async getDeviceProfile(deviceId: string) {
    const res = await fetch(`${API_BASE_URL}/device-profile/${deviceId}`);
    return res.json();
  },

  async getCategoryByName(name: string) {
    const res = await fetch(`${API_BASE_URL}/category-by-name/${name}`);
    return res.json();
  },

  async getProductBySku(sku: string) {
    const res = await fetch(`${API_BASE_URL}/product-by-sku/${sku}`);
    return res.json();
  },

  async getEventByType(eventType: string, limit = 20) {
    const res = await fetch(`${API_BASE_URL}/events-by-type/${eventType}?limit=${limit}`);
    return res.json();
  },

  async getEventByTypeAndPayloadField(
    eventType: string,
    field: string,
    value: string,
  ) {
    const res = await fetch(`${API_BASE_URL}/event-by-type-and-field`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type: eventType, field, value }),
    });
    return res.json();
  },

  async getOrphanProducts() {
    const res = await fetch(`${API_BASE_URL}/orphan-products`);
    return res.json();
  },

  async resetDatabase() {
    console.log("[DB] Mereset data transaksi server untuk audit...");
    await fetch(`${API_BASE_URL}/reset-database`, { method: "POST" });
    console.log("[DB] Database Server bersih.");
  },

  async close() {
    // No longer needed
  },

  async getServerState() {
    const res = await fetch(`${API_BASE_URL}/state`);
    return res.json();
  }
};
