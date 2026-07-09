import { useState, useEffect } from "react";
import { wmsProjector, eventBus } from "../instances";

export interface CoaData {
  id: string;
  code: string;
  name: string;
  type: string;
  normalBalance: string;
  isHeader: boolean;
  parent: string | null;
  desc: string | null;
  status: string;
}

export function useCoa(isInitialized: boolean) {
  const [coas, setCoas] = useState<CoaData[]>([]);

  useEffect(() => {
    if (!isInitialized) return;

    // Initial state
    setCoas(wmsProjector.getState().coas as CoaData[]);

    // Subscribe to projector state changes
    const subscription = wmsProjector.state$.subscribe((state) => {
       setCoas(state.coas as CoaData[]);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isInitialized]);

  // Dummy fetchCoaData to maintain compatibility if called explicitly,
  // though sync should handle hydration naturally via event replay.
  const fetchCoaData = async () => {
      // In the new architecture, sync pulls events and replay fills projector state.
      // This is a no-op or could manually trigger sync.
      console.log("fetchCoaData called. In event-sourcing, state is built from events.");
  };

  return {
    coas,
    fetchCoaData,
  };
}
