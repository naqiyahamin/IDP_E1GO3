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
  approveApplication: (appId: string) => Promise<void>;
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

    if (appsRes.data) setApplicationQueue(appsRes.data.map(dbRowToApplication));
    if (equipRes.data) setEquipmentRows(equipRes.data.map(dbRowToEquipment));
    if (invRes.data) setComponentInventory(invRes.data.map(dbRowToInventory));
    if (blackRes.data) setBlacklistedEmails(blackRes.data.map((r: Record<string, unknown>) => r.email as string));
    if (histRes.data) setTransactionHistory(histRes.data.map(dbRowToHistory));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Real-time subscription for applications table
  useEffect(() => {
    const channel = supabase
      .channel('applications-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'applications' },
        () => {
          supabase
            .from('applications')
            .select('*')
            .order('submitted_at', { ascending: true })
            .then((res) => {
              if (res.data) setApplicationQueue(res.data.map(dbRowToApplication));
            });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'equipment_rows' },
        () => {
          supabase
            .from('equipment_rows')
            .select('*')
            .order('no', { ascending: true })
            .then((res) => {
              if (res.data) setEquipmentRows(res.data.map(dbRowToEquipment));
            });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'component_inventory' },
        () => {
          supabase
            .from('component_inventory')
            .select('*')
            .order('name', { ascending: true })
            .then((res) => {
              if (res.data) setComponentInventory(res.data.map(dbRowToInventory));
            });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'blacklisted_emails' },
        () => {
          supabase
            .from('blacklisted_emails')
            .select('email')
            .then((res) => {
              if (res.data) setBlacklistedEmails(res.data.map((r: Record<string, unknown>) => r.email as string));
            });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transaction_history' },
        () => {
          supabase
            .from('transaction_history')
            .select('*')
            .order('borrow_timestamp', { ascending: true })
            .then((res) => {
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

    const { error } = await supabase.from('applications').insert(row);
    return !error;
  }, [blacklistedEmails]);

  const approveApplication = useCallback(async (appId: string) => {
    const { data: target } = await supabase.from('applications').select('*').eq('id', appId).single();
    if (!target) return;

    const equipmentCode = target.equipment_code as string;

    const { data: activeBorrows } = await supabase
      .from('applications')
      .select('id')
      .eq('equipment_code', equipmentCode)
      .eq('stage', 'ACTIVE_BORROW');

    if (activeBorrows && activeBorrows.length > 0) {
      await supabase.from('applications').update({ status: 'REJECTED', stage: 'PENDING' }).eq('id', appId);
      return;
    }

    const equipmentName = getEquipmentName(equipmentCode);
    const { data: invItem } = await supabase.from('component_inventory').select('*').eq('name', equipmentName).single();
    if (invItem && (invItem.units_on_shelf as number) <= 0) {
      await supabase.from('applications').update({ status: 'REJECTED', stage: 'PENDING' }).eq('id', appId);
      return;
    }

    await Promise.all([
      supabase.from('applications').update({
        status: 'APPROVED',
        stage: 'ACTIVE_BORROW',
        is_approved: true,
        approved_at: new Date().toISOString(),
        processed_at: new Date().toISOString(),
      }).eq('id', appId),
      supabase.from('equipment_rows').update({ status: 'BORROWED' }).eq('code', equipmentCode),
      supabase.from('component_inventory').update({
        units_out: (invItem?.units_out as number ?? 0) + 1,
        units_on_shelf: Math.max(0, (invItem?.units_on_shelf as number ?? 0) - 1),
      }).eq('name', equipmentName),
    ]);
  }, []);

  const rejectApplication = useCallback(async (appId: string) => {
    const { data: target } = await supabase.from('applications').select('equipment_code, stage').eq('id', appId).single();
    if (!target) return;

    const equipmentCode = target.equipment_code as string;

    // Check if other active apps use this equipment code
    const { data: otherActive } = await supabase
      .from('applications')
      .select('id')
      .neq('id', appId)
      .eq('equipment_code', equipmentCode)
      .in('stage', ['PENDING', 'ACTIVE_BORROW']);

    const shouldRelease = !otherActive || otherActive.length === 0;

    await supabase.from('applications').delete().eq('id', appId);

    if (shouldRelease) {
      await supabase.from('equipment_rows').update({ status: 'AVAILABLE' }).eq('code', equipmentCode);
    }
  }, []);

  const banApplication = useCallback(async (appId: string) => {
    const { data: target } = await supabase.from('applications').select('student_email, equipment_code').eq('id', appId).single();
    if (!target) return;

    const studentEmail = (target.student_email as string).toLowerCase().trim();
    const equipmentCode = target.equipment_code as string;

    await Promise.all([
      supabase.from('applications').update({
        status: 'BANNED',
        stage: 'HISTORICAL',
        is_blacklisted: true,
        processed_at: new Date().toISOString(),
      }).eq('id', appId),
      supabase.from('blacklisted_emails').insert({ email: studentEmail }).then(() => {
        // ignore conflict if already exists
      }),
    ]);

    // Check if other active apps use this equipment code
    const { data: otherActive } = await supabase
      .from('applications')
      .select('id')
      .neq('id', appId)
      .eq('equipment_code', equipmentCode)
      .in('stage', ['PENDING', 'ACTIVE_BORROW']);

    if (!otherActive || otherActive.length === 0) {
      await supabase.from('equipment_rows').update({ status: 'AVAILABLE' }).eq('code', equipmentCode);
    }
  }, []);

  const submitReturnRequest = useCallback(async (appId: string, returnData: ReturnDetailsData) => {
    await Promise.all([
      supabase.from('applications').update({
        is_returned: true,
        stage: 'RETURN_PENDING',
        return_date_returned: returnData.dateReturned,
        return_overseeing_staff: returnData.overseeingStaff,
        return_equipment_image: returnData.equipmentImage,
        return_submitted_at: new Date().toISOString(),
      }).eq('id', appId),
      supabase.from('equipment_rows').update({ status: 'RETURN_PENDING' }).eq('code',
        (await supabase.from('applications').select('equipment_code').eq('id', appId).single()).data?.equipment_code ?? ''
      ),
    ]);
  }, []);

  const approveReturnRequest = useCallback(async (appId: string) => {
    const { data: target } = await supabase.from('applications').select('*').eq('id', appId).single();
    if (!target) return;

    const equipmentCode = target.equipment_code as string;
    const equipmentName = getEquipmentName(equipmentCode);

    const { data: invItem } = await supabase.from('component_inventory').select('*').eq('name', equipmentName).single();

    await Promise.all([
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
  }, []);

  const getLastSubmittedForm = useCallback(() => {
    if (applicationQueue.length === 0) return null;
    return applicationQueue[applicationQueue.length - 1].formData;
  }, [applicationQueue]);

  const resetUserPassword = useCallback((email: string, newPassword: string): boolean => {
    return updateUserPasswordInRegistry(email, newPassword);
  }, []);

  const incomingVerificationQueue = useMemo(() =>
    applicationQueue.filter((app) => app.stage === 'PENDING' || app.stage === 'RETURN_PENDING'),
    [applicationQueue]
  );

  const processedApplicationsLog = useMemo(() =>
    applicationQueue.filter((app) => app.stage === 'ACTIVE_BORROW'),
    [applicationQueue]
  );

  const historicalLedger = useMemo(() =>
    applicationQueue.filter((app) => app.stage === 'HISTORICAL'),
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
