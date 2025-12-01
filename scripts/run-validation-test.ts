
import { validateCourseImport } from '../src/lib/schemas/course-import';
import * as fs from 'fs';
import * as path from 'path';

async function runTest() {
    try {
        const filePath = path.join(process.cwd(), 'data', 'course-import-example.json');
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(fileContent);

        const result = validateCourseImport(data);

        console.log(JSON.stringify(result, null, 2));

    } catch (error) {
        console.error('Test failed:', error);
    }
}

runTest();
