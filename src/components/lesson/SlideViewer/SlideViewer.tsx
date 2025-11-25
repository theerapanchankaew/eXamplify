'use client';

import { useState, useEffect, useCallback } from 'react';
import { Slide, SlideViewerState } from '@/types/slides';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import { SlideContent } from './SlideContent';
import { cn } from '@/lib/utils';

interface SlideViewerProps {
    slides: Slide[];
    lessonId: string;
    onComplete?: () => void;
    onProgressUpdate?: (slideIndex: number) => void;
}

export function SlideViewer({
    slides,
    lessonId,
    onComplete,
    onProgressUpdate
}: SlideViewerProps) {
    const [state, setState] = useState<SlideViewerState>({
        currentSlide: 0,
        totalSlides: slides.length,
        isFullscreen: false,
        showNotes: false,
    });

    const currentSlide = slides[state.currentSlide];
    const progress = ((state.currentSlide + 1) / state.totalSlides) * 100;

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === ' ') {
                e.preventDefault();
                handleNext();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                handlePrevious();
            } else if (e.key === 'f' || e.key === 'F') {
                e.preventDefault();
                toggleFullscreen();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [state.currentSlide]);

    // Update progress when slide changes
    useEffect(() => {
        onProgressUpdate?.(state.currentSlide);
    }, [state.currentSlide, onProgressUpdate]);

    const handleNext = useCallback(() => {
        if (state.currentSlide < state.totalSlides - 1) {
            setState(prev => ({
                ...prev,
                currentSlide: prev.currentSlide + 1,
            }));
        } else {
            // Reached the end
            onComplete?.();
        }
    }, [state.currentSlide, state.totalSlides, onComplete]);

    const handlePrevious = useCallback(() => {
        if (state.currentSlide > 0) {
            setState(prev => ({
                ...prev,
                currentSlide: prev.currentSlide - 1,
            }));
        }
    }, [state.currentSlide]);

    const goToSlide = useCallback((index: number) => {
        if (index >= 0 && index < state.totalSlides) {
            setState(prev => ({
                ...prev,
                currentSlide: index,
            }));
        }
    }, [state.totalSlides]);

    const toggleFullscreen = useCallback(() => {
        setState(prev => ({
            ...prev,
            isFullscreen: !prev.isFullscreen,
        }));
    }, []);

    if (!currentSlide) {
        return (
            <div className="text-center py-20">
                <p className="text-muted-foreground">No slides available</p>
            </div>
        );
    }

    return (
        <div className={cn(
            "slide-viewer",
            state.isFullscreen && "fixed inset-0 z-50 bg-background"
        )}>
            {/* Progress Bar */}
            <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">
                        Slide {state.currentSlide + 1} of {state.totalSlides}
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleFullscreen}
                    >
                        {state.isFullscreen ? (
                            <Minimize2 className="h-4 w-4" />
                        ) : (
                            <Maximize2 className="h-4 w-4" />
                        )}
                    </Button>
                </div>
                <Progress value={progress} className="h-2" />
            </div>

            {/* Slide Content */}
            <Card className={cn(
                "mb-6",
                state.isFullscreen && "h-[calc(100vh-200px)]"
            )}>
                <CardContent className="p-8 md:p-12">
                    <SlideContent slide={currentSlide} />
                </CardContent>
            </Card>

            {/* Navigation Controls */}
            <div className="flex items-center justify-between gap-4">
                <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={state.currentSlide === 0}
                >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Previous
                </Button>

                {/* Slide Dots */}
                <div className="flex gap-2 overflow-x-auto max-w-md">
                    {slides.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => goToSlide(index)}
                            className={cn(
                                "w-2 h-2 rounded-full transition-all",
                                index === state.currentSlide
                                    ? "bg-primary w-8"
                                    : "bg-muted hover:bg-muted-foreground/50"
                            )}
                            aria-label={`Go to slide ${index + 1}`}
                        />
                    ))}
                </div>

                <Button
                    onClick={handleNext}
                    disabled={state.currentSlide === state.totalSlides - 1}
                >
                    {state.currentSlide === state.totalSlides - 1 ? 'Complete' : 'Next'}
                    <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
            </div>

            {/* Keyboard Shortcuts Hint */}
            <div className="mt-4 text-center text-xs text-muted-foreground">
                Use arrow keys or space to navigate • Press F for fullscreen
            </div>
        </div>
    );
}
