import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { supabase } from './lib/supabase';
import { type BorrowFormData } from './components/BorrowFormModal';
import { updateUserPasswordInRegistry } from './auth';

export type EquipmentStatus = 'AVAILABLE' | 'PENDING PICKUP' | 'BORROWED' | 'RETURN_PENDING' | 'BROKEN' | 'CALIBRATING';

export type AppStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'RETURNED' | 'BANNED';

export interface ReturnDetailsData {
  dateReturned: string;
  overseeingStaff: string;
  equipmentImage: string;
}

export interface ComponentType {
  name: string;
  totalUnits: number;
  unitsOut: number;
  unitsOnShelf: number;
}

export interface HistoryEntry {
  equipmentCode: string;
  componentType: string;
  studentName: string;
  studentEmail: string;
  borrowDate: string;
  returnDueTime: string;
  borrowTimestamp: string;
  status: 'ACTIVE' | 'RETURNED' | 'PENDING_RETURN';
  returnedDate?: string;
}

export interface OscilloscopeRow {
  no: number;
  code: string;
  lastDateUsed: string;
  labLocation: string;
  status: EquipmentStatus;
  verificationBy: string;
  equipmentName?: string;
  equipmentType?: string;
  quantityAvailable?: number;
}

export interface Application {
  id: string;
  formData: BorrowFormData;
  equipmentCode: string;
  submittedAt: string;
  isBlacklisted: boolean;
  status: AppStatus;
  photoAttachment?: string;
  processedAt?: string;
  returnDetails?: ReturnDetailsData;
  stage: 'PENDING' | 'ACTIVE_BORROW' | 'HISTORICAL' | 'RETURN_PENDING' | 'BANNED';
  isApproved: boolean;
  isReturned: boolean;
  isReturnVerified: boolean;
  approvedAt?: string;
  returnSubmittedAt?: string;
  returnVerifiedAt?: string;
  originalEquipmentCode?: string;
  finalEquipmentCode?: string;
  autoRedirectNote?: string;
  waitingListReason?: string;
  equipmentType?: string;
  overdueEmailSent?: boolean;
}

interface AppState {
  equipmentRows: OscilloscopeRow[];
  applicationQueue: Application[];
  blacklistedEmails: string[];
  componentInventory: ComponentType[];
  transactionHistory: HistoryEntry[];
  incomingVerificationQueue: Application[];
  processedApplicationsLog: Application[];
  historicalLedger: Application[];
  loading: boolean;
  updateEquipmentStatus: (code: string, newStatus: EquipmentStatus) => void;
  submitApplication: (formData: BorrowFormData, equipmentCode: string, photoAttachment?: string) => Promise<boolean>;
  approveApplication: (appId: string) => Promise<{
    status: string;
    message?: string;
    originalEquipmentCode?: string;
    finalEquipmentCode?: string;
    autoRedirectNote?: string;
  }>;
  rejectApplication: (appId: string) => Promise<void>;
  banApplication: (appId: string) => Promise<void>;
  submitReturnRequest: (appId: string, returnData: ReturnDetailsData) => Promise<void>;
  approveReturnRequest: (appId: string) => Promise<void>;
  toggleBlacklistUser: (email: string) => void;
  getLastSubmittedForm: () => BorrowFormData | null;
  resetUserPassword: (email: string, newPassword: string) => boolean;
}

const AppContext = createContext<AppState | null>(null);

function getEquipmentName(code: string): string {
  if (code.startsWith('AGT')) return 'Digital Oscilloscope';
  if (code.startsWith('ARD')) return 'Arduino Uno';
  if (code.startsWith('ESP')) return 'ESP32 Microcontroller';
  if (code.startsWith('MXW')) return 'Regulated DC Power Supply';
  return 'Digital Oscilloscope';
}

export function isApplicationOverdue(app: Application, currentTime?: Date): boolean {
  if (app.isReturned && app.returnDetails) return false;
  const now = currentTime || new Date();
  const borrowDate = new Date(app.formData.dateBorrow);
  if (isNaN(borrowDate.getTime())) return false;
  return borrowDate < now;
}

