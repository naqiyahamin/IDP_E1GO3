import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { supabase } from './lib/supabase';
import { type BorrowFormData } from './components/BorrowFormModal';
import { updateUserPasswordInRegistry } from './auth';

export type EquipmentStatus =
  | 'AVAILABLE'
  | 'PENDING PICKUP'
  | 'BORROWED'
  | 'RETURN_PENDING'
  | 'BROKEN'
  | 'CALIBRATING';

export type AppStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'RETURNED'
  | 'BANNED'
  | 'WAITING_LIST';

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
  originalEquipmentCode?: string;
  finalEquipmentCode?: string;
  autoRedirectNote?: string;
  waitingListReason?: string;
  equipmentType?: string;
  submittedAt: string;
  isBlacklisted: boolean;
  status: AppStatus;
  photoAttachment?: string;
  processedAt?: string;
  returnDetails?: ReturnDetailsData;
  stage: 'PENDING' | 'ACTIVE_BORROW' | 'HISTORICAL' | 'RETURN_PENDING' | 'BANNED' | 'WAITING_LIST';
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
  submitApplication: (
    formData: BorrowFormData,
    equipmentCode: string,
    photoAttachment?: string
  ) => Promise<boolean>;
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

function getEquipmentTypeKey(code: string): string {
  const match = code.match(/^[A-Za-z]+/);
  return match ? match[0].toUpperCase() : code.slice(0, 3).toUpperCase();
}

function normalizeStatus(status: unknown): AppStatus {
  const value = String(status || 'PENDING').toUpperCase().replace(/\s+/g, '_');

  if (
    value === 'PENDING' ||
    value === 'APPROVED' ||
    value === 'REJECTED' ||
    value === 'RETURNED' ||
    value === 'BANNED' ||
    value === 'WAITING_LIST'
  ) {
    return value;
  }

  return 'PENDING';
}

function normalizeStage(stage: unknown): Application['stage'] {
  const value = String(stage || 'PENDING').toUpperCase().replace(/\s+/g, '_');

  if (
    value === 'PENDING' ||
    value === 'ACTIVE_BORROW' ||
    value === 'HISTORICAL' ||
    value === 'RETURN_PENDING' ||
    value === 'BANNED' ||
    value === 'WAITING_LIST'
  ) {
    return value;
  }

  return 'PENDING';
}

function dbRowToApplication(row: Record<string, unknown>): Application {
  const originalEquipmentCode =
    (row.original_equipment_code as string) ||
    (row.equipment_code as string) ||
    '';

  const finalEquipmentCode =
    (row.final_equipment_code as string) ||
    (row.equipment_code as string) ||
    '';

  return {
    id: row.id as string,
    equipmentCode: finalEquipmentCode,
    originalEquipmentCode,
    finalEquipmentCode,
    autoRedirectNote: (row.auto_redirect_note as string) || undefined,
    waitingListReason: (row.waiting_list_reason as string) || undefined,
    equipmentType: (row.equipment_type as string) || undefined,
    submittedAt: (row.submitted_at as string) || '',
    isBlacklisted: Boolean(row.is_blacklisted),
    status: normalizeStatus(row.status),
    photoAttachment: (row.photo_attachment as string) || undefined,
    stage: normalizeStage(row.stage),
    isApproved: Boolean(row.is_approved),
    isReturned: Boolean(row.is_returned),
    isReturnVerified: Boolean(row.is_return_verified),
    approvedAt: (row.approved_at as string) || undefined,
    processedAt: (row.processed_at as string) || undefined,
    returnSubmittedAt: (row.return_submitted_at as string) || undefined,
    returnVerifiedAt: (row.return_verified_at as string) || undefined,
    returnDetails:
      row.return_date_returned || row.return_overseeing_staff || row.return_equipment_image
        ? {
            dateReturned: (row.return_date_returned as string) || '',
            overseeingStaff: (row.return_overseeing_staff as string) || '',
            equipmentImage: (row.return_equipment_image as string) || '',
          }
        : undefined,
    formData: {
      fullName: (row.student_name as string) || '',
      emailAddress: (row.student_email as string) || '',
      phoneNumber: (row.student_phone as string) || '',
      yearCourse: (row.student_year_course as string) || '',
      dateBorrow: (row.borrow_date as string) || '',
      duration: (row.duration as string) || '',
      returnTime: (row.return_target as string) || '',
    },
  };
}

