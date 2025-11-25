// Slide Content Data Models and Types

import { Timestamp } from 'firebase/firestore';

/**
 * Slide Layout Types
 */
export type SlideLayout =
    | 'title'        // Title slide with centered text
    | 'content'      // Standard content slide
    | 'split'        // Two-column layout
    | 'full-image';  // Full-screen image with optional caption

/**
 * Content Block Types (Minimal: text and image only)
 */
export type ContentBlockType = 'text' | 'image';

/**
 * Base Content Block Interface
 */
export interface BaseContentBlock {
    id: string;
    type: ContentBlockType;
    order: number;
}

/**
 * Text Content Block
 */
export interface TextBlock extends BaseContentBlock {
    type: 'text';
    content: string; // Markdown supported
    fontSize?: 'small' | 'medium' | 'large';
    alignment?: 'left' | 'center' | 'right';
}

/**
 * Image Content Block
 */
export interface ImageBlock extends BaseContentBlock {
    type: 'image';
    url: string;
    alt: string;
    caption?: string;
    size?: 'small' | 'medium' | 'large' | 'full';
}

/**
 * Union type for all content blocks
 */
export type ContentBlock = TextBlock | ImageBlock;

/**
 * Individual Slide
 */
export interface Slide {
    id: string;
    order: number;
    title: string;
    layout: SlideLayout;
    blocks: ContentBlock[];
    notes?: string; // Instructor notes (not visible to students)
    duration?: number; // Estimated time in seconds
}

/**
 * Lesson Content (Slide Deck)
 */
export interface LessonContent {
    id: string;
    lessonId: string;
    type: 'slide-deck';
    slides: Slide[];
    createdAt: Timestamp;
    updatedAt: Timestamp;
    createdBy: string; // User ID of creator
}

/**
 * Student Progress for Slide Deck
 */
export interface SlideProgress {
    userId: string;
    lessonId: string;
    completedSlides: string[]; // Array of slide IDs
    currentSlide: number; // Current slide index
    bookmarks: string[]; // Array of bookmarked slide IDs
    notes: SlideNote[];
    lastViewedAt: Timestamp;
}

/**
 * Student Note on a Slide
 */
export interface SlideNote {
    id: string;
    slideId: string;
    content: string;
    createdAt: Timestamp;
}

/**
 * Helper type for creating new slides
 */
export type NewSlide = Omit<Slide, 'id'>;

/**
 * Helper type for creating new content blocks
 */
export type NewContentBlock = Omit<ContentBlock, 'id'>;

/**
 * Slide Editor State
 */
export interface SlideEditorState {
    currentSlide: number;
    slides: Slide[];
    isDirty: boolean;
    isSaving: boolean;
}

/**
 * Slide Viewer State
 */
export interface SlideViewerState {
    currentSlide: number;
    totalSlides: number;
    isFullscreen: boolean;
    showNotes: boolean;
}
