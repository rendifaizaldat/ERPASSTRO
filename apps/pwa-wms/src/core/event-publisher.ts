import { ledger, eventBus } from "./instances";

export const publishEvent = async (type: string, id: string, payload: any) => {
   try {
       console.log(`[publishEvent] Appending ${type} with ID ${id}`, payload);
       await ledger.appendEvent(type, payload);
       // eventBus is already called inside ledger.appendEvent override in instances.ts
       // No need to dispatch extra custom events unless required by old components.
       // The projector will automatically process it and emit state.
       return true;
   } catch(err) {
       console.error(`[publishEvent] Error publishing ${type}`, err);
       throw err;
   }
}

export const publishEventsBulk = async (events: { type: string, id: string, payload: any }[]) => {
   try {
       console.log(`[publishEventsBulk] Appending ${events.length} events`);
       for (const ev of events) {
         await ledger.appendEvent(ev.type, ev.payload);
       }
       return true;
   } catch(err) {
       console.error(`[publishEventsBulk] Error publishing`, err);
       throw err;
   }
}
