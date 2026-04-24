import { useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch, SessionExpiredError } from '../../../utils/apiFetch';

export interface SlideImage {
    filename: string;
    data: string; // SAS URL or base64 data URL
    slideNumber: number;
}

// --- Module-level slide cache ---

interface SlideCacheEntry {
    slides: SlideImage[];
    cachedAt: number;
}

// Read userId once at module evaluation time.
// M.cfg is always populated before React mounts in Moodle, so this is safe.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MOODLE_USER_ID: number = (window as any).M?.cfg?.userId ?? 0;

const CACHE_TTL_MS = 45 * 60 * 1000; // 45 min — within ~1 h SAS expiry window
const slideCache = new Map<string, SlideCacheEntry>();

function getCacheKey(contentId: number): string {
    return `${MOODLE_USER_ID}:${contentId}`;
}

function readSlideCache(contentId: number): SlideImage[] | null {
    const key = getCacheKey(contentId);
    const entry = slideCache.get(key);
    if (!entry) { return null; }
    if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
        slideCache.delete(key);
        return null; // expired — will re-fetch
    }
    return entry.slides;
}

function writeSlideCache(contentId: number, slides: SlideImage[]): void {
    // Never cache base64 data URLs — memory risk, no HTTP benefit
    if (slides.length > 0 && slides[0].data.startsWith('data:')) { return; }
    slideCache.set(getCacheKey(contentId), { slides, cachedAt: Date.now() });
}

// Call this wherever a session expiry is caught to wipe the current user's entries.
// Example call site — in apiFetch's 401/SessionExpiredError handler (utils/apiFetch.ts):
//
//   import { clearSlideCache } from './useContentSlides';
//   clearSlideCache();
//
export function clearSlideCache(): void {
    // Wipes only the current user's entries (MOODLE_USER_ID prefix).
    // Entries from a previous user are already unreachable by key, but this
    // keeps the Map lean after a logout + same-tab re-login.
    const prefix = `${MOODLE_USER_ID}:`;
    slideCache.forEach((_, key) => {
        if (key.startsWith(prefix)) { slideCache.delete(key); }
    });
}

// Fire-and-forget prefetch — call on hover or list render to warm the cache
// before the user clicks. Silent on failure; safe to call redundantly.
export function prefetchSlides(contentId: number): void {
    if (readSlideCache(contentId) !== null) { return; } // already cached
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wwwroot = (window as any).M?.cfg?.wwwroot || '';
    apiFetch(
        `${wwwroot}/local/arina_prism_sense/api/get_slide_images.php?contentid=${contentId}`
    )
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success' && data.images) {
                writeSlideCache(contentId, data.images);
            }
        })
        .catch(() => {}); // best-effort — errors are handled when the user actually clicks
}

// --- Hook ---

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useContentSlides = (selectedContent: any, isVideo: boolean) => {
    const [slides, setSlides] = useState<SlideImage[]>([]);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // One ref, one source of truth for the current in-flight request.
    // Both the effect and refreshSlides write to this ref so the effect
    // cleanup aborts whichever fetch is currently running.
    const abortControllerRef = useRef<AbortController | null>(null);

    const loadSlides = useCallback(async (
        contentId: number,
        signal: AbortSignal
    ) => {
        setIsLoading(true);
        setError(null);
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const M = (window as any).M;
            const wwwroot = M?.cfg?.wwwroot || '';
            const response = await apiFetch(
                `${wwwroot}/local/arina_prism_sense/api/get_slide_images.php?contentid=${contentId}`,
                { signal }
            );

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('API key is missing or incorrect. Please check your settings.');
                }
                throw new Error('Failed to load slides');
            }

            const data = await response.json();
            if (data.status === 'success' && data.images) {
                writeSlideCache(contentId, data.images);
                setSlides(data.images);
                setCurrentSlide(0);
            } else {
                setSlides([]);
                setCurrentSlide(0);
                setError('No slides found');
            }
        } catch (err: any) {
            // AbortError: user navigated away — return early, finally handles setIsLoading(false)
            if (err?.name === 'AbortError') { return; }
            if (err instanceof SessionExpiredError) { return; }
            console.error(err);
            setError(
                err?.message === 'API key is missing or incorrect. Please check your settings.'
                    ? err.message
                    : 'Error loading presentation'
            );
        } finally {
            // Always runs — clears loading for success, errors, and aborts alike
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!selectedContent || isVideo) {
            setSlides([]);
            setCurrentSlide(0);
            setIsLoading(false);
            return;
        }

        const contentId = selectedContent.id;
        // MOODLE_USER_ID is read once at module level — no repeated M.cfg access here

        const cached = readSlideCache(contentId);
        if (cached) {
            setSlides(cached);   // batched with setCurrentSlide — single render, no flash
            setCurrentSlide(0);
            setIsLoading(false);
            return;
        }

        setSlides([]);           // batched — single render
        setCurrentSlide(0);

        abortControllerRef.current?.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;
        loadSlides(contentId, controller.signal);

        // Abort whichever fetch is currently running (effect fetch or refresh fetch)
        return () => abortControllerRef.current?.abort();
        // loadSlides excluded from deps: it has empty deps and is a stable reference.
        // Including it would be cargo-cult — it never changes so it never triggers the effect.
    }, [selectedContent?.id, isVideo]); // eslint-disable-line react-hooks/exhaustive-deps

    const refreshSlides = useCallback(() => {
        if (!selectedContent) { return; }
        const contentId = selectedContent.id;

        slideCache.delete(getCacheKey(contentId)); // evict expired entry

        abortControllerRef.current?.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;
        loadSlides(contentId, controller.signal);
    }, [selectedContent?.id, loadSlides]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleNext = () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentSlide > 0) {
            setCurrentSlide(prev => prev - 1);
        }
    };

    const goToSlide = (index: number) => {
        if (index >= 0 && index < slides.length) {
            setCurrentSlide(index);
        }
    };

    return {
        slides,
        currentSlide,
        isLoading,
        error,
        handleNext,
        handlePrev,
        goToSlide,
        refreshSlides,
    };
};
