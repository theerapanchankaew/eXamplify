'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore, useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileJson, AlertTriangle, CheckCircle, Loader2, ArrowLeft, Eye } from 'lucide-react';
import { validateCourseImport, ValidationResult, CourseImportData } from '@/lib/schemas/course-import';
import { CourseImporter } from '@/lib/course-importer';
import Link from 'next/link';

export default function CourseImportPage() {
    const router = useRouter();
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();

    const [jsonContent, setJsonContent] = useState('');
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
    const [parsedData, setParsedData] = useState<CourseImportData | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            setJsonContent(content);
            validateJson(content);
        };
        reader.readAsText(file);
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const content = e.target.value;
        setJsonContent(content);
        // Debounce validation could be added here
        if (content.trim()) {
            try {
                JSON.parse(content);
                validateJson(content);
            } catch (e) {
                setValidationResult({ valid: false, errors: [{ path: 'JSON', message: 'Invalid JSON format', severity: 'error' }] });
                setParsedData(null);
            }
        } else {
            setValidationResult(null);
            setParsedData(null);
        }
    };

    const validateJson = (content: string) => {
        try {
            const data = JSON.parse(content);
            const result = validateCourseImport(data);
            setValidationResult(result);
            if (result.valid) {
                setParsedData(data as CourseImportData);
            } else {
                setParsedData(null);
            }
        } catch (error) {
            setValidationResult({
                valid: false,
                errors: [{ path: 'root', message: 'Invalid JSON syntax', severity: 'error' }]
            });
            setParsedData(null);
        }
    };

    const handleImport = async () => {
        if (!firestore || !user || !parsedData) return;

        setIsImporting(true);
        setImportProgress(10); // Start progress

        try {
            const importer = new CourseImporter(firestore, user.uid);

            // Simulate progress for better UX (since batch write is atomic-ish)
            const progressInterval = setInterval(() => {
                setImportProgress(prev => Math.min(prev + 5, 90));
            }, 200);

            const result = await importer.import(parsedData);

            clearInterval(progressInterval);
            setImportProgress(100);

            if (result.success) {
                toast({
                    title: 'Import Successful',
                    description: `Created course "${parsedData.course.name}" with ${result.stats?.modulesCreated} modules, ${result.stats?.chaptersCreated} chapters, and ${result.stats?.lessonsCreated} lessons.`,
                });
                // Redirect to the new course
                setTimeout(() => {
                    router.push(`/courses/${result.courseId}`);
                }, 1500);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Import Failed',
                    description: result.error,
                });
                setIsImporting(false);
            }
        } catch (error: any) {
            setIsImporting(false);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message,
            });
        }
    };

    return (
        <div className="container max-w-4xl py-8 space-y-8">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/admin/courses">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold">Import Course</h1>
                    <p className="text-muted-foreground">Create a new course by importing a JSON file.</p>
                </div>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>1. Upload or Paste JSON</CardTitle>
                            <CardDescription>
                                Select a .json file or paste the content directly.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div
                                className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">Click to upload JSON file</p>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept=".json"
                                    onChange={handleFileChange}
                                />
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-background px-2 text-muted-foreground">Or paste JSON</span>
                                </div>
                            </div>

                            <Textarea
                                placeholder='{ "version": "1.0", "course": { ... } }'
                                className="font-mono text-xs h-[300px]"
                                value={jsonContent}
                                onChange={handleTextChange}
                            />
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-4">
                    <Card className="h-full flex flex-col">
                        <CardHeader>
                            <CardTitle>2. Validation & Preview</CardTitle>
                            <CardDescription>
                                Review the course structure before importing.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto max-h-[500px]">
                            {!jsonContent ? (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                                    <FileJson className="h-12 w-12 mb-2" />
                                    <p>Waiting for input...</p>
                                </div>
                            ) : validationResult?.valid ? (
                                <div className="space-y-4">
                                    <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900">
                                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                        <AlertTitle className="text-green-800 dark:text-green-300">Valid Schema</AlertTitle>
                                        <AlertDescription className="text-green-700 dark:text-green-400">
                                            Ready to import.
                                        </AlertDescription>
                                    </Alert>

                                    {parsedData && (
                                        <div className="space-y-2 border rounded-md p-4 bg-muted/30">
                                            <div className="flex items-start gap-3">
                                                {parsedData.course.thumbnail && (
                                                    <img src={parsedData.course.thumbnail} alt="Cover" className="w-16 h-16 object-cover rounded-md" />
                                                )}
                                                <div>
                                                    <h3 className="font-semibold">{parsedData.course.name}</h3>
                                                    <p className="text-xs text-muted-foreground line-clamp-2">{parsedData.course.description}</p>
                                                    <div className="flex gap-2 mt-2">
                                                        <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">
                                                            {parsedData.course.modules.length} Modules
                                                        </span>
                                                        <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">
                                                            {parsedData.course.price ? `${parsedData.course.price} Tokens` : 'Free'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-4 space-y-2">
                                                <p className="text-xs font-medium text-muted-foreground uppercase">Structure Preview</p>
                                                {parsedData.course.modules.map((module, i) => (
                                                    <div key={i} className="text-sm pl-2 border-l-2 border-muted">
                                                        <p className="font-medium">{module.name}</p>
                                                        <p className="text-xs text-muted-foreground">{module.chapters.length} Chapters</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <Alert variant="destructive">
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertTitle>Validation Failed</AlertTitle>
                                        <AlertDescription>
                                            Please fix the following errors:
                                        </AlertDescription>
                                    </Alert>
                                    <ul className="text-sm text-destructive space-y-1 list-disc pl-4">
                                        {validationResult?.errors.map((err, i) => (
                                            <li key={i}>
                                                <span className="font-mono text-xs bg-destructive/10 px-1 rounded">{err.path}</span>: {err.message}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="border-t pt-4">
                            <Button
                                className="w-full"
                                disabled={!validationResult?.valid || isImporting}
                                onClick={handleImport}
                            >
                                {isImporting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Importing... {importProgress}%
                                    </>
                                ) : (
                                    <>
                                        <Upload className="mr-2 h-4 w-4" />
                                        Import Course
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
}
