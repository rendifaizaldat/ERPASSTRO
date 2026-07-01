import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportLedgerToJson, ledger } from './instances';

describe('exportLedgerToJson', () => {
  let mockAnchor: HTMLAnchorElement;
  let createElementSpy: any;
  let appendChildSpy: any;
  let removeChildSpy: any;
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;

  beforeEach(() => {
    vi.clearAllMocks();

    originalCreateObjectURL = global.URL.createObjectURL;
    originalRevokeObjectURL = global.URL.revokeObjectURL;

    global.URL.createObjectURL = vi.fn(() => 'mock-url');
    global.URL.revokeObjectURL = vi.fn();

    // Mock the navigator methods
    Object.assign(navigator, {
      canShare: vi.fn(),
      share: vi.fn(),
    });

    mockAnchor = {
      href: '',
      download: '',
      click: vi.fn(),
    } as unknown as HTMLAnchorElement;

    createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor);
    appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor);
    removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockAnchor);
  });

  afterEach(() => {
    global.URL.createObjectURL = originalCreateObjectURL;
    global.URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
  });

  it('should successfully export ledger to JSON using standard download when Web Share is not available', async () => {
    // Arrange
    navigator.canShare = vi.fn().mockReturnValue(false);

    const events = [{ type: 'TEST_EVENT', payload: { id: 1 } }];
    // The actual function uses replay:
    // await ledger.replay((ev: any) => { events.push(ev); });
    vi.spyOn(ledger, 'replay').mockImplementation(async (callback) => {
      events.forEach(callback);
    });

    // Act
    await exportLedgerToJson('branch1');

    // Assert
    expect(ledger.replay).toHaveBeenCalled();
    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(mockAnchor.href).toBe('mock-url');
    expect(mockAnchor.download).toMatch(/^Backup_EOD_branch1_\d{4}-\d{2}-\d{2}_\d{4}\.json$/);
    expect(appendChildSpy).toHaveBeenCalledWith(mockAnchor);
    expect(mockAnchor.click).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalledWith(mockAnchor);
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('mock-url');
  });

  it('should use Web Share API if available and canShare returns true', async () => {
    // Arrange
    navigator.canShare = vi.fn().mockReturnValue(true);
    navigator.share = vi.fn().mockResolvedValue(undefined);

    const events = [{ type: 'TEST_EVENT', payload: { id: 1 } }];
    vi.spyOn(ledger, 'replay').mockImplementation(async (callback) => {
      events.forEach(callback);
    });

    // Act
    await exportLedgerToJson('branch2');

    // Assert
    expect(navigator.canShare).toHaveBeenCalled();
    expect(navigator.share).toHaveBeenCalled();
    expect(mockAnchor.click).not.toHaveBeenCalled(); // Fallback download should not occur
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('mock-url');
  });

  it('should fallback to standard download if Web Share API fails', async () => {
    // Arrange
    navigator.canShare = vi.fn().mockReturnValue(true);
    navigator.share = vi.fn().mockRejectedValue(new Error('User cancelled'));

    const events = [{ type: 'TEST_EVENT', payload: { id: 1 } }];
    vi.spyOn(ledger, 'replay').mockImplementation(async (callback) => {
      events.forEach(callback);
    });

    // Act
    await exportLedgerToJson('branch3');

    // Assert
    expect(navigator.share).toHaveBeenCalled();
    // Fallback should occur
    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(mockAnchor.href).toBe('mock-url');
    expect(mockAnchor.click).toHaveBeenCalled();
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('mock-url');
  });

  it('should throw an error if no events are found', async () => {
    // Arrange
    vi.spyOn(ledger, 'replay').mockImplementation(async (callback) => {
      // Empty events
    });

    // Act & Assert
    await expect(exportLedgerToJson('branch4')).rejects.toThrow('Tidak ada data transaksi hari ini untuk dibackup.');
    expect(createElementSpy).not.toHaveBeenCalled();
    expect(global.URL.createObjectURL).not.toHaveBeenCalled();
  });
});
