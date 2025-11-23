'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Skeleton } from '../ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { FileText, MoreVertical, PlusCircle } from 'lucide-react';

interface ChapterListProps {
  courseId: string;
  module: any;
  isCourseOwner: boolean;
  onEditChapter: (chapter: any, module: any) => void;
  onDeleteChapter: (chapter: any, module: any) => void;
  onAddChapter: () => void;
  isEnrolled?: boolean;
  completedChapters?: string[];
  onCompleteChapter?: (chapterId: string) => void;
}

export function ChapterList({
  courseId,
  module,
  isCourseOwner,
  onEditChapter,
  onDeleteChapter,
  onAddChapter,
  isEnrolled,
  completedChapters = [],
  onCompleteChapter,
}: ChapterListProps) {
  const firestore = useFirestore();

  const chaptersQuery = useMemoFirebase(
    () =>
      firestore
        ? query(
          collection(
            firestore,
            'courses',
            courseId,
            'modules',
            module.id,
            'chapters'
          )
        )
        : null,
    [firestore, courseId, module.id]
  );

  const { data: chapters, isLoading } = useCollection(chaptersQuery);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="border-l-2 pl-4 space-y-2">
      {chapters && chapters.length > 0 ? (
        chapters.map((chapter) => {
          const isCompleted = completedChapters.includes(chapter.id);
          return (
            <div key={chapter.id} className={`flex items-center group bg-background hover:bg-muted/50 rounded-md p-2 ${isCompleted ? 'border-l-4 border-l-green-500' : ''}`}>
              <FileText className={`h-5 w-5 mr-3 ${isCompleted ? 'text-green-500' : 'text-muted-foreground'}`} />
              <div className="flex-1">
                <p className="font-medium">{chapter.name}</p>
                <p className="text-sm text-muted-foreground line-clamp-1">{chapter.content}</p>
              </div>

              {isEnrolled && !isCourseOwner && onCompleteChapter && (
                <Button
                  variant={isCompleted ? "ghost" : "outline"}
                  size="sm"
                  className={`mr-2 ${isCompleted ? 'text-green-600 hover:text-green-700 hover:bg-green-50' : ''}`}
                  onClick={() => onCompleteChapter(chapter.id)}
                  disabled={isCompleted}
                >
                  {isCompleted ? 'Completed' : 'Mark as Complete'}
                </Button>
              )}

              {isCourseOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-50 group-hover:opacity-100">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Chapter Actions</DropdownMenuLabel>
                    <DropdownMenuItem>Add Lesson</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEditChapter(chapter, module)}>Edit Chapter</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onDeleteChapter(chapter, module)} className="text-red-600">Delete Chapter</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          );
        })
      ) : (
        <p className="text-muted-foreground text-sm">No chapters in this module yet.</p>
      )}
      {isCourseOwner && (
        <Button variant="outline" size="sm" onClick={onAddChapter}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Chapter
        </Button>
      )}
    </div>
  );
}
