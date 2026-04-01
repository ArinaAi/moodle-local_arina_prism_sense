import { useState, useEffect } from 'react';
import { apiFetch, SessionExpiredError } from '../../../utils/apiFetch';

export interface SlideImage {
    filename: string;
    data: string; // base64
    slideNumber: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useContentSlides = (selectedContent: any, isVideo: boolean) => {
    const [slides, setSlides] = useState<SlideImage[]>([]);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!selectedContent || isVideo) {
            return;
        }

        const loadSlides = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const M = (window as any).M;
                const wwwroot = M?.cfg?.wwwroot || '';
                const response = await apiFetch(`${wwwroot}/local/lecturebot/api/get_slide_images.php?contentid=${selectedContent.id}`);

                if (!response.ok) {
                    if (response.status === 401) {
                        throw new Error('API key is missing or incorrect. Please check your settings.');
                    }
                    throw new Error('Failed to load slides');
                }

                const data = await response.json();
                if (data.status === 'success' && data.images) {
                    setSlides(data.images);
                    setCurrentSlide(0);
                } else {
                    setError('No slides found');
                }
            } catch (err: any) {
                if (err instanceof SessionExpiredError) { return; }
                console.error(err);
                if (err && err.message === 'API key is missing or incorrect. Please check your settings.') {
                    setError(err.message);
                } else {
                    setError('Error loading presentation');
                }
            } finally {
                setIsLoading(false);
            }
        };

        loadSlides();
    }, [selectedContent, isVideo]);

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
    };
};