function dbRowToEquipment(row: Record<string, unknown>): OscilloscopeRow {
  return {
    no: Number(row.no || 0),
    code: String(row.code || ''),
    lastDateUsed: String(row.last_date_used || ''),
    labLocation: String(row.lab_location || ''),
    status: String(row.status || 'AVAILABLE') as EquipmentStatus,
    verificationBy: String(row.verification_by || ''),
    equipmentName: String(row.equipment_name || ''),
    equipmentType: String(row.equipment_type || ''),
    quantityAvailable: Number(row.quantity_available ?? 0),
  };
}

function dbRowToInventory(row: Record<string, unknown>): ComponentType {
  return {
    name: String(row.name || ''),
    totalUnits: Number(row.total_units || 0),
    unitsOut: Number(row.units_out || 0),
    unitsOnShelf: Number(row.units_on_shelf || 0),
  };
}

function dbRowToHistory(row: Record<string, unknown>): HistoryEntry {
  return {
    equipmentCode: String(row.equipment_code || ''),
    componentType: String(row.component_type || ''),
    studentName: String(row.student_name || ''),
    studentEmail: String(row.student_email || ''),
    borrowDate: String(row.borrow_date || ''),
    returnDueTime: String(row.return_due_time || ''),
    borrowTimestamp: String(row.borrow_timestamp || ''),
    status: String(row.status || 'ACTIVE') as HistoryEntry['status'],
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
    setLoading(true);

    const [appsRes, equipRes, invRes, blackRes, histRes] = await Promise.all([
      supabase.from('applications').select('*').order('submitted_at', { ascending: true }),
      supabase.from('equipment_rows').select('*').order('no', { ascending: true }),
      supabase.from('component_inventory').select('*').order('name', { ascending: true }),
      supabase.from('blacklisted_emails').select('email'),
      supabase.from('transaction_history').select('*').order('borrow_timestamp', { ascending: true }),
    ]);

    if (appsRes.error) console.error('Failed to fetch applications:', appsRes.error);
    if (equipRes.error) console.error('Failed to fetch equipment rows:', equipRes.error);
    if (invRes.error) console.error('Failed to fetch component inventory:', invRes.error);
    if (blackRes.error) console.error('Failed to fetch blacklist:', blackRes.error);
    if (histRes.error) console.error('Failed to fetch transaction history:', histRes.error);

    if (appsRes.data) setApplicationQueue(appsRes.data.map(dbRowToApplication));
    if (equipRes.data) setEquipmentRows(equipRes.data.map(dbRowToEquipment));
    if (invRes.data) setComponentInventory(invRes.data.map(dbRowToInventory));

    if (blackRes.data) {
      setBlacklistedEmails(
        blackRes.data.map((r: Record<string, unknown>) =>
          String(r.email || '').toLowerCase().trim()
        )
      );
    }

    if (histRes.data) setTransactionHistory(histRes.data.map(dbRowToHistory));

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    const channel = supabase
      .channel('lab-inventory-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, fetchAllData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipment_rows' }, fetchAllData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'component_inventory' }, fetchAllData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blacklisted_emails' }, fetchAllData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transaction_history' }, fetchAllData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAllData]);

  const updateEquipmentStatus = useCallback((code: string, newStatus: EquipmentStatus) => {
    supabase
      .from('equipment_rows')
      .update({
        status: newStatus,
        quantity_available: newStatus === 'AVAILABLE' ? 1 : 0,
      })
      .eq('code', code)
      .then(({ error }) => {
        if (error) {
          console.error('Update equipment status failed:', error);
          alert(`Update equipment failed: ${error.message}`);
        }
      });
  }, []);

  const toggleBlacklistUser = useCallback(
    (email: string) => {
      const targetEmail = email.toLowerCase().trim();

      if (blacklistedEmails.includes(targetEmail)) {
        supabase.from('blacklisted_emails').delete().eq('email', targetEmail).then(({ error }) => {
          if (error) alert(`Remove blacklist failed: ${error.message}`);
        });
      } else {
        supabase.from('blacklisted_emails').upsert({ email: targetEmail }).then(({ error }) => {
          if (error) alert(`Blacklist failed: ${error.message}`);
        });
      }
    },
    [blacklistedEmails]
  );

  const submitApplication = useCallback(
    async (
      formData: BorrowFormData,
      equipmentCode: string,
      photoAttachment?: string
    ): Promise<boolean> => {
      const studentEmail = formData.emailAddress.toLowerCase().trim();
      const requestedEquipmentName = getEquipmentName(equipmentCode);
      const requestedEquipmentType = getEquipmentTypeKey(equipmentCode);

      if (blacklistedEmails.includes(studentEmail)) {
        alert('This student account has been banned from borrowing equipment.');
        return false;
      }

      const row: Record<string, unknown> = {
        student_email: studentEmail,
        student_name: formData.fullName,
        student_phone: formData.phoneNumber,
        student_year_course: formData.yearCourse,
        equipment_code: equipmentCode,
        equipment_name: requestedEquipmentName,
        equipment_type: requestedEquipmentType,
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
        is_blacklisted: false,
        is_approved: false,
        is_returned: false,
        is_return_verified: false,
      };

      const { error } = await supabase.from('applications').insert(row);

      if (error) {
        console.error('Submit application failed:', error);
        alert(`Submit failed: ${error.message}`);
        return false;
      }

      await fetchAllData();
      return true;
    },
    [blacklistedEmails, fetchAllData]
  );

  const approveApplication = useCallback(
    async (appId: string) => {
      const { data: rpcResult, error: rpcError } = await supabase.rpc(
        'approve_application_with_redirect',
        { p_app_id: appId }
      );

      if (!rpcError && rpcResult) {
        const result = rpcResult as {
          success?: boolean;
          waiting_list?: boolean;
          message?: string;
          old_code?: string;
          new_code?: string;
          note?: string;
        };

        if (result.waiting_list) {
          alert(result.message || 'No alternative equipment available. Application placed in waiting list.');
        } else if (result.note) {
          alert(result.note);
        }

        await fetchAllData();
        return;
      }

      console.warn('RPC approve_application_with_redirect unavailable, using frontend fallback:', rpcError);

      const now = new Date().toISOString();

      const { data: target, error: targetError } = await supabase
        .from('applications')
        .select('*')
        .eq('id', appId)
        .single();

      if (targetError || !target) {
        console.error('Application not found:', targetError);
        alert(`Application not found: ${targetError?.message || 'Unknown error'}`);
        return;
      }

      const requestedCode = String(target.original_equipment_code || target.equipment_code || '');
      const requestedTypeKey = String(target.equipment_type || getEquipmentTypeKey(requestedCode));
      const equipmentName = String(target.equipment_name || getEquipmentName(requestedCode));

      const { data: equipmentList, error: equipmentError } = await supabase
        .from('equipment_rows')
        .select('*')
        .order('no', { ascending: true });

      if (equipmentError || !equipmentList) {
        console.error('Unable to check equipment availability:', equipmentError);
        alert(`Unable to check equipment availability: ${equipmentError?.message || 'Unknown error'}`);
        return;
      }

      const requestedEquipment = equipmentList.find(
        (item: Record<string, unknown>) => String(item.code) === requestedCode
      );

      let finalEquipmentCode = requestedCode;
      let autoRedirectNote: string | null = null;

      if (!requestedEquipment || requestedEquipment.status !== 'AVAILABLE') {
        const alternativeEquipment = equipmentList.find((item: Record<string, unknown>) => {
          const code = String(item.code || '');
          const status = String(item.status || '');
          const type = String(item.equipment_type || getEquipmentTypeKey(code));
          const name = String(item.equipment_name || getEquipmentName(code));

          return (
            code !== requestedCode &&
            status === 'AVAILABLE' &&
            (type === requestedTypeKey || name === equipmentName)
          );
        });

        if (!alternativeEquipment) {
          const waitingMessage = 'No alternative equipment available. Application placed in waiting list.';

          const { error: waitError } = await supabase
            .from('applications')
            .update({
              status: 'WAITING_LIST',
              stage: 'WAITING_LIST',
              waiting_list_reason: waitingMessage,
            })
            .eq('id', appId);

          if (waitError) {
            console.error('Waiting list update failed:', waitError);
            alert(`Waiting list update failed: ${waitError.message}`);
            return;
          }

          alert(waitingMessage);
          await fetchAllData();
          return;
        }

        finalEquipmentCode = String(alternativeEquipment.code || '');
        autoRedirectNote = `Auto-redirected from ${requestedCode} to ${finalEquipmentCode} because original equipment was unavailable.`;
      }

      const { data: activeBorrowSameCode } = await supabase
        .from('applications')
        .select('id')
        .neq('id', appId)
        .eq('equipment_code', finalEquipmentCode)
        .eq('stage', 'ACTIVE_BORROW');

      if (activeBorrowSameCode && activeBorrowSameCode.length > 0) {
        alert('This equipment has just been borrowed. Please approve again to auto-redirect.');
        return;
      }

      const { data: invItem } = await supabase
        .from('component_inventory')
        .select('*')
        .eq('name', equipmentName)
        .maybeSingle();

      const unitsOut = Number(invItem?.units_out ?? 0);
      const unitsOnShelf = Number(invItem?.units_on_shelf ?? 0);

      const updateApplicationData: Record<string, unknown> = {
        equipment_code: finalEquipmentCode,
        equipment_name: getEquipmentName(finalEquipmentCode),
        equipment_type: getEquipmentTypeKey(finalEquipmentCode),
        original_equipment_code: requestedCode,
        final_equipment_code: finalEquipmentCode,
        auto_redirect_note: autoRedirectNote,
        waiting_list_reason: null,
        status: 'APPROVED',
        stage: 'ACTIVE_BORROW',
        is_approved: true,
        approved_at: now,
        processed_at: now,
      };

      const { error: approveError } = await supabase
        .from('applications')
        .update(updateApplicationData)
        .eq('id', appId);

      if (approveError) {
        console.error('Approve application failed:', approveError);
        alert(`Approve failed: ${approveError.message}`);
        return;
      }

      const updates = [
        supabase
          .from('equipment_rows')
          .update({
            status: 'BORROWED',
            quantity_available: 0,
          })
          .eq('code', finalEquipmentCode),
      ];

      if (invItem) {
        updates.push(
          supabase
            .from('component_inventory')
            .update({
              units_out: unitsOut + 1,
              units_on_shelf: Math.max(0, unitsOnShelf - 1),
            })
            .eq('name', equipmentName)
        );
      }

      const updateResults = await Promise.all(updates);
      const failedUpdate = updateResults.find((result) => result.error);

      if (failedUpdate?.error) {
        console.error('Post-approve update failed:', failedUpdate.error);
        alert(`Post-approve update failed: ${failedUpdate.error.message}`);
        return;
      }

      if (autoRedirectNote) alert(autoRedirectNote);

      await fetchAllData();
    },
    [fetchAllData]
  );

  const rejectApplication = useCallback(
    async (appId: string) => {
      const { error } = await supabase
        .from('applications')
        .update({
          status: 'REJECTED',
          stage: 'HISTORICAL',
          processed_at: new Date().toISOString(),
        })
        .eq('id', appId);

      if (error) {
        console.error('Reject application failed:', error);
        alert(`Reject failed: ${error.message}`);
        return;
      }

      await fetchAllData();
    },
    [fetchAllData]
  );

  const banApplication = useCallback(
    async (appId: string) => {
      const { data: target, error: targetError } = await supabase
        .from('applications')
        .select('student_email')
        .eq('id', appId)
        .single();

      if (targetError || !target) {
        console.error('Ban application failed:', targetError);
        alert(`Ban failed: ${targetError?.message || 'Application not found'}`);
        return;
      }

      const studentEmail = String(target.student_email || '').toLowerCase().trim();

      const [appUpdate, blacklistUpdate] = await Promise.all([
        supabase
          .from('applications')
          .update({
            status: 'BANNED',
            stage: 'BANNED',
            is_blacklisted: true,
            processed_at: new Date().toISOString(),
          })
          .eq('id', appId),
        supabase.from('blacklisted_emails').upsert({ email: studentEmail }),
      ]);

      if (appUpdate.error || blacklistUpdate.error) {
        const message = appUpdate.error?.message || blacklistUpdate.error?.message || 'Unknown error';
        alert(`Ban failed: ${message}`);
        return;
      }

      await fetchAllData();
    },
    [fetchAllData]
  );

  const submitReturnRequest = useCallback(
    async (appId: string, returnData: ReturnDetailsData) => {
      const { data: target, error: targetError } = await supabase
        .from('applications')
        .select('equipment_code')
        .eq('id', appId)
        .single();

      if (targetError || !target) {
        alert(`Return request failed: ${targetError?.message || 'Application not found'}`);
        return;
      }

      const equipmentCode = String(target.equipment_code || '');

      const [appUpdate, equipmentUpdate] = await Promise.all([
        supabase
          .from('applications')
          .update({
            is_returned: true,
            stage: 'RETURN_PENDING',
            return_date_returned: returnData.dateReturned,
            return_overseeing_staff: returnData.overseeingStaff,
            return_equipment_image: returnData.equipmentImage,
            return_submitted_at: new Date().toISOString(),
          })
          .eq('id', appId),
        supabase
          .from('equipment_rows')
          .update({ status: 'RETURN_PENDING' })
          .eq('code', equipmentCode),
      ]);

      if (appUpdate.error || equipmentUpdate.error) {
        const message = appUpdate.error?.message || equipmentUpdate.error?.message || 'Unknown error';
        alert(`Return request failed: ${message}`);
        return;
      }

      await fetchAllData();
    },
    [fetchAllData]
  );

  const approveReturnRequest = useCallback(
    async (appId: string) => {
      const { data: target, error: targetError } = await supabase
        .from('applications')
        .select('*')
        .eq('id', appId)
        .single();

      if (targetError || !target) {
        alert(`Approve return failed: ${targetError?.message || 'Application not found'}`);
        return;
      }

      const equipmentCode = String(target.equipment_code || '');
      const equipmentName = String(target.equipment_name || getEquipmentName(equipmentCode));

      const { data: invItem } = await supabase
        .from('component_inventory')
        .select('*')
        .eq('name', equipmentName)
        .maybeSingle();

      const updates = [
        supabase
          .from('applications')
          .update({
            status: 'RETURNED',
            stage: 'HISTORICAL',
            is_return_verified: true,
            processed_at: new Date().toISOString(),
            return_verified_at: new Date().toISOString(),
          })
          .eq('id', appId),
        supabase
          .from('equipment_rows')
          .update({
            status: 'AVAILABLE',
            quantity_available: 1,
            last_date_used:
              target.return_date_returned || new Date().toISOString().split('T')[0],
          })
          .eq('code', equipmentCode),
        supabase.from('transaction_history').insert({
          equipment_code: equipmentCode,
          component_type: equipmentName,
          student_name: target.student_name,
          student_email: target.student_email,
          borrow_date: target.borrow_date,
          return_due_time: target.return_target,
          borrow_timestamp: target.approved_at || new Date().toISOString(),
          status: 'RETURNED',
          returned_date:
            target.return_date_returned || new Date().toISOString().split('T')[0],
        }),
      ];

      if (invItem) {
        updates.push(
          supabase
            .from('component_inventory')
            .update({
              units_out: Math.max(0, Number(invItem.units_out ?? 1) - 1),
              units_on_shelf: Number(invItem.units_on_shelf ?? 0) + 1,
            })
            .eq('name', equipmentName)
        );
      }

      const results = await Promise.all(updates);
      const failedUpdate = results.find((result) => result.error);

      if (failedUpdate?.error) {
        alert(`Approve return failed: ${failedUpdate.error.message}`);
        return;
      }

      await fetchAllData();
    },
    [fetchAllData]
  );

  const getLastSubmittedForm = useCallback(() => {
    if (applicationQueue.length === 0) return null;
    return applicationQueue[applicationQueue.length - 1].formData;
  }, [applicationQueue]);

  const resetUserPassword = useCallback((email: string, newPassword: string): boolean => {
    return updateUserPasswordInRegistry(email, newPassword);
  }, []);

  const incomingVerificationQueue = useMemo(
    () =>
      applicationQueue.filter(
        (app) =>
          app.stage === 'PENDING' ||
          app.stage === 'RETURN_PENDING' ||
          app.stage === 'WAITING_LIST'
      ),
    [applicationQueue]
  );

  const processedApplicationsLog = useMemo(
    () => applicationQueue.filter((app) => app.stage === 'ACTIVE_BORROW'),
    [applicationQueue]
  );

  const historicalLedger = useMemo(
    () =>
      applicationQueue.filter(
        (app) => app.stage === 'HISTORICAL' || app.stage === 'BANNED'
      ),
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