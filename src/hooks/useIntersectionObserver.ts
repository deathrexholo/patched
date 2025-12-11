import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Options for the intersection observer hook
 */
export interface UseIntersectionObserverOptions {
  threshold?: number | number[];
  rootMargin?: string;
  root?: Element | null;
  freezeOnceVisible?: boolean;
}

/**
 * Return type for the intersection observer hook
 */
export interface UseIntersectionObserverReturn {
  isIntersecting: boolean;
  entry: IntersectionObserverEntry | null;
  ref: React.RefObject<Element>;
}

/**
 * Custom hook for intersection observer functionality
 * 
 * @param options - Configuration options for the intersection observer
 * @returns Object containing intersection state and ref
 */
export const useIntersectionObserver = (
  options: UseIntersectionObserverOptions = {}
): UseIntersectionObserverReturn => {
  const {
    threshold = 0.5,
    rootMargin = '0px',
    root = null,
    freezeOnceVisible = false
  } = options;

  const elementRef = useRef<Element>(null);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  const frozen = freezeOnceVisible && isIntersecting;

  const updateEntry = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    setEntry(entry);
    setIsIntersecting(entry.isIntersecting);
  }, []);

  useEffect(() => {
    const element = elementRef.current;
    const hasIOSupport = !!window.IntersectionObserver;

    if (!hasIOSupport || frozen || !element) {
      return;
    }

    const observer = new IntersectionObserver(updateEntry, {
      threshold,
      rootMargin,
      root
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [elementRef, threshold, rootMargin, root, frozen, updateEntry]);

  return {
    isIntersecting,
    entry,
    ref: elementRef
  };
};

/**
 * Hook for observing multiple elements with intersection observer
 * 
 * @param options - Configuration options for the intersection observer
 * @returns Object with methods to observe elements and get their intersection states
 */
export const useMultipleIntersectionObserver = (
  options: UseIntersectionObserverOptions = {}
) => {
  const {
    threshold = 0.5,
    rootMargin = '0px',
    root = null
  } = options;

  const [entries, setEntries] = useState<Map<Element, IntersectionObserverEntry>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementsRef = useRef<Set<Element>>(new Set());

  const updateEntries = useCallback((observerEntries: IntersectionObserverEntry[]) => {
    setEntries(prevEntries => {
      const newEntries = new Map(prevEntries);
      observerEntries.forEach(entry => {
        newEntries.set(entry.target, entry);
      });
      return newEntries;
    });
  }, []);

  useEffect(() => {
    const hasIOSupport = !!window.IntersectionObserver;
    if (!hasIOSupport) return;

    observerRef.current = new IntersectionObserver(updateEntries, {
      threshold,
      rootMargin,
      root
    });

    // Observe all existing elements
    elementsRef.current.forEach(element => {
      observerRef.current?.observe(element);
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [threshold, rootMargin, root, updateEntries]);

  const observe = useCallback((element: Element) => {
    if (!element || elementsRef.current.has(element)) return;

    elementsRef.current.add(element);
    observerRef.current?.observe(element);
  }, []);

  const unobserve = useCallback((element: Element) => {
    if (!element || !elementsRef.current.has(element)) return;

    elementsRef.current.delete(element);
    observerRef.current?.unobserve(element);
    setEntries(prevEntries => {
      const newEntries = new Map(prevEntries);
      newEntries.delete(element);
      return newEntries;
    });
  }, []);

  const isIntersecting = useCallback((element: Element): boolean => {
    const entry = entries.get(element);
    return entry?.isIntersecting ?? false;
  }, [entries]);

  const getEntry = useCallback((element: Element): IntersectionObserverEntry | null => {
    return entries.get(element) ?? null;
  }, [entries]);

  return {
    observe,
    unobserve,
    isIntersecting,
    getEntry,
    entries
  };
};

export default useIntersectionObserver;