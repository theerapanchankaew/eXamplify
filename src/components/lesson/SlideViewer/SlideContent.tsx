'use client';

import { Slide, ContentBlock } from '@/types/slides';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import Image from 'next/image';

interface SlideContentProps {
    slide: Slide;
}

export function SlideContent({ slide }: SlideContentProps) {
    const { layout, title, blocks } = slide;

    // Render based on layout type
    switch (layout) {
        case 'title':
            return <TitleLayout title={title} blocks={blocks} />;
        case 'content':
            return <ContentLayout title={title} blocks={blocks} />;
        case 'split':
            return <SplitLayout title={title} blocks={blocks} />;
        case 'full-image':
            return <FullImageLayout title={title} blocks={blocks} />;
        default:
            return <ContentLayout title={title} blocks={blocks} />;
    }
}

// Title Layout: Centered title slide
function TitleLayout({ title, blocks }: { title: string; blocks: ContentBlock[] }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">{title}</h1>
            {blocks.map((block) => (
                <div key={block.id} className="mt-4">
                    <BlockRenderer block={block} />
                </div>
            ))}
        </div>
    );
}

// Content Layout: Standard slide with title and content
function ContentLayout({ title, blocks }: { title: string; blocks: ContentBlock[] }) {
    return (
        <div className="space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold border-b pb-4">{title}</h2>
            <div className="space-y-4">
                {blocks.map((block) => (
                    <BlockRenderer key={block.id} block={block} />
                ))}
            </div>
        </div>
    );
}

// Split Layout: Two-column layout
function SplitLayout({ title, blocks }: { title: string; blocks: ContentBlock[] }) {
    const leftBlocks = blocks.filter((_, i) => i % 2 === 0);
    const rightBlocks = blocks.filter((_, i) => i % 2 === 1);

    return (
        <div className="space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold border-b pb-4">{title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    {leftBlocks.map((block) => (
                        <BlockRenderer key={block.id} block={block} />
                    ))}
                </div>
                <div className="space-y-4">
                    {rightBlocks.map((block) => (
                        <BlockRenderer key={block.id} block={block} />
                    ))}
                </div>
            </div>
        </div>
    );
}

// Full Image Layout: Large image with optional caption
function FullImageLayout({ title, blocks }: { title: string; blocks: ContentBlock[] }) {
    const imageBlock = blocks.find(b => b.type === 'image');
    const otherBlocks = blocks.filter(b => b.type !== 'image');

    return (
        <div className="space-y-6">
            {title && <h2 className="text-3xl md:text-4xl font-bold">{title}</h2>}
            {imageBlock && <BlockRenderer block={imageBlock} />}
            {otherBlocks.length > 0 && (
                <div className="space-y-4">
                    {otherBlocks.map((block) => (
                        <BlockRenderer key={block.id} block={block} />
                    ))}
                </div>
            )}
        </div>
    );
}

// Block Renderer: Renders individual content blocks
function BlockRenderer({ block }: { block: ContentBlock }) {
    switch (block.type) {
        case 'text':
            return <TextBlockRenderer block={block} />;
        case 'image':
            return <ImageBlockRenderer block={block} />;
        default:
            return null;
    }
}

// Text Block Renderer
function TextBlockRenderer({ block }: { block: ContentBlock & { type: 'text' } }) {
    const fontSize = {
        small: 'text-sm',
        medium: 'text-base',
        large: 'text-lg',
    }[block.fontSize || 'medium'];

    const alignment = {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right',
    }[block.alignment || 'left'];

    return (
        <div className={cn('prose prose-slate dark:prose-invert max-w-none', fontSize, alignment)}>
            <ReactMarkdown>{block.content}</ReactMarkdown>
        </div>
    );
}

// Image Block Renderer
function ImageBlockRenderer({ block }: { block: ContentBlock & { type: 'image' } }) {
    const sizeClass = {
        small: 'max-w-sm',
        medium: 'max-w-md',
        large: 'max-w-2xl',
        full: 'w-full',
    }[block.size || 'medium'];

    return (
        <figure className={cn('mx-auto', sizeClass)}>
            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted">
                <Image
                    src={block.url}
                    alt={block.alt}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
            </div>
            {block.caption && (
                <figcaption className="mt-2 text-sm text-center text-muted-foreground">
                    {block.caption}
                </figcaption>
            )}
        </figure>
    );
}
