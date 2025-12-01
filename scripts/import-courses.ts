#!/usr/bin/env node

/**
 * Import courses and exams from JSON file to Firestore
 * 
 * Usage:
 *   npm run import-courses -- path/to/courses.json
 *   or
 *   node scripts/import-courses.js path/to/courses.json
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { validateCoursesData } from '../src/lib/import/validation.js';

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
    readFileSync(resolve(process.cwd(), 'service-account-key.json'), 'utf8')
);

initializeApp({
    credential: cert(serviceAccount),
});

const db = getFirestore();

interface ImportStats {
    coursesImported: number;
    examsImported: number;
    questionsImported: number;
    errors: string[];
}

async function importCourses(filePath: string): Promise<ImportStats> {
    const stats: ImportStats = {
        coursesImported: 0,
        examsImported: 0,
        questionsImported: 0,
        errors: [],
    };

    try {
        console.log(`📖 Reading file: ${filePath}`);
        const fileContent = readFileSync(filePath, 'utf8');
        const data = JSON.parse(fileContent);

        console.log('✅ File parsed successfully');
        console.log('🔍 Validating data...');

        // Validate data
        const validation = validateCoursesData(data);

        if (validation.warnings.length > 0) {
            console.log('\n⚠️  Warnings:');
            validation.warnings.forEach(warning => console.log(`  - ${warning}`));
        }

        if (!validation.valid) {
            console.log('\n❌ Validation failed:');
            validation.errors.forEach(error => console.log(`  - ${error}`));
            stats.errors = validation.errors;
            return stats;
        }

        console.log('✅ Validation passed');
        console.log(`\n📦 Importing ${data.courses.length} courses...\n`);

        // Import each course
        for (const course of data.courses) {
            try {
                console.log(`  📚 Importing course: ${course.name} (${course.id})`);

                // Prepare course data (without exams)
                const { exams, ...courseData } = course;

                // Create course document
                const courseRef = db.collection('courses').doc(course.id);
                await courseRef.set({
                    ...courseData,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });

                stats.coursesImported++;
                console.log(`    ✅ Course imported`);

                // Import exams for this course
                if (exams && exams.length > 0) {
                    console.log(`    📝 Importing ${exams.length} exams...`);

                    for (const exam of exams) {
                        try {
                            // Prepare exam data (without questions)
                            const { questions, ...examData } = exam;

                            // Create exam document
                            const examRef = courseRef.collection('exams').doc(exam.id);
                            await examRef.set({
                                ...examData,
                                courseId: course.id,
                                createdAt: new Date(),
                                updatedAt: new Date(),
                            });

                            stats.examsImported++;
                            console.log(`      ✅ Exam imported: ${exam.name} (${exam.id})`);

                            // Import questions for this exam
                            if (questions && questions.length > 0) {
                                console.log(`        📋 Importing ${questions.length} questions...`);

                                const batch = db.batch();
                                for (const question of questions) {
                                    const questionRef = examRef.collection('questions').doc(question.id);
                                    batch.set(questionRef, {
                                        ...question,
                                        examId: exam.id,
                                        courseId: course.id,
                                        createdAt: new Date(),
                                    });
                                    stats.questionsImported++;
                                }

                                await batch.commit();
                                console.log(`        ✅ ${questions.length} questions imported`);
                            }
                        } catch (error) {
                            const errorMsg = `Failed to import exam ${exam.id}: ${error instanceof Error ? error.message : String(error)}`;
                            console.error(`      ❌ ${errorMsg}`);
                            stats.errors.push(errorMsg);
                        }
                    }
                }

                console.log('');
            } catch (error) {
                const errorMsg = `Failed to import course ${course.id}: ${error instanceof Error ? error.message : String(error)}`;
                console.error(`  ❌ ${errorMsg}`);
                stats.errors.push(errorMsg);
            }
        }

        return stats;
    } catch (error) {
        const errorMsg = `Fatal error: ${error instanceof Error ? error.message : String(error)}`;
        console.error(`\n❌ ${errorMsg}`);
        stats.errors.push(errorMsg);
        return stats;
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.error('❌ Error: No file path provided');
        console.log('\nUsage:');
        console.log('  npm run import-courses -- path/to/courses.json');
        console.log('  or');
        console.log('  node scripts/import-courses.js path/to/courses.json');
        process.exit(1);
    }

    const filePath = resolve(process.cwd(), args[0]);

    console.log('🚀 Starting import process...\n');
    console.log('═'.repeat(60));

    const startTime = Date.now();
    const stats = await importCourses(filePath);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('═'.repeat(60));
    console.log('\n📊 Import Summary:');
    console.log(`  ✅ Courses imported: ${stats.coursesImported}`);
    console.log(`  ✅ Exams imported: ${stats.examsImported}`);
    console.log(`  ✅ Questions imported: ${stats.questionsImported}`);
    console.log(`  ⏱️  Duration: ${duration}s`);

    if (stats.errors.length > 0) {
        console.log(`\n  ❌ Errors: ${stats.errors.length}`);
        stats.errors.forEach(error => console.log(`    - ${error}`));
        process.exit(1);
    } else {
        console.log('\n✨ Import completed successfully!');
        process.exit(0);
    }
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