export function formatExpectedReturnAt(app: Application): string {
  const borrowDate = app.formData.dateBorrow;
  const returnTime = app.formData.returnTime;
  if (!borrowDate || !returnTime) return '';
  try {
    const date = new Date(borrowDate);
    if (isNaN(date.getTime())) return `${borrowDate} ${returnTime}`;
    return `${borrowDate} ${returnTime}`;
  } catch {
    return `${borrowDate} ${returnTime}`;
  }
}

function dbRowToApplication(row: Record<string, unknown>): Application {
  return {
    id: row.id as string,
    equipmentCode: row.equipment_code as string,
    submittedAt: row.submitted_at as string,
    isBlacklisted: row.is_blacklisted as boolean,
    status: row.status as AppStatus,
    photoAttachment: (row.photo_attachment as string) || undefined,
    stage: row.stage as Application['stage'],
    isApproved: row.is_approved as boolean,
    isReturned: row.is_returned as boolean,
    isReturnVerified: row.is_return_verified as boolean,
    approvedAt: (row.approved_at as string) || undefined,
    processedAt: (row.processed_at as string) || undefined,
    returnSubmittedAt: (row.return_submitted_at as string) || undefined,
    returnVerifiedAt: (row.return_verified_at as string) || undefined,
    returnDetails: (row.return_date_returned || row.return_overseeing_staff || row.return_equipment_image)
      ? {
          dateReturned: (row.return_date_returned as string) || '',
          overseeingStaff: (row.return_overseeing_staff as string) || '',
          equipmentImage: (row.return_equipment_image as string) || '',
        }
      : undefined,
    formData: {
      fullName: row.student_name as string,
      emailAddress: row.student_email as string,
      phoneNumber: row.student_phone as string,
      yearCourse: row.student_year_course as string,
      dateBorrow: row.borrow_date as string,
      duration: row.duration as string,
      returnTime: row.return_target as string,
    },
    originalEquipmentCode: (row.original_equipment_code as string) || undefined,
    finalEquipmentCode: (row.final_equipment_code as string) || undefined,
    autoRedirectNote: (row.auto_redirect_note as string) || undefined,
    waitingListReason: (row.waiting_list_reason as string) || undefined,
    equipmentType: (row.equipment_type as string) || undefined,
    overdueEmailSent: row.overdue_email_sent as boolean,
  };
}

function dbRowToEquipment(row: Record<string, unknown>): OscilloscopeRow {
  return {
    no: row.no as number,
    code: row.code as string,
    lastDateUsed: row.last_date_used as string,
    labLocation: row.lab_location as string,
    status: row.status as EquipmentStatus,
    verificationBy: row.verification_by as string,
    equipmentName: (row.equipment_name as string) || undefined,
    equipmentType: (row.equipment_type as string) || undefined,
    quantityAvailable: row.quantity_available as number,
  };
}

function dbRowToInventory(row: Record<string, unknown>): ComponentType {
  return {
    name: row.name as string,
    totalUnits: row.total_units as number,
    unitsOut: row.units_out as number,
    unitsOnShelf: row.units_on_shelf as number,
  };
}

