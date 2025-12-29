import { supabase } from './supabaseClient';

export type ReportType = 'request' | 'offer' | 'user';
export type ReportReason = 
  | 'spam' 
  | 'inappropriate' 
  | 'fraud' 
  | 'harassment' 
  | 'misleading' 
  | 'other';

export interface Report {
  id: string;
  reporter_id: string;
  report_type: ReportType;
  target_id: string; // ID of request, offer, or user being reported
  reason: ReportReason;
  description?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  created_at: string;
  updated_at: string;
}

export interface CreateReportInput {
  report_type: ReportType;
  target_id: string;
  reason: ReportReason;
  description?: string;
}

// Get reason label in Arabic
export const getReasonLabel = (reason: ReportReason): string => {
  const labels: Record<ReportReason, string> = {
    spam: 'محتوى مزعج (سبام)',
    inappropriate: 'محتوى غير لائق',
    fraud: 'احتيال أو نصب',
    harassment: 'تحرش أو إساءة',
    misleading: 'معلومات مضللة',
    other: 'سبب آخر',
  };
  return labels[reason];
};

// All available reasons
export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: 'محتوى مزعج (سبام)' },
  { value: 'inappropriate', label: 'محتوى غير لائق' },
  { value: 'fraud', label: 'احتيال أو نصب' },
  { value: 'harassment', label: 'تحرش أو إساءة' },
  { value: 'misleading', label: 'معلومات مضللة' },
  { value: 'other', label: 'سبب آخر' },
];

/**
 * Create a new report
 */
export const createReport = async (input: CreateReportInput): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'يجب تسجيل الدخول للإبلاغ' };
    }

    // Check if user already reported this item
    const { data: existingReport } = await supabase
      .from('reports')
      .select('id')
      .eq('reporter_id', user.id)
      .eq('target_id', input.target_id)
      .eq('report_type', input.report_type)
      .single();

    if (existingReport) {
      return { success: false, error: 'لقد قمت بالإبلاغ عن هذا المحتوى مسبقاً' };
    }

    const { error } = await supabase
      .from('reports')
      .insert({
        reporter_id: user.id,
        report_type: input.report_type,
        target_id: input.target_id,
        reason: input.reason,
        description: input.description || null,
        status: 'pending',
      });

    if (error) {
      console.error('Error creating report:', error);
      return { success: false, error: 'حدث خطأ أثناء إرسال البلاغ' };
    }

    return { success: true };
  } catch (err) {
    console.error('Error in createReport:', err);
    return { success: false, error: 'حدث خطأ غير متوقع' };
  }
};

/**
 * Check if user has already reported an item
 */
export const hasUserReported = async (targetId: string, reportType: ReportType): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return false;

    const { data } = await supabase
      .from('reports')
      .select('id')
      .eq('reporter_id', user.id)
      .eq('target_id', targetId)
      .eq('report_type', reportType)
      .single();

    return !!data;
  } catch {
    return false;
  }
};

/**
 * Get reports count for an item (admin use)
 */
export const getReportsCount = async (targetId: string): Promise<number> => {
  try {
    const { count } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('target_id', targetId);

    return count || 0;
  } catch {
    return 0;
  }
};

