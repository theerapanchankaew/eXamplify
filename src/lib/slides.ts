// Utility functions for working with slides

import { Slide, ContentBlock, NewSlide, NewContentBlock } from '@/types/slides';
import { nanoid } from 'nanoid';

/**
 * Generate a unique ID for slides and blocks
 */
export function generateId(): string {
    return nanoid();
}

/**
 * Create a new slide with default values
 */
export function createSlide(data: Partial<NewSlide> = {}): Slide {
    return {
        id: generateId(),
        order: data.order ?? 0,
        title: data.title ?? 'Untitled Slide',
        layout: data.layout ?? 'content',
        blocks: data.blocks ?? [],
        notes: data.notes,
        duration: data.duration,
    };
}

/**
 * Create a new text block
 */
export function createTextBlock(
    content: string = '',
    options: Partial<Omit<NewContentBlock, 'type'>> = {}
): ContentBlock {
    return {
        id: generateId(),
        type: 'text',
        order: options.order ?? 0,
        content,
        fontSize: 'medium',
        alignment: 'left',
    };
}

/**
 * Create a new image block
 */
export function createImageBlock(
    url: string,
    alt: string = '',
    options: Partial<Omit<NewContentBlock, 'type'>> = {}
): ContentBlock {
    return {
        id: generateId(),
        type: 'image',
        order: options.order ?? 0,
        url,
        alt,
        caption: options.caption,
        size: 'medium',
    };
}

/**
 * Reorder slides
 */
export function reorderSlides(slides: Slide[], fromIndex: number, toIndex: number): Slide[] {
    const result = Array.from(slides);
    const [removed] = result.splice(fromIndex, 1);
    result.splice(toIndex, 0, removed);

    // Update order property
    return result.map((slide, index) => ({
        ...slide,
        order: index,
    }));
}

/**
 * Reorder blocks within a slide
 */
export function reorderBlocks(blocks: ContentBlock[], fromIndex: number, toIndex: number): ContentBlock[] {
    const result = Array.from(blocks);
    const [removed] = result.splice(fromIndex, 1);
    result.splice(toIndex, 0, removed);

    // Update order property
    return result.map((block, index) => ({
        ...block,
        order: index,
    }));
}

/**
 * Add a block to a slide
 */
export function addBlockToSlide(slide: Slide, block: ContentBlock): Slide {
    return {
        ...slide,
        blocks: [
            ...slide.blocks,
            {
                ...block,
                order: slide.blocks.length,
            },
        ],
    };
}

/**
 * Remove a block from a slide
 */
export function removeBlockFromSlide(slide: Slide, blockId: string): Slide {
    return {
        ...slide,
        blocks: slide.blocks
            .filter(block => block.id !== blockId)
            .map((block, index) => ({
                ...block,
                order: index,
            })),
    };
}

/**
 * Update a block in a slide
 */
export function updateBlockInSlide(
    slide: Slide,
    blockId: string,
    updates: Partial<ContentBlock>
): Slide {
    return {
        ...slide,
        blocks: slide.blocks.map(block =>
            block.id === blockId ? { ...block, ...updates } : block
        ),
    };
}

/**
 * Duplicate a slide
 */
export function duplicateSlide(slide: Slide): Slide {
    return {
        ...slide,
        id: generateId(),
        title: `${slide.title} (Copy)`,
        blocks: slide.blocks.map(block => ({
            ...block,
            id: generateId(),
        })),
    };
}

/**
 * Get slide by ID
 */
export function getSlideById(slides: Slide[], slideId: string): Slide | undefined {
    return slides.find(slide => slide.id === slideId);
}

/**
 * Calculate total duration of all slides
 */
export function calculateTotalDuration(slides: Slide[]): number {
    return slides.reduce((total, slide) => total + (slide.duration ?? 0), 0);
}

/**
 * Format duration in minutes and seconds
 */
export function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
