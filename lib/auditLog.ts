import { getSupabase } from './supabase';
import { getSessionToken } from './sessionClient';

type AuditAction = 'view' | 'export' | 'edit' | 'delete' | 'login' | 'consent';
type TargetTable = 'students' | 'professionals' | 'consent_records' | 'modalities' | 'contratos' | 'imc_assessments' | 'motor_assessments' | 'sport_assessments' | 'vocational_assessments' | 'health_assessments' | 'oral_assessments' | 'autoconcept_assessments' | 'ias_assessments' | 'snap_assessments' | 'aq10_assessments' | 'pcd_assessments' | 'performance_reports';

export async function logDataAccess(
  _userId: string,
  _userRole: string,
  action: AuditAction,
  targetTable: TargetTable,
  targetId?: string,
  targetField?: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    const token = getSessionToken();
    if (!token) return;
    const res = await fetch('/api/audit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action, targetTable, targetId, targetField, details }),
    });
    if (!res.ok) {
      console.warn('[LGPD] Falha ao registrar log de acesso: HTTP', res.status);
    }
  } catch (err) {
    // Silent fail — audit logs should never block the user
    console.warn('[LGPD] Falha ao registrar log de acesso:', err);
  }
}

export async function logExport(
  userId: string,
  userRole: string,
  targetTable: TargetTable,
  format: 'excel' | 'pdf',
  recordCount: number
): Promise<void> {
  return logDataAccess(userId, userRole, 'export', targetTable, undefined, undefined, {
    format,
    record_count: recordCount,
  });
}

export async function registerConsent(
  registeredBy: string,
  dataSubjectRole: string,
  dataSubjectIdentifier: string,
  purposes: string[]
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = getSupabase();
    if (!supabase) return { ok: false, error: 'No client' };

    const { error } = await supabase.rpc('register_consent', {
      subject_role: dataSubjectRole,
      subject_identifier: dataSubjectIdentifier,
      consent_purposes: purposes,
      registered_by: registeredBy,
    });
    if (error) {
      console.warn('[LGPD] Falha ao registrar consentimento:', error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    console.warn('[LGPD] Falha ao registrar consentimento:', err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
