import { expect, test, describe } from "vitest";
import { parseEvent } from "../src/events";

describe("Event Parsing & Validation", () => {
  test("Reject payload with empty modifiers", () => {
    const invalidPayload = {
      type: "ORDER_CREATED",
      payload: {
        orderId: "123",
        tableLabel: "T1",
        customerName: null,
        guestCount: 2,
        operatorId: "op-1",
        businessDate: "1970-01-01",
        items: [
          {
            id: "i-1",
            productId: "p-1",
            skuSnapshot: "sku-1",
            nameSnapshot: "Product 1",
            basePriceSnapshot: 10000,
            qty: 1,
            modifiers: [
              { modifierSku: "", name: "", price: 0 } // invalid
            ]
          }
        ]
      }
    };

    expect(() => parseEvent(invalidPayload)).toThrowError("Invalid Event Payload Structure");
  });

  test("Reject payload with circular reference", () => {
    const obj: any = { type: "SETTINGS_UPDATED", payload: {} };
    obj.payload.self = obj; // circular

    expect(() => parseEvent(obj)).toThrowError();
  });
});
