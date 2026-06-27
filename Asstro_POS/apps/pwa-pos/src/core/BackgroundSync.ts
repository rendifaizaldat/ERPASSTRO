// apps/pwa-pos/src/core/BackgroundSync.ts
import { ledger } from "./instances";
import { io, Socket } from "socket.io-client";

class SyncWorker {
  private isSyncing = false;
  private hasPendingPush = false;
  private isPulling = false;
  private socket: Socket | null = null;
  private pullTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private retryCount = 0;
  private deviceId = "";

  // ============================================================
  //  HELPER: BACA SEQUENCE PURE (TANPA HACK/VALIDASI REGEX)
  // ============================================================
  private getSequence(): string {
    const seq = localStorage.getItem("ASSTRO_LAST_PULL_SEQUENCE");
    // Jika kosong, null, atau "0", kembalikan "0".
    // Karena kita memakai ULID, string "0" secara leksikografis
    // selalu lebih kecil dari ULID apapun. Ini menjamin full-pull di awal.
    if (!seq) return "0";
    return seq;
  }

  // ============================================================
  //  PUBLIC METHODS
  // ============================================================
  start(branchId: string = "", deviceId: string = "") {
    this.deviceId = deviceId || localStorage.getItem("ASSTRO_DEVICE_ID") || "";
    const bId = branchId || localStorage.getItem("ASSTRO_BRANCH_ID") || "";

    window.addEventListener("online", () => {
      this.retryCount = 0;
      this.triggerPush();
      this.triggerDebouncedPull();
    });

    this.connectWebSocket(bId, this.deviceId);

    if (navigator.onLine) {
      this.triggerPush();
      this.triggerDebouncedPull();
    }
  }

  stop() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    if (this.pullTimeoutId) {
      clearTimeout(this.pullTimeoutId);
    }
  }

  async forceTrigger() {
    localStorage.setItem("ASSTRO_SYNC_INDEX", "0");
    this.retryCount = 0;
    await this.triggerPush(true);
    await this.executeDeltaPull();
  }

  public triggerDebouncedPull() {
    if (this.pullTimeoutId) clearTimeout(this.pullTimeoutId);

    this.pullTimeoutId = setTimeout(async () => {
      if (this.isPulling || !navigator.onLine) return;
      this.isPulling = true;

      try {
        await this.executeDeltaPull();
      } catch (error) {
        console.error("[SYNC] Delta Pull Error:", error);
      } finally {
        this.isPulling = false;
      }
    }, 1500);
  }

  public async triggerPush(isManual: boolean = false) {
    if (!navigator.onLine && !isManual) return;

    if (this.isSyncing && !isManual) {
      this.hasPendingPush = true;
      return;
    }

    this.isSyncing = true;

    try {
      const token = localStorage.getItem("ASSTRO_DEVICE_TOKEN");
      if (!token) {
        this.isSyncing = false;
        return;
      }

      const allEvents: any[] = [];
      await ledger.replay((ev) => {
        allEvents.push(ev);
      });

      const lastIndex = Number(
        localStorage.getItem("ASSTRO_SYNC_INDEX") || "0",
      );

      const eventsToPush = allEvents
        .slice(lastIndex)
        .filter((ev) => !ev.metadata?._isRemote);

      if (eventsToPush.length === 0) {
        this.isSyncing = false;
        this.retryCount = 0;
        localStorage.setItem("ASSTRO_SYNC_INDEX", allEvents.length.toString());
        return;
      }

      const API_URL = import.meta.env?.VITE_API_URL || "http://localhost:4000";

      const response = await fetch(`${API_URL}/api/sync/push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ events: eventsToPush }),
      });

      if (response.ok) {
        localStorage.setItem("ASSTRO_SYNC_INDEX", allEvents.length.toString());
        this.retryCount = 0;
        window.dispatchEvent(new CustomEvent("SYNC_SUCCESS"));
      } else if (response.status === 401) {
        window.dispatchEvent(new CustomEvent("REQUIRE_REAUTH"));
        throw new Error("401");
      } else {
        throw new Error("Server menolak paket.");
      }
    } catch (error: any) {
      this.retryCount++;
      window.dispatchEvent(
        new CustomEvent("SYNC_ERROR", { detail: error.message }),
      );
      const backoffDelay = Math.min(
        Math.pow(5, this.retryCount) * 1000,
        300000,
      );

      if (error.message.includes("23503")) {
        localStorage.setItem("ASSTRO_SYNC_INDEX", "0");
      }

      setTimeout(() => this.triggerPush(), backoffDelay);
    } finally {
      this.isSyncing = false;

      if (this.hasPendingPush) {
        this.hasPendingPush = false;
        this.triggerPush();
      }
    }
  }

  // ============================================================
  //  PRIVATE METHODS
  // ============================================================
  private connectWebSocket(branchId: string, deviceId: string) {
    const API_URL = import.meta.env?.VITE_API_URL || "http://localhost:4000";

    this.socket = io(API_URL, {
      query: { branchId, deviceId },
    });

    this.socket.on(
      "SYNC_HINT",
      (payload: { latestSequence: string; sourceDeviceId: string }) => {
        console.log("[SYNC_HINT RECEIVED]", payload);

        if (payload.sourceDeviceId === this.deviceId) {
          console.log("[SYNC_HINT] Ignored - from same device");
          return;
        }

        const localSequence = this.getSequence();

        console.log(
          "[SYNC_SEQUENCE]",
          "remote:",
          payload.latestSequence,
          "local:",
          localSequence,
          "shouldPull:",
          payload.latestSequence > localSequence,
        );

        // Perbandingan leksikografis (string) sangat aman selama
        // seluruh ekosistem komit menggunakan ULID.
        if (payload.latestSequence > localSequence) {
          this.triggerDebouncedPull();
        }
      },
    );
  }

  private async executeDeltaPull() {
    const since = this.getSequence();
    const token = localStorage.getItem("ASSTRO_DEVICE_TOKEN");
    if (!token) return;

    const API_URL = import.meta.env?.VITE_API_URL || "http://localhost:4000";

    console.log("[PULL] since =", since);

    const response = await fetch(`${API_URL}/api/sync/pull?since=${since}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const newEvents = await response.json();
      console.log("[PULL EVENTS]", newEvents);

      if (newEvents.length > 0) {
        const highestSequence = newEvents[newEvents.length - 1].sequence_id;

        // --- SOLUSI: Simpan sequence apa adanya, asumsikan Backend (Source of Truth) memberikan data valid ---
        localStorage.setItem("ASSTRO_LAST_PULL_SEQUENCE", highestSequence);
        console.log("[PULL] Updated sequence to:", highestSequence);

        // Proses setiap event
        for (const ev of newEvents) {
          console.log("[PULL] Appending event:", ev.type);
          await ledger.appendEvent(ev.type, ev.payload, { _isRemote: true });

          // Broadcast event khusus untuk update finansial
          if (ev.type === "FINANCIAL_CONFIG_SYNCED") {
            const payload = ev.payload;
            window.dispatchEvent(
              new CustomEvent("FINANCIAL_CONFIG_UPDATED", {
                detail: {
                  taxRate: Number(payload.taxRate),
                  serviceRate: Number(payload.serviceRate),
                },
              }),
            );
            console.log(
              "[PULL] Dispatched FINANCIAL_CONFIG_UPDATED event",
              payload,
            );
          }
        }

        window.dispatchEvent(
          new CustomEvent("SYNC_PULL_SUCCESS", { detail: newEvents }),
        );
      }
    }
  }
}

export const backgroundSync = new SyncWorker();
