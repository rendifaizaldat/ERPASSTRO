export class PrinterService {
  private offlineQueue: any[] = [];

  constructor() {
    this.loadOfflineQueue();
  }

  private loadOfflineQueue() {
    try {
      const queue = localStorage.getItem("ASSTRO_PRINTER_QUEUE");
      if (queue) {
        this.offlineQueue = JSON.parse(queue);
      }
    } catch (e) {
      this.offlineQueue = [];
    }
  }

  private saveOfflineQueue() {
    localStorage.setItem("ASSTRO_PRINTER_QUEUE", JSON.stringify(this.offlineQueue));
  }

  public async printReceipt(payload: any, profile: any) {
    console.log("Printing via ", profile?.printerSettings);

    // Abstracted logic for secure websocket to proxy
    try {
      const token = localStorage.getItem("ASSTRO_DEVICE_TOKEN");
      const printerIp = profile?.printerSettings?.ip || "localhost";
      const wsUrl = `ws://${printerIp}:8080/print?auth=${token}`;

      console.log(`Connecting to secure proxy at ${wsUrl}`);
      // Simulate sending via websocket
      if (!navigator.onLine) throw new Error("Offline, queueing job");

      console.log("Sent job to proxy");
      this.processQueue(profile); // Attempt to process queue
    } catch (err) {
      console.log("Printer proxy unreachable or offline. Queueing...");
      this.offlineQueue.push({ type: "RECEIPT", payload, profile, timestamp: Date.now() });
      this.saveOfflineQueue();
    }
  }

  public async processQueue(profile: any) {
    if (this.offlineQueue.length === 0) return;
    console.log(`Processing ${this.offlineQueue.length} queued jobs...`);
    const remaining = [];

    for (const job of this.offlineQueue) {
      try {
        const token = localStorage.getItem("ASSTRO_DEVICE_TOKEN");
        const printerIp = job.profile?.printerSettings?.ip || "localhost";
        const wsUrl = `ws://${printerIp}:8080/print?auth=${token}`;
        console.log(`Sending queued job to ${wsUrl}`);
        // Simulate websocket send
      } catch (err) {
         remaining.push(job);
      }
    }

    this.offlineQueue = remaining;
    this.saveOfflineQueue();
  }

  public printKitchenOrder(payload: any, profile: any) {
    console.log("Printing kitchen order via", profile?.printerSettings);
    this.printReceipt(payload, profile); // Reuse logic for queueing
  }
}

export const printerService = new PrinterService();
