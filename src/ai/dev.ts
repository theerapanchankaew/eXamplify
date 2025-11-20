import { config } from 'dotenv';
config();

import '@/ai/flows/generate-lesson-summary.ts';
import '@/ai/flows/generate-module-introduction.ts';
import '@/ai/flows/generate-chapter-quiz.ts';