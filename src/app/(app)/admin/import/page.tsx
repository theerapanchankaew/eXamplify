'use client';

import { useState } from 'react';
import { useFirestore } from '@/firebase';
import { collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, FileJson, CheckCircle2, XCircle, AlertCircle, Download } from 'lucide-react';
import { validateCoursesData } from '@/lib/import/validation';
import template from '../../../../../data/template-course.json';

interface ImportStats {
    coursesImported: number;
    examsImported: number;
    questionsImported: number;
    errors: string[];
}

export default function ImportPage() {
    const firestore = useFirestore();
    const [file, setFile] = useState<File | null>(null);
    const [validationResult, setValidationResult] = useState<any>(null);
    const [importing, setImporting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [importResult, setImportResult] = useState<ImportStats | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setValidationResult(null);
        setImportResult(null);

        try {
            const text = await selectedFile.text();
            const data = JSON.parse(text);
            const result = validateCoursesData(data);
            setValidationResult(result);
        } catch (error) {
            setValidationResult({
                valid: false,
                errors: [`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`],
                warnings: [],
            });
        }
    };

    const handleImport = async () => {
        if (!file || !firestore || !validationResult?.valid) return;

        setImporting(true);
        setProgress(0);

        const stats: ImportStats = {
            coursesImported: 0,
            examsImported: 0,
            questionsImported: 0,
            errors: [],
        };

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            const totalCourses = data.courses.length;
            let processedCourses = 0;

            for (const course of data.courses) {
                try {
                    const batch = writeBatch(firestore);

                    // Prepare course data (without exams)
                    const { exams, ...courseData } = course;

                    // Create course document
                    const courseRef = doc(firestore, 'courses', course.id);
                    batch.set(courseRef, {
                        ...courseData,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                    });

                    stats.coursesImported++;

                    // Import exams for this course
                    if (exams && exams.length > 0) {
                        for (const exam of exams) {
                            try {
                                // Prepare exam data (without questions)
                                const { questions, ...examData } = exam;

                                // Create exam document
                                const examRef = doc(firestore, 'courses', course.id, 'exams', exam.id);
                                batch.set(examRef, {
                                    ...examData,
                                    courseId: course.id,
                                    createdAt: serverTimestamp(),
                                    updatedAt: serverTimestamp(),
                                });

                                stats.examsImported++;

                                // Import questions for this exam
                                if (questions && questions.length > 0) {
                                    for (const question of questions) {
                                        const questionRef = doc(firestore, 'courses', course.id, 'exams', exam.id, 'questions', question.id);
                                        batch.set(questionRef, {
                                            ...question,
                                            examId: exam.id,
                                            courseId: course.id,
                                            createdAt: serverTimestamp(),
                                        });
                                        stats.questionsImported++;
                                    }
                                }
                            } catch (error) {
                                stats.errors.push(`Failed to import exam ${exam.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                            }
                        }
                    }

                    await batch.commit();

                    processedCourses++;
                    setProgress((processedCourses / totalCourses) * 100);
                } catch (error) {
                    stats.errors.push(`Failed to import course ${course.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }

            setImportResult(stats);
        } catch (error) {
            stats.errors.push(`Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            setImportResult(stats);
        } finally {
            setImporting(false);
            setProgress(100);
        }
    };

    const downloadTemplate = () => {
        const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'template-course.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="container mx-auto py-8 px-4 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Import Courses & Exams</h1>
                <p className="text-muted-foreground mt-2">
                    Upload a JSON file to import courses and exams into the system
                </p>
            </div>

            <div className="space-y-6">
                {/* Template Download */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileJson className="h-5 w-5" />
                            JSON Template
                        </CardTitle>
                        <CardDescription>
                            Download a template file to get started
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={downloadTemplate} variant="outline">
                            <Download className="mr-2 h-4 w-4" />
                            Download Template
                        </Button>
                    </CardContent>
                </Card>

                {/* File Upload */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Upload className="h-5 w-5" />
                            Upload JSON File
                        </CardTitle>
                        <CardDescription>
                            Select a JSON file containing course and exam data
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <input
                                type="file"
                                accept=".json"
                                onChange={handleFileChange}
                                className="block w-full text-sm text-muted-foreground
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary file:text-primary-foreground
                  hover:file:bg-primary/90
                  cursor-pointer"
                            />
                            {file && (
                                <p className="text-sm text-muted-foreground">
                                    Selected: {file.name}
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Validation Results */}
                {validationResult && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                {validationResult.valid ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                ) : (
                                    <XCircle className="h-5 w-5 text-destructive" />
                                )}
                                Validation Results
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {validationResult.valid ? (
                                <Alert>
                                    <CheckCircle2 className="h-4 w-4" />
                                    <AlertDescription>
                                        File is valid and ready to import!
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                <Alert variant="destructive">
                                    <XCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        <div className="font-semibold mb-2">Validation Errors:</div>
                                        <ul className="list-disc list-inside space-y-1">
                                            {validationResult.errors.map((error: string, i: number) => (
                                                <li key={i} className="text-sm">{error}</li>
                                            ))}
                                        </ul>
                                    </AlertDescription>
                                </Alert>
                            )}

                            {validationResult.warnings && validationResult.warnings.length > 0 && (
                                <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        <div className="font-semibold mb-2">Warnings:</div>
                                        <ul className="list-disc list-inside space-y-1">
                                            {validationResult.warnings.map((warning: string, i: number) => (
                                                <li key={i} className="text-sm">{warning}</li>
                                            ))}
                                        </ul>
                                    </AlertDescription>
                                </Alert>
                            )}

                            {validationResult.valid && (
                                <Button
                                    onClick={handleImport}
                                    disabled={importing}
                                    className="w-full"
                                >
                                    {importing ? 'Importing...' : 'Import Data'}
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Import Progress */}
                {importing && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Import Progress</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Progress value={progress} className="w-full" />
                            <p className="text-sm text-muted-foreground mt-2">
                                {Math.round(progress)}% complete
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Import Results */}
                {importResult && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                {importResult.errors.length === 0 ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                ) : (
                                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                                )}
                                Import Results
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center p-4 bg-muted rounded-lg">
                                    <div className="text-2xl font-bold">{importResult.coursesImported}</div>
                                    <div className="text-sm text-muted-foreground">Courses</div>
                                </div>
                                <div className="text-center p-4 bg-muted rounded-lg">
                                    <div className="text-2xl font-bold">{importResult.examsImported}</div>
                                    <div className="text-sm text-muted-foreground">Exams</div>
                                </div>
                                <div className="text-center p-4 bg-muted rounded-lg">
                                    <div className="text-2xl font-bold">{importResult.questionsImported}</div>
                                    <div className="text-sm text-muted-foreground">Questions</div>
                                </div>
                            </div>

                            {importResult.errors.length > 0 && (
                                <Alert variant="destructive">
                                    <XCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        <div className="font-semibold mb-2">Errors:</div>
                                        <ul className="list-disc list-inside space-y-1">
                                            {importResult.errors.map((error, i) => (
                                                <li key={i} className="text-sm">{error}</li>
                                            ))}
                                        </ul>
                                    </AlertDescription>
                                </Alert>
                            )}

                            {importResult.errors.length === 0 && (
                                <Alert>
                                    <CheckCircle2 className="h-4 w-4" />
                                    <AlertDescription>
                                        Import completed successfully! All data has been imported to Firestore.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