function dbRowToHistory(row: Record<string, unknown>): HistoryEntry {
  return {
    equipmentCode: row.equipment_code as string,
    componentType: row.component_type as string,
    studentName: row.student_name as string,
    studentEmail: row.student_email as string,
    borrowDate: row.borrow_date as string,
    returnDueTime: row.return_due_time as string,
    borrowTimestamp: row.borrow_timestamp as string,
    status: row.status as HistoryEntry['status'],
    returnedDate: (row.returned_date as string) || undefined,
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [equipmentRows, setEquipmentRows] = useState<OscilloscopeRow[]>([]);
  const [applicationQueue, setApplicationQueue] = useState<Application[]>([]);
  const [blacklistedEmails, setBlacklistedEmails] = useState<string[]>([]);
  const [componentInventory, setComponentInventory] = useState<ComponentType[]>([]);
  const [transactionHistory, setTransactionHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllData = useCallback(async () => {
    const [appsRes, equipRes, invRes, blackRes, histRes] = await Promise.all([
      supabase.from('applications').select('*').order('submitted_at', { ascending: true }),
      supabase.from('equipment_rows').select('*').order('no', { ascending: true }),
      supabase.from('component_inventory').select('*').order('name', { ascending: true }),
      supabase.from('blacklisted_emails').select('email'),
      supabase.from('transaction_history').select('*').order('borrow_timestamp', { ascending: true }),
    ]);

    if (appsRes.error) console.error('Fetch applications failed:', appsRes.error);
    if (equipRes.error) console.error('Fetch equipment rows failed:', equipRes.error);
    if (invRes.error) console.error('Fetch component inventory failed:', invRes.error);
    if (blackRes.error) console.error('Fetch blacklisted emails failed:', blackRes.error);
    if (histRes.error) console.error('Fetch transaction history failed:', histRes.error);

    setApplicationQueue((appsRes.data || []).map(dbRowToApplication));
    setEquipmentRows((equipRes.data || []).map(dbRowToEquipment));
    setComponentInventory((invRes.data || []).map(dbRowToInventory));
    setBlacklistedEmails(
      (blackRes.data || []).map((r: Record<string, unknown>) =>
        String(r.email || '').toLowerCase().trim()
      )
    );
    setTransactionHistory((histRes.data || []).map(dbRowToHistory));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Real-time subscription for all tables
  useEffect(() => {
    const channel = supabase
      .channel('lab-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'applications' },
        () => {
          supabase.from('applications').select('*').order('submitted_at', { ascending: true }).then((res) => {
            if (res.data) setApplicationQueue(res.data.map(dbRowToApplication));
          });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'equipment_rows' },
        () => {
          supabase.from('equipment_rows').select('*').order('no', { ascending: true }).then((res) => {
            if (res.data) setEquipmentRows(res.data.map(dbRowToEquipment));
          });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'component_inventory' },
        () => {
          supabase.from('component_inventory').select('*').order('name', { ascending: true }).then((res) => {
            if (res.data) setComponentInventory(res.data.map(dbRowToInventory));
          });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'blacklisted_emails' },
        () => {
          supabase.from('blacklisted_emails').select('email').then((res) => {
            if (res.data) setBlacklistedEmails(res.data.map((r: Record<string, unknown>) => r.email as string));
          });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transaction_history' },
        () => {
          supabase.from('transaction_history').select('*').order('borrow_timestamp', { ascending: true }).then((res) => {
            if (res.data) setTransactionHistory(res.data.map(dbRowToHistory));
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateEquipmentStatus = useCallback((code: string, newStatus: EquipmentStatus) => {
    supabase.from('equipment_rows').update({ status: newStatus }).eq('code', code).then();
  }, []);

  const toggleBlacklistUser = useCallback((email: string) => {
    const targetEmail = email.toLowerCase().trim();
    if (blacklistedEmails.includes(targetEmail)) {
      supabase.from('blacklisted_emails').delete().eq('email', targetEmail).then();
    } else {
      supabase.from('blacklisted_emails').insert({ email: targetEmail }).then();
    }
  }, [blacklistedEmails]);

  const submitApplication = useCallback(async (formData: BorrowFormData, equipmentCode: string, photoAttachment?: string): Promise<boolean> => {
    const studentEmail = formData.emailAddress.toLowerCase().trim();
    const isBlacklisted = blacklistedEmails.includes(studentEmail);

    const row: Record<string, unknown> = {
      student_email: studentEmail,
      student_name: formData.fullName,
      student_phone: formData.phoneNumber,
      student_year_course: formData.yearCourse,
      equipment_code: equipmentCode,
      equipment_name: getEquipmentName(equipmentCode),
      original_equipment_code: equipmentCode,
      final_equipment_code: null,
      auto_redirect_note: null,
      waiting_list_reason: null,
      borrow_date: formData.dateBorrow,
      duration: formData.duration,
      return_target: formData.returnTime,
      photo_attachment: photoAttachment || null,
      status: 'PENDING',
      stage: 'PENDING',
      is_blacklisted: isBlacklisted,
      is_approved: false,
      is_returned: false,
      is_return_verified: false,
    };

    const { data: insertedApp, error } = await supabase
      .from('applications')
      .insert(row)
      .select('id')
      .single();

    if (error) {
      console.error('Submit application failed:', error);
      return false;
    }

    try {
      const { error: smsError } = await supabase.functions.invoke('send-new-application-sms', {
        body: {
          record: {
            id: insertedApp.id,
          },
        },
      });

      if (smsError) {
        console.error('New application staff SMS failed:', smsError);
      }
    } catch (smsError) {
      console.error('New application staff SMS failed:', smsError);
    }

    await fetchAllData();
    return true;
  }, [blacklistedEmails, fetchAllData]);

  const approveApplication = useCallback(async (appId: string) => {
    const { data, error } = await supabase.rpc('approve_application_with_redirect', { p_app_id: appId });
    if (error) {
      console.error('Approval failed:', error);
      return { status: 'error', message: error.message };
    }
    await fetchAllData();
    return {
      status: (data as Record<string, unknown>).status as string,
      message: (data as Record<string, unknown>).message as string | undefined,
      originalEquipmentCode: (data as Record<string, unknown>).originalEquipmentCode as string | undefined,
      finalEquipmentCode: (data as Record<string, unknown>).finalEquipmentCode as string | undefined,
      autoRedirectNote: (data as Record<string, unknown>).autoRedirectNote as string | undefined,
    };
  }, [fetchAllData]);

  const rejectApplication = useCallback(async (appId: string) => {
    const { data: target } = await supabase.from('applications').select('equipment_code, stage').eq('id', appId).single();
    if (!target) return;

    const equipmentCode = target.equipment_code as string;

    const { data: otherActive } = await supabase
      .from('applications')
      .select('id')
      .neq('id', appId)
      .eq('equipment_code', equipmentCode)
      .in('stage', ['PENDING', 'ACTIVE_BORROW']);

    const shouldRelease = !otherActive || otherActive.length === 0;

    const { error: deleteError } = await supabase.from('applications').delete().eq('id', appId);
    if (deleteError) {
      console.error('Reject application failed:', deleteError);
      return;
    }

    if (shouldRelease) {
      const { error: equipmentError } = await supabase
        .from('equipment_rows')
        .update({ status: 'AVAILABLE' })
        .eq('code', equipmentCode);

      if (equipmentError) {
        console.error('Release equipment after reject failed:', equipmentError);
      }
    }

    await fetchAllData();
  }, [fetchAllData]);

  const banApplication = useCallback(async (appId: string) => {
    const { data: target } = await supabase.from('applications').select('student_email, equipment_code').eq('id', appId).single();
    if (!target) return;

    const studentEmail = (target.student_email as string).toLowerCase().trim();
    const equipmentCode = target.equipment_code as string;

    const [banRes, blacklistRes] = await Promise.all([
      supabase.from('applications').update({
        status: 'BANNED',
        stage: 'HISTORICAL',
        is_blacklisted: true,
        processed_at: new Date().toISOString(),
      }).eq('id', appId),
      supabase.from('blacklisted_emails').upsert({ email: studentEmail }),
    ]);

    if (banRes.error || blacklistRes.error) {
      console.error('Ban application failed:', banRes.error || blacklistRes.error);
      return;
    }

    const { data: otherActive } = await supabase
      .from('applications')
      .select('id')
      .neq('id', appId)
      .eq('equipment_code', equipmentCode)
      .in('stage', ['PENDING', 'ACTIVE_BORROW']);

    if (!otherActive || otherActive.length === 0) {
      const { error: equipmentError } = await supabase
        .from('equipment_rows')
        .update({ status: 'AVAILABLE' })
        .eq('code', equipmentCode);

      if (equipmentError) {
        console.error('Release equipment after ban failed:', equipmentError);
      }
    }

    await fetchAllData();
  }, [fetchAllData]);

  const submitReturnRequest = useCallback(async (appId: string, returnData: ReturnDetailsData) => {
    const { data: target } = await supabase.from('applications').select('equipment_code').eq('id', appId).single();
    if (!target) return;

    const [returnRes, equipmentRes] = await Promise.all([
      supabase.from('applications').update({
        is_returned: true,
        stage: 'RETURN_PENDING',
        return_date_returned: returnData.dateReturned,
        return_overseeing_staff: returnData.overseeingStaff,
        return_equipment_image: returnData.equipmentImage,
        return_submitted_at: new Date().toISOString(),
      }).eq('id', appId),
      supabase.from('equipment_rows').update({ status: 'RETURN_PENDING' }).eq('code', target.equipment_code as string),
    ]);

    if (returnRes.error || equipmentRes.error) {
      console.error('Submit return request failed:', returnRes.error || equipmentRes.error);
      return;
    }

    await fetchAllData();
  }, [fetchAllData]);

  const approveReturnRequest = useCallback(async (appId: string) => {
    const { data: target } = await supabase.from('applications').select('*').eq('id', appId).single();
    if (!target) return;

    const equipmentCode = target.equipment_code as string;
    const equipmentName = (target.equipment_name as string) || getEquipmentName(equipmentCode);

    const { data: invItem } = await supabase.from('component_inventory').select('*').eq('name', equipmentName).single();

    const [appRes, equipmentRes, inventoryRes, historyRes] = await Promise.all([
      supabase.from('applications').update({
        status: 'RETURNED',
        stage: 'HISTORICAL',
        is_return_verified: true,
        processed_at: new Date().toISOString(),
        return_verified_at: new Date().toISOString(),
      }).eq('id', appId),
      supabase.from('equipment_rows').update({
        status: 'AVAILABLE',
        last_date_used: target.return_date_returned || new Date().toISOString().split('T')[0],
      }).eq('code', equipmentCode),
      supabase.from('component_inventory').update({
        units_out: Math.max(0, (invItem?.units_out as number ?? 1) - 1),
        units_on_shelf: (invItem?.units_on_shelf as number ?? 0) + 1,
      }).eq('name', equipmentName),
      supabase.from('transaction_history').insert({
        equipment_code: equipmentCode,
        component_type: equipmentName,
        student_name: target.student_name,
        student_email: target.student_email,
        borrow_date: target.borrow_date,
        return_due_time: target.return_target,
        borrow_timestamp: target.approved_at || new Date().toISOString(),
        status: 'RETURNED',
        returned_date: target.return_date_returned || new Date().toISOString().split('T')[0],
      }),
    ]);

    const firstError = appRes.error || equipmentRes.error || inventoryRes.error || historyRes.error;
    if (firstError) {
      console.error('Approve return request failed:', firstError);
      return;
    }

    await fetchAllData();
  }, [fetchAllData]);

  const getLastSubmittedForm = useCallback(() => {
    if (applicationQueue.length === 0) return null;
    return applicationQueue[applicationQueue.length - 1].formData;
  }, [applicationQueue]);

  const resetUserPassword = useCallback((email: string, newPassword: string): boolean => {
    return updateUserPasswordInRegistry(email, newPassword);
  }, []);

  const incomingVerificationQueue = useMemo(
    () => applicationQueue.filter((app) => app.stage === 'PENDING'),
    [applicationQueue]
  );

  const processedApplicationsLog = useMemo(
    () => applicationQueue.filter((app) => app.stage === 'ACTIVE_BORROW' || app.stage === 'RETURN_PENDING'),
    [applicationQueue]
  );

  const historicalLedger = useMemo(
    () => applicationQueue.filter((app) => app.stage === 'HISTORICAL' || app.stage === 'BANNED'),
    [applicationQueue]
  );

  return (
    <AppContext.Provider
      value={{
        equipmentRows,
        applicationQueue,
        blacklistedEmails,
        componentInventory,
        transactionHistory,
        incomingVerificationQueue,
        processedApplicationsLog,
        historicalLedger,
        loading,
        updateEquipmentStatus,
        submitApplication,
        approveApplication,
        rejectApplication,
        banApplication,
        submitReturnRequest,
        approveReturnRequest,
        toggleBlacklistUser,
        getLastSubmittedForm,
        resetUserPassword,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppState must be used within AppProvider');
  return ctx;
}

