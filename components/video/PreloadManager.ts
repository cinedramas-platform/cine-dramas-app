type PreloadListener = (window: PreloadWindow) => void;

export type PreloadWindow = {
  current: number;
  preloadIndexes: number[];
};

export type PreloadManagerOptions = {
  windowSize?: number;
  totalItems: number;
};

export class PreloadManager {
  private currentIndex = 0;
  private totalItems: number;
  private windowSize: number;
  private listeners = new Set<PreloadListener>();

  constructor({ totalItems, windowSize = 1 }: PreloadManagerOptions) {
    this.totalItems = totalItems;
    this.windowSize = windowSize;
  }

  getWindow(): PreloadWindow {
    const preloadIndexes: number[] = [];
    for (let offset = 1; offset <= this.windowSize; offset++) {
      const next = this.currentIndex + offset;
      const prev = this.currentIndex - offset;
      if (next < this.totalItems) preloadIndexes.push(next);
      if (prev >= 0) preloadIndexes.push(prev);
    }
    return { current: this.currentIndex, preloadIndexes };
  }

  shouldBeLoaded(index: number): boolean {
    return Math.abs(index - this.currentIndex) <= this.windowSize;
  }

  updateCurrentIndex(index: number) {
    if (index === this.currentIndex) return;
    this.currentIndex = index;
    this.notify();
  }

  updateTotalItems(total: number) {
    this.totalItems = total;
  }

  subscribe(listener: PreloadListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const window = this.getWindow();
    this.listeners.forEach((listener) => listener(window));
  }
}
