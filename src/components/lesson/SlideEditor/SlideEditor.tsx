'use client';

import { useState, useCallback } from 'react';
import { Slide, SlideEditorState, SlideLayout } from '@/types/slides';
import {
  createSlide,
  createTextBlock,
  createImageBlock,
  reorderSlides,
  addBlockToSlide,
  removeBlockFromSlide,
  updateBlockInSlide,
  duplicateSlide,
} from '@/lib/slides';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Trash2,
  Copy,
  GripVertical,
  Save,
  Eye,
  ImagePlus,
  Type,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SlideContent } from '../SlideViewer/SlideContent';
import { useToast } from '@/hooks/use-toast';

interface SlideEditorProps {
  initialSlides?: Slide[];
  lessonId: string;
  onSave: (slides: Slide[]) => Promise<void>;
}

export function SlideEditor({ initialSlides = [], lessonId, onSave }: SlideEditorProps) {
  const { toast } = useToast();
  const [state, setState] = useState<SlideEditorState>({
    currentSlide: 0,
    slides: initialSlides.length > 0 ? initialSlides : [createSlide()],
    isDirty: false,
    isSaving: false,
  });

  const [isPreview, setIsPreview] = useState(false);

  const currentSlide = state.slides[state.currentSlide];

  const markDirty = useCallback(() => {
    setState(prev => ({ ...prev, isDirty: true }));
  }, []);

  // Slide operations
  const addSlide = useCallback(() => {
    const newSlide = createSlide({ order: state.slides.length });
    setState(prev => ({
      ...prev,
      slides: [...prev.slides, newSlide],
      currentSlide: prev.slides.length,
      isDirty: true,
    }));
  }, [state.slides.length]);

  const deleteSlide = useCallback((index: number) => {
    if (state.slides.length === 1) {
      toast({
        variant: 'destructive',
        title: 'Cannot delete',
        description: 'You must have at least one slide.',
      });
      return;
    }

    setState(prev => ({
      ...prev,
      slides: prev.slides.filter((_, i) => i !== index),
      currentSlide: Math.max(0, prev.currentSlide - 1),
      isDirty: true,
    }));
  }, [state.slides.length, state.currentSlide, toast]);

  const duplicateCurrentSlide = useCallback(() => {
    const duplicated = duplicateSlide(currentSlide);
    setState(prev => ({
      ...prev,
      slides: [
        ...prev.slides.slice(0, prev.currentSlide + 1),
        duplicated,
        ...prev.slides.slice(prev.currentSlide + 1),
      ],
      currentSlide: prev.currentSlide + 1,
      isDirty: true,
    }));
  }, [currentSlide, state.currentSlide]);

  const updateSlide = useCallback((updates: Partial<Slide>) => {
    setState(prev => ({
      ...prev,
      slides: prev.slides.map((slide, i) =>
        i === prev.currentSlide ? { ...slide, ...updates } : slide
      ),
      isDirty: true,
    }));
  }, [state.currentSlide]);

  // Block operations
  const addTextBlock = useCallback(() => {
    const newBlock = createTextBlock('Enter your text here...', {
      order: currentSlide.blocks.length,
    });
    const updatedSlide = addBlockToSlide(currentSlide, newBlock);
    updateSlide(updatedSlide);
  }, [currentSlide, updateSlide]);

  const addImageBlock = useCallback(() => {
    const url = prompt('Enter image URL:');
    if (!url) return;

    const newBlock = createImageBlock(url, 'Image', {
      order: currentSlide.blocks.length,
    });
    const updatedSlide = addBlockToSlide(currentSlide, newBlock);
    updateSlide(updatedSlide);
  }, [currentSlide, updateSlide]);

  const deleteBlock = useCallback((blockId: string) => {
    const updatedSlide = removeBlockFromSlide(currentSlide, blockId);
    updateSlide(updatedSlide);
  }, [currentSlide, updateSlide]);

  const updateBlock = useCallback((blockId: string, updates: any) => {
    const updatedSlide = updateBlockInSlide(currentSlide, blockId, updates);
    updateSlide(updatedSlide);
  }, [currentSlide, updateSlide]);

  // Save
  const handleSave = useCallback(async () => {
    setState(prev => ({ ...prev, isSaving: true }));
    try {
      await onSave(state.slides);
      setState(prev => ({ ...prev, isDirty: false, isSaving: false }));
      toast({
        title: 'Saved',
        description: 'Slides saved successfully.',
      });
    } catch (error: any) {
      setState(prev => ({ ...prev, isSaving: false }));
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: error.message || 'Failed to save slides.',
      });
    }
  }, [state.slides, onSave, toast]);

  if (isPreview) {
    return (
      <div className="space-y-4">
        <Button onClick={() => setIsPreview(false)} variant="outline">
          Exit Preview
        </Button>
        <SlideContent slide={currentSlide} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Slide List */}
      <div className="lg:col-span-1 space-y-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Slides</h3>
          <Button size="sm" onClick={addSlide}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2">
          {state.slides.map((slide, index) => (
            <Card
              key={slide.id}
              className={cn(
                'cursor-pointer transition-colors',
                index === state.currentSlide && 'border-primary'
              )}
              onClick={() => setState(prev => ({ ...prev, currentSlide: index }))}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{slide.title}</p>
                    <p className="text-xs text-muted-foreground">{slide.layout}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{index + 1}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="lg:col-span-3 space-y-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={!state.isDirty || state.isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {state.isSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button variant="outline" onClick={() => setIsPreview(true)}>
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={duplicateCurrentSlide}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteSlide(state.currentSlide)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        {/* Slide Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Slide Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={currentSlide.title}
                onChange={(e) => updateSlide({ title: e.target.value })}
                placeholder="Slide title"
              />
            </div>

            <div>
              <Label htmlFor="layout">Layout</Label>
              <Select
                value={currentSlide.layout}
                onValueChange={(value: SlideLayout) => updateSlide({ layout: value })}
              >
                <SelectTrigger id="layout">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="content">Content</SelectItem>
                  <SelectItem value="split">Split</SelectItem>
                  <SelectItem value="full-image">Full Image</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Instructor Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={currentSlide.notes || ''}
                onChange={(e) => updateSlide({ notes: e.target.value })}
                placeholder="Notes for instructors..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Content Blocks */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Content Blocks</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={addTextBlock}>
                  <Type className="mr-2 h-4 w-4" />
                  Text
                </Button>
                <Button size="sm" variant="outline" onClick={addImageBlock}>
                  <ImagePlus className="mr-2 h-4 w-4" />
                  Image
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentSlide.blocks.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No content blocks. Add text or images to get started.
              </p>
            ) : (
              currentSlide.blocks.map((block) => (
                <Card key={block.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <GripVertical className="h-4 w-4 text-muted-foreground mt-2" />
                      <div className="flex-1 space-y-2">
                        {block.type === 'text' ? (
                          <Textarea
                            value={block.content}
                            onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                            placeholder="Enter text (Markdown supported)..."
                            rows={4}
                          />
                        ) : (
                          <div className="space-y-2">
                            <Input
                              value={block.url}
                              onChange={(e) => updateBlock(block.id, { url: e.target.value })}
                              placeholder="Image URL"
                            />
                            <Input
                              value={block.caption || ''}
                              onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
                              placeholder="Caption (optional)"
                            />
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteBlock(block.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
