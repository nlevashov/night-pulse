/**
 * Chart generation utilities
 *
 * Note: Text/report generation has been moved to lib/formatting/report-text.ts
 * This file is kept for future chart-specific utilities (e.g., chart image generation)
 */

// Re-export from formatting module for backwards compatibility during transition
export { generateReportText, generateEmailSubject } from '../formatting/report-text';
