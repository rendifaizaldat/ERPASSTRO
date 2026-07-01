import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateShiftExpectedTotals, useReportCalculations } from '../useReportCalculations';
import { usePos } from '../../PosProvider';

vi.mock('../../PosProvider', () => ({
  usePos: vi.fn(),
}));

describe('calculateShiftExpectedTotals', () => {
  it('should return 0 for both expectedCash and expectedNonCash with empty transactions', () => {
    const result = calculateShiftExpectedTotals([]);
    expect(result).toEqual({ expectedCash: 0, expectedNonCash: 0 });
  });

  it('should correctly sum expectedCash for CASH/TUNAI payment methods', () => {
    const transactions = [
      { payment_method: 'CASH', grand_total: 100 },
      { payment_method: 'TUNAI', grand_total: 50 },
    ];
    const result = calculateShiftExpectedTotals(transactions);
    expect(result.expectedCash).toBe(150);
    expect(result.expectedNonCash).toBe(0);
  });

  it('should correctly sum expectedNonCash for non-cash payment methods', () => {
    const transactions = [
      { payment_method: 'CARD', grand_total: 200 },
      { payment_method: 'QRIS', grand_total: 100 },
    ];
    const result = calculateShiftExpectedTotals(transactions);
    expect(result.expectedCash).toBe(0);
    expect(result.expectedNonCash).toBe(300);
  });

  it('should default to CASH if payment_method is missing', () => {
    const transactions = [
      { grand_total: 50 },
    ];
    const result = calculateShiftExpectedTotals(transactions);
    expect(result.expectedCash).toBe(50);
    expect(result.expectedNonCash).toBe(0);
  });

  it('should subtract refunded transactions from expectedCash if paid by CASH', () => {
    const transactions = [
      { payment_method: 'CASH', grand_total: 100 },
      { payment_method: 'CASH', grand_total: 50, status: 'REFUNDED' },
      { payment_method: 'CASH', grand_total: 20, is_refund: true },
      { payment_method: 'CASH', grand_total: 30, transactionType: 'REFUND' },
    ];
    const result = calculateShiftExpectedTotals(transactions);
    expect(result.expectedCash).toBe(0); // 100 - 50 - 20 - 30 = 0
  });

  it('should subtract refunded transactions from expectedNonCash if paid by non-cash', () => {
    const transactions = [
      { payment_method: 'CARD', grand_total: 200 },
      { payment_method: 'CARD', grand_total: 50, status: 'REFUNDED' },
    ];
    const result = calculateShiftExpectedTotals(transactions);
    expect(result.expectedNonCash).toBe(150);
  });
});

describe('useReportCalculations', () => {
  const mockedUsePos = vi.mocked(usePos);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle empty state', () => {
    mockedUsePos.mockReturnValue({ state: null } as any);
    const { result } = renderHook(() => useReportCalculations());

    expect(result.current.transactions).toEqual([]);
    expect(result.current.pettyCash).toEqual([]);
    expect(result.current.audits).toEqual([]);
    expect(result.current.modData.totalTrx).toBe(0);
    expect(result.current.pluData).toEqual([]);
  });

  it('should filter completed transactions and compute modData correctly', () => {
    const mockState = {
      currentShiftInitialCash: 1000,
      transactions: [
        {
          status: 'PAID',
          subtotal: 100,
          tax_amount: 10,
          service_amount: 5,
          grand_total: 115,
          payment_method: 'CASH',
          cashierName: 'Alice',
          waiterName: 'Bob',
          items: [
            { name: 'Burger', qty: 2, price: 50, category_name: 'Food' }
          ]
        },
        {
          status: 'PENDING',
          grand_total: 200
        }, // Should be ignored
        {
          status: 'COMPLETED',
          subtotal: 200,
          tax_amount: 20,
          service_amount: 10,
          grand_total: 230,
          payment_method: 'CARD',
          cashierName: 'Charlie',
          items: [
            { name: 'Soda', qty: 1, price: 200, category_name: 'Drink', refundedQty: 0 }
          ]
        }
      ],
      pettyCashTransactions: [
        { amount_requested: 50, status: 'COMPLETED', amount_returned: 10, cashier_issued_name: 'Dave' }, // net out = 40
        { amount_requested: 20, status: 'PENDING', cashier_issued_name: 'Alice' } // net out = 20
      ],
      auditLogs: [
        { type: 'VOID', totalAmount: 15 },
        { type: 'REFUND', totalAmount: 25 }
      ]
    };

    mockedUsePos.mockReturnValue({ state: mockState } as any);
    const { result } = renderHook(() => useReportCalculations());

    const { modData, pluData } = result.current;

    expect(modData.totalTrx).toBe(2);
    expect(modData.initialCash).toBe(1000);
    expect(modData.cashSales).toBe(115); // Only the CASH transaction
    expect(modData.totalGross).toBe(345); // 115 + 230
    expect(modData.totalNet).toBe(300); // 100 + 200
    expect(modData.totalTax).toBe(30); // 10 + 20
    expect(modData.totalService).toBe(15); // 5 + 10
    expect(modData.pettyCashOut).toBe(60); // 50 - 10 + 20
    expect(modData.totalVoid).toBe(15);
    expect(modData.totalRefund).toBe(25);

    // systemCash = initialCash + cashSales - pettyCashOut - totalRefund
    // systemCash = 1000 + 115 - 60 - 25 = 1030
    expect(modData.systemCash).toBe(1030);

    expect(modData.staffList).toEqual(expect.arrayContaining(['Alice', 'Bob', 'Charlie', 'Dave']));
    expect(modData.paymentSales).toEqual({ CASH: 115, CARD: 230 });
    expect(modData.catSales).toEqual({
      Food: { qty: 2, total: 100 },
      Drink: { qty: 1, total: 200 }
    });

    // pluData should be sorted by qty descending
    expect(pluData).toEqual([
      ['Burger', { qty: 2, total: 100 }],
      ['Soda', { qty: 1, total: 200 }]
    ]);
  });

  it('should handle item refundQty correctly in PLU and catSales calculations', () => {
    const mockState = {
      transactions: [
        {
          status: 'PAID',
          grand_total: 100,
          items: [
            { name: 'Pizza', qty: 3, refundedQty: 1, price: 10, category_name: 'Food' },
            { name: 'Cola', qty: 2, refundedQty: 2, price: 5, category_name: 'Drink' } // fully refunded, qty active = 0
          ]
        }
      ]
    };

    mockedUsePos.mockReturnValue({ state: mockState } as any);
    const { result } = renderHook(() => useReportCalculations());

    const { modData, pluData } = result.current;

    expect(modData.catSales).toEqual({
      Food: { qty: 2, total: 20 }
    });
    // Cola should not be included since activeQty is 0
    expect(modData.catSales.Drink).toBeUndefined();

    expect(pluData).toEqual([
      ['Pizza', { qty: 2, total: 20 }]
    ]);
  });
});
