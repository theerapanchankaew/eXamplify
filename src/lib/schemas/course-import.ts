import Ajv, { JSONSchemaType } from 'ajv';
import addFormats from 'ajv-formats';

export interface LessonResource {
    name: string;
    url: string;
    type: 'pdf' | 'video' | 'link' | 'file';
}

export interface LessonImport {
    title: string;
    content: string;
    type?: 'text' | 'video' | 'quiz' | 'interactive';
    duration?: number;
    order?: number;
    resources?: LessonResource[];
    objectives?: string[];
}

export interface ChapterImport {
    name: string;
    description?: string;
    order?: number;
    lessons: LessonImport[];
}

export interface ModuleImport {
    name: string;
    description?: string;
    order?: number;
    chapters: ChapterImport[];
}

export interface CourseImport {
    name: string;
    description: string;
    price?: number;
    tags?: string[];
    level?: 'beginner' | 'intermediate' | 'advanced';
    language?: string;
    estimatedDuration?: number;
    thumbnail?: string;
    published?: boolean;
    modules: ModuleImport[];
}

export interface CourseImportData {
    version: string;
    course: CourseImport;
}

const courseImportSchema: JSONSchemaType<CourseImportData> = {
    type: 'object',
    required: ['version', 'course'],
    properties: {
        version: { type: 'string', const: '1.0' },
        course: {
            type: 'object',
            required: ['name', 'description', 'modules'],
            properties: {
                name: { type: 'string', minLength: 1, maxLength: 200 },
                description: { type: 'string', minLength: 1, maxLength: 2000 },
                price: { type: 'number', minimum: 0, nullable: true },
                tags: { type: 'array', items: { type: 'string' }, nullable: true },
                level: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'], nullable: true },
                language: { type: 'string', nullable: true },
                estimatedDuration: { type: 'number', nullable: true },
                thumbnail: { type: 'string', format: 'uri', nullable: true },
                published: { type: 'boolean', nullable: true },
                modules: {
                    type: 'array',
                    minItems: 1,
                    items: {
                        type: 'object',
                        required: ['name', 'chapters'],
                        properties: {
                            name: { type: 'string', minLength: 1, maxLength: 200 },
                            description: { type: 'string', maxLength: 1000, nullable: true },
                            order: { type: 'number', minimum: 0, nullable: true },
                            chapters: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    required: ['name', 'lessons'],
                                    properties: {
                                        name: { type: 'string', minLength: 1, maxLength: 200 },
                                        description: { type: 'string', maxLength: 1000, nullable: true },
                                        order: { type: 'number', minimum: 0, nullable: true },
                                        lessons: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                required: ['title', 'content'],
                                                properties: {
                                                    title: { type: 'string', minLength: 1, maxLength: 200 },
                                                    content: { type: 'string', minLength: 1 },
                                                    type: { type: 'string', enum: ['text', 'video', 'quiz', 'interactive'], nullable: true },
                                                    duration: { type: 'number', nullable: true },
                                                    order: { type: 'number', minimum: 0, nullable: true },
                                                    resources: {
                                                        type: 'array',
                                                        items: {
                                                            type: 'object',
                                                            required: ['name', 'url', 'type'],
                                                            properties: {
                                                                name: { type: 'string' },
                                                                url: { type: 'string', format: 'uri' },
                                                                type: { type: 'string', enum: ['pdf', 'video', 'link', 'file'] }
                                                            }
                                                        },
                                                        nullable: true
                                                    },
                                                    objectives: { type: 'array', items: { type: 'string' }, nullable: true }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
};

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(courseImportSchema);

export interface ValidationError {
    path: string;
    message: string;
    severity: 'error' | 'warning';
}

export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
}

export function validateCourseImport(data: any): ValidationResult {
    const errors: ValidationError[] = [];

    if (!validate(data)) {
        validate.errors?.forEach((err) => {
            errors.push({
                path: err.instancePath,
                message: err.message || 'Validation error',
                severity: 'error',
            });
        });
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}
