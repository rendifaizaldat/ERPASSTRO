import React from "react";
import { usePos } from "../core/PosProvider";

export const CashierCard: React.FC = () => {
  const { state, appendSale } = usePos();
  const prod01 = state.inventory["PROD-01"] || { stock: 0 };

  const onCheckout = () => {
    appendSale([{ sku: "PROD-01", qty: 1 }], 100000);
  };

  return (
    <div
      style={{
        border: "1px solid #444",
        padding: "20px",
        borderRadius: "12px",
      }}
    >
      <h3>Produk: PROD-01</h3>
      <p>
        Stok Saat Ini:{" "}
        <span style={{ fontSize: "1.5em", fontWeight: "bold" }}>
          {prod01.stock}
        </span>
      </p>
      <button
        onClick={onCheckout}
        disabled={prod01.stock <= 0}
        style={{
          padding: "12px 24px",
          backgroundColor: prod01.stock > 0 ? "#007bff" : "#ccc",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        Jual 1 Unit (Rp100.000)
      </button>
    </div>
  );
};
