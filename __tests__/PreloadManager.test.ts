import { describe, it, expect, vi } from 'vitest';
import { PreloadManager } from '../components/video/PreloadManager';

describe('PreloadManager', () => {
  it('returns correct initial window at index 0', () => {
    const pm = new PreloadManager({ totalItems: 10, windowSize: 1 });
    const window = pm.getWindow();
    expect(window.current).toBe(0);
    expect(window.preloadIndexes).toEqual([1]);
  });

  it('returns prev and next within bounds', () => {
    const pm = new PreloadManager({ totalItems: 10, windowSize: 1 });
    pm.updateCurrentIndex(5);
    const window = pm.getWindow();
    expect(window.current).toBe(5);
    expect(window.preloadIndexes).toContain(4);
    expect(window.preloadIndexes).toContain(6);
  });

  it('clamps at end of list', () => {
    const pm = new PreloadManager({ totalItems: 5, windowSize: 1 });
    pm.updateCurrentIndex(4);
    const window = pm.getWindow();
    expect(window.preloadIndexes).toEqual([3]);
  });

  it('supports larger window sizes', () => {
    const pm = new PreloadManager({ totalItems: 10, windowSize: 2 });
    pm.updateCurrentIndex(5);
    const window = pm.getWindow();
    expect(window.preloadIndexes).toContain(6);
    expect(window.preloadIndexes).toContain(7);
    expect(window.preloadIndexes).toContain(4);
    expect(window.preloadIndexes).toContain(3);
    expect(window.preloadIndexes).toHaveLength(4);
  });

  it('shouldBeLoaded returns true for items in window', () => {
    const pm = new PreloadManager({ totalItems: 10, windowSize: 1 });
    pm.updateCurrentIndex(3);
    expect(pm.shouldBeLoaded(2)).toBe(true);
    expect(pm.shouldBeLoaded(3)).toBe(true);
    expect(pm.shouldBeLoaded(4)).toBe(true);
    expect(pm.shouldBeLoaded(1)).toBe(false);
    expect(pm.shouldBeLoaded(5)).toBe(false);
  });

  it('notifies subscribers on index change', () => {
    const pm = new PreloadManager({ totalItems: 10, windowSize: 1 });
    const listener = vi.fn();
    pm.subscribe(listener);
    pm.updateCurrentIndex(3);
    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(pm.getWindow());
  });

  it('does not notify when index is unchanged', () => {
    const pm = new PreloadManager({ totalItems: 10, windowSize: 1 });
    const listener = vi.fn();
    pm.subscribe(listener);
    pm.updateCurrentIndex(0);
    expect(listener).not.toHaveBeenCalled();
  });

  it('unsubscribe stops notifications', () => {
    const pm = new PreloadManager({ totalItems: 10, windowSize: 1 });
    const listener = vi.fn();
    const unsub = pm.subscribe(listener);
    unsub();
    pm.updateCurrentIndex(3);
    expect(listener).not.toHaveBeenCalled();
  });
});
