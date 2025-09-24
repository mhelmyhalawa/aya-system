/**
 * DEPRECATED: Original Arabic labels file.
 * Now re-exports from unified multi-language registry in labels.ts.
 * All existing named exports kept for backward compatibility.
 */
import { getLabels } from './labels';
const L = getLabels('ar');
export const errorMessages = L.errorMessages;
export const successMessages = L.successMessages;
export const commonLabels = L.commonLabels;
export const studentsLabels = L.studentsLabels;
export const guardiansLabels = L.guardiansLabels;
// Backward compatibility re-exports (added during migration)
export const studyCirclesLabels = L.studyCirclesLabels;
export const databaseManagementLabels = L.databaseManagementLabels;
export const parentInquiryLabels = L.parentInquiryLabels;
export const dashboardStatsLabels = L.dashboardStatsLabels;
export const loginLabels = L.loginLabels;
export const userManagementLabels = L.userManagementLabels;
export const teacherHistoryLabels = L.teacherHistoryLabels;

export { getLabels };
// For compatibility retain previous additional groups if needed in future migrations.
// Developers should migrate to: import { getLabels } from '@/lib/labels';
