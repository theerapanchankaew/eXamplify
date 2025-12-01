# Data Import Guide

This guide explains how to import courses and exams into Firestore using JSON files.

## Prerequisites

1. **Firebase Admin SDK Service Account Key**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project
   - Go to **Project Settings** → **Service Accounts**
   - Click **Generate New Private Key**
   - Save the file as `service-account-key.json` in the project root
   - ⚠️ **IMPORTANT:** Add this file to `.gitignore` - never commit it!

2. **Install Dependencies**
   ```bash
   npm install
   ```

## Data Structure

All exams must be nested under courses. The structure is:
```
/courses/{courseId}/exams/{examId}/questions/{questionId}
```

## JSON Format

See `data/sample-courses.json` for a complete example. Basic structure:

```json
{
  "courses": [
    {
      "id": "course-001",
      "name": "Course Name",
      "description": "Description",
      "instructorId": "userId",
      "price": 100,
      "category": "category",
      "level": "beginner|intermediate|advanced",
      "duration": 3600,
      "exams": [
        {
          "id": "exam-001",
          "name": "Exam Name",
          "duration": 60,
          "passingScore": 70,
          "totalQuestions": 50,
          "price": 50,
          "questions": [
            {
              "id": "q1",
              "text": "Question text",
              "type": "multiple-choice",
              "options": ["A", "B", "C", "D"],
              "correctAnswer": "A",
              "points": 1
            }
          ]
        }
      ]
    }
  ]
}
```

## Import Process

### 1. Prepare Your JSON File

Create a JSON file following the format above. You can use `data/sample-courses.json` as a template.

### 2. Validate Your Data

The import script will automatically validate your data before importing. It checks for:
- Required fields
- Valid data types
- Duplicate IDs
- Question structure (e.g., multiple-choice must have options)
- Correct answer in options

### 3. Run the Import

```bash
npm run import-courses -- path/to/your-courses.json
```

Example:
```bash
npm run import-courses -- data/sample-courses.json
```

### 4. Review the Output

The script will show:
- ✅ Validation results
- 📦 Import progress for each course/exam
- 📊 Summary statistics
- ❌ Any errors encountered

Example output:
```
🚀 Starting import process...
════════════════════════════════════════════════════════════
📖 Reading file: data/sample-courses.json
✅ File parsed successfully
🔍 Validating data...
✅ Validation passed

📦 Importing 2 courses...

  📚 Importing course: ข้อสอบข้าราชการไทย (course-thai-civil-service)
    ✅ Course imported
    📝 Importing 2 exams...
      ✅ Exam imported: ความรู้ทั่วไป ชุดที่ 1
        📋 Importing 5 questions...
        ✅ 5 questions imported
      ✅ Exam imported: กฎหมายพื้นฐาน ชุดที่ 1
        📋 Importing 3 questions...
        ✅ 3 questions imported

════════════════════════════════════════════════════════════

📊 Import Summary:
  ✅ Courses imported: 2
  ✅ Exams imported: 3
  ✅ Questions imported: 125
  ⏱️  Duration: 2.45s

✨ Import completed successfully!
```

## Validation Rules

### Course Fields
- `id`: Required, unique across all courses
- `name`: Required
- `description`: Required
- `instructorId`: Required
- `price`: Required, non-negative number
- `category`: Required
- `level`: Required, must be "beginner", "intermediate", or "advanced"
- `duration`: Required, non-negative number (in seconds)
- `exams`: Optional array of exams

### Exam Fields
- `id`: Required, unique within course
- `name`: Required
- `description`: Required
- `duration`: Required, positive number (in minutes)
- `passingScore`: Required, 0-100
- `totalQuestions`: Required, positive number
- `price`: Required, non-negative number
- `questions`: Required, array with at least 1 question

### Question Fields
- `id`: Required, unique within exam
- `text`: Required
- `type`: Required, "multiple-choice", "true-false", or "essay"
- `options`: Required for multiple-choice, array of strings
- `correctAnswer`: Required, must be in options for multiple-choice
- `explanation`: Optional
- `points`: Optional, defaults to 1

## Common Issues

### "Exam not found" Error
- Make sure you've imported the courses/exams
- Check that exam IDs match between your JSON and what's in the marketplace
- Verify the data was actually imported to Firestore

### Validation Errors
- Check the error message for specific field issues
- Ensure all required fields are present
- Verify data types match the schema
- Check for duplicate IDs

### Permission Errors
- Ensure `service-account-key.json` is in the project root
- Verify the service account has Firestore write permissions
- Check that Firestore rules allow the import

## Tips

1. **Start Small**: Test with a small JSON file first (1-2 courses)
2. **Backup**: Always backup your Firestore data before bulk imports
3. **Validate**: Run validation on your JSON before importing
4. **Review**: Check Firestore Console after import to verify data

## Next Steps

After importing:
1. Verify data in [Firestore Console](https://console.firebase.google.com/)
2. Test accessing exams in the application
3. Try purchasing and taking an exam
4. Check that enrollments are created correctly
