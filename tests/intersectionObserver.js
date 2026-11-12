import { act } from '@testing-library/react';
import { vi } from 'vitest';

// jsdom has no IntersectionObserver, so tests use this controllable fake.
const active = new Set();

class FakeIntersectionObserver {
  constructor(callback) {
    this.callback = callback;
    this.targets = [];
  }
  observe(target) {
    this.targets.push(target);
    active.add(this);
  }
  disconnect() {
    active.delete(this);
  }
  unobserve() {}
  takeRecords() { return []; }
}

export function installIntersectionObserver() {
  active.clear();
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
}

/** Pretends every observed element just scrolled into view, `times` times before React re-renders. */
export function scrollToSentinel(times = 1) {
  act(() => {
    const observers = [...active];
    for (let i = 0; i < times; i++) {
      for (const observer of observers) {
        observer.callback(observer.targets.map(target => ({ target, isIntersecting: true })));
      }
    }
  });
}

export function activeObserverCount() {
  return active.size;
}
