import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';

import { type BorrowFormData } from './components/BorrowFormModal';
import { updateUserPasswordInRegistry } from './auth';

/*
 * ============================================================
 * UTM FKE Lab Inventory — Global Application State
 * Strict 3-Stage Lifecycle Pipeline Model
 * ============================================================
 */

export type EquipmentStatus = 'AVAILABLE' | 'PENDING PICKUP' | 'BORROWED' | 'RETURN_PENDING' | 'BROKEN' | 'CALIBRATING';

export type AppStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'RETURNED';

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
  stage: 'PENDING' | 'ACTIVE_BORROW' | 'HISTORICAL' | 'RETURN_PENDING';
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
  updateEquipmentStatus: (code: string, newStatus: EquipmentStatus) => void;
  submitApplication: (formData: BorrowFormData, equipmentCode: string, photoAttachment?: string) => boolean;
  approveApplication: (appId: string) => void;
  rejectApplication: (appId: string) => void;
  submitReturnRequest: (appId: string, returnData: ReturnDetailsData) => void;
  approveReturnRequest: (appId: string) => void;
  toggleBlacklistUser: (email: string) => void;
  getLastSubmittedForm: () => BorrowFormData | null;
  resetUserPassword: (email: string, newPassword: string) => boolean;
}

const AppContext = createContext<AppState | null>(null);

const initialEquipment: OscilloscopeRow[] = [
  { no: 1, code: 'AGT567', lastDateUsed: '2026-05-10', labLocation: 'P04 LEVEL 3', status: 'AVAILABLE', verificationBy: 'RAZALI AHMAD' },
  { no: 2, code: 'AGT568', lastDateUsed: '2026-05-09', labLocation: 'P04 LEVEL 3', status: 'AVAILABLE', verificationBy: 'RAZALI AHMAD' },
  { no: 3, code: 'AGT569', lastDateUsed: '2026-05-08', labLocation: 'P03 LEVEL 2', status: 'BORROWED', verificationBy: 'NORHAYATI IDRIS' },
  { no: 4, code: 'AGT570', lastDateUsed: '2026-05-11', labLocation: 'P04 LEVEL 3', status: 'PENDING PICKUP', verificationBy: 'RAZALI AHMAD' },
  { no: 5, code: 'AGT571', lastDateUsed: '2026-05-07', labLocation: 'P03 LEVEL 2', status: 'AVAILABLE', verificationBy: 'NORHAYATI IDRIS' },
  { no: 6, code: 'AGT572', lastDateUsed: '2026-05-06', labLocation: 'P05 LEVEL 1', status: 'AVAILABLE', verificationBy: 'KAMARUZAMAN YUSOF' },
  { no: 7, code: 'AGT573', lastDateUsed: '2026-05-05', labLocation: 'P05 LEVEL 1', status: 'RETURN_PENDING', verificationBy: 'KAMARUZAMAN YUSOF' },
  { no: 8, code: 'AGT574', lastDateUsed: '2026-05-12', labLocation: 'P04 LEVEL 3', status: 'AVAILABLE', verificationBy: 'RAZALI AHMAD' },
];

const initialHistory: HistoryEntry[] = [
  {
    equipmentCode: 'AGT566',
    componentType: 'Digital Oscilloscope',
    studentName: 'NAQIYAH BINTI AHMAD',
    studentEmail: 'naqiyah@graduate.utm.my',
    borrowDate: '2026-04-15',
    returnDueTime: '16:00',
    borrowTimestamp: '2026-04-15T08:30:00Z',
    status: 'RETURNED',
    returnedDate: '2026-04-15'
  },
  {
    equipmentCode: 'ARD-01',
    componentType: 'Arduino Uno',
    studentName: 'AMIRUL BIN MOHD',
    studentEmail: 'amirul@graduate.utm.my',
    borrowDate: '2026-05-01',
    returnDueTime: '16:00',
    borrowTimestamp: '2026-05-01T09:15:00Z',
    status: 'RETURNED',
    returnedDate: '2026-05-02'
  }
];

const initialApplicationQueue: Application[] = [
  {
    id: 'APP-1704067200000-5432',
    formData: {
      fullName: 'DIVYA A/P RAMAN',
      yearCourse: '1/SKEEH',
      duration: '3 hours',
      returnTime: '17:00',
      dateBorrow: '2026-06-03',
      phoneNumber: '0187654321',
      emailAddress: 'divya@graduate.utm.my',
    },
    equipmentCode: 'AGT570',
    submittedAt: '2026-06-03T09:30:00Z',
    isBlacklisted: false,
    status: 'PENDING',
    stage: 'PENDING',
    isApproved: false,
    isReturned: false,
    isReturnVerified: false,
  },
  {
    id: 'APP-1704067200000-2189',
    formData: {
      fullName: 'AMIRUL BIN MOHD',
      yearCourse: '2/SKEEH',
      duration: '2 hours',
      returnTime: '16:00',
      dateBorrow: '2026-06-02',
      phoneNumber: '0176543210',
      emailAddress: 'amirul@graduate.utm.my',
    },
    equipmentCode: 'AGT569',
    submittedAt: '2026-06-02T10:15:00Z',
    isBlacklisted: false,
    status: 'APPROVED',
    stage: 'ACTIVE_BORROW',
    isApproved: true,
    isReturned: false,
    isReturnVerified: false,
    approvedAt: '2026-06-02T10:45:00Z',
    processedAt: '2026-06-02T10:45:00Z',
  },
  {
    id: 'APP-1704067200000-7654',
    formData: {
      fullName: 'FARHANA BINTI ZULKIFLI',
      yearCourse: '4/SKELH',
      duration: '1.5 hours',
      returnTime: '15:30',
      dateBorrow: '2026-06-01',
      phoneNumber: '0195555555',
      emailAddress: 'farhana@graduate.utm.my',
    },
    equipmentCode: 'AGT573',
    submittedAt: '2026-06-01T11:00:00Z',
    isBlacklisted: false,
    status: 'PENDING',
    stage: 'RETURN_PENDING',
    isApproved: true,
    isReturned: true,
    isReturnVerified: false,
    approvedAt: '2026-06-01T11:30:00Z',
    returnSubmittedAt: '2026-06-03T14:20:00Z',
    returnDetails: {
      dateReturned: '2026-06-03',
      overseeingStaff: 'RAZALI AHMAD',
      equipmentImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    },
    processedAt: '2026-06-01T11:30:00Z',
  },
  {
    id: 'APP-1704067200000-9876',
    formData: {
      fullName: 'NAQIYAH BINTI AHMAD',
      yearCourse: '3/SKELH',
      duration: '2 hours',
      returnTime: '16:00',
      dateBorrow: '2026-05-29',
      phoneNumber: '0198765432',
      emailAddress: 'naqiyah@graduate.utm.my',
    },
    equipmentCode: 'AGT567',
    submittedAt: '2026-05-29T08:00:00Z',
    isBlacklisted: false,
    status: 'RETURNED',
    stage: 'HISTORICAL',
    isApproved: true,
    isReturned: true,
    isReturnVerified: true,
    approvedAt: '2026-05-29T08:30:00Z',
    returnSubmittedAt: '2026-05-30T13:45:00Z',
    returnVerifiedAt: '2026-05-30T14:15:00Z',
    returnDetails: {
      dateReturned: '2026-05-30',
      overseeingStaff: 'AMINAH SULAIMAN',
      equipmentImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    },
    processedAt: '2026-05-29T08:30:00Z',
  },
];

const initialInventory: ComponentType[] = [
  { name: 'Digital Oscilloscope', totalUnits: 8, unitsOut: 2, unitsOnShelf: 6 },
  { name: 'Arduino Uno', totalUnits: 12, unitsOut: 3, unitsOnShelf: 9 },
  { name: 'ESP32 Microcontroller', totalUnits: 10, unitsOut: 1, unitsOnShelf: 9 },
  { name: 'Ultrasonic Sensor', totalUnits: 20, unitsOut: 4, unitsOnShelf: 16 },
  { name: 'Digital Multimeter', totalUnits: 15, unitsOut: 2, unitsOnShelf: 13 },
];

export function AppProvider({ children }: { children: ReactNode }) {
  // ===================================================================
  // FIX: LAZY REHYDRATION STATE INITIALIZERS (Eliminates overwrite race condition)
  // ===================================================================
  const [equipmentRows, setEquipmentRows] = useState<OscilloscopeRow[]>(() => {
    const saved = localStorage.getItem('utm_equipment_rows');
    return saved ? JSON.parse(saved) : initialEquipment;
  });

  const [applicationQueue, setApplicationQueue] = useState<Application[]>(() => {
    const savedVersion = localStorage.getItem('utm_data_version');
    const currentVersion = '3-stage-v2';
    if (savedVersion !== currentVersion) {
      localStorage.removeItem('utm_application_queue');
      localStorage.setItem('utm_data_version', currentVersion);
    }
    const saved = localStorage.getItem('utm_application_queue');
    const parsed = saved ? JSON.parse(saved) : [];
    return parsed.length > 0 ? parsed : initialApplicationQueue;
  });

  const [blacklistedEmails, setBlacklistedEmails] = useState<string[]>(() => {
    const saved = localStorage.getItem('utm_blacklisted_emails');
    return saved ? JSON.parse(saved) : ['badstudent@utm.my'];
  });

  const [transactionHistory, setTransactionHistory] = useState<HistoryEntry[]>(() => {
    const saved = localStorage.getItem('utm_transaction_history');
    return saved ? JSON.parse(saved) : initialHistory;
  });

  const [componentInventory, setComponentInventory] = useState<ComponentType[]>(() => {
    const saved = localStorage.getItem('utm_component_inventory');
    return saved ? JSON.parse(saved) : initialInventory;
  });

  // ===================================================================
  // COMPACT LIFECYCLE SYNCERS (Saves changes automatically into Storage logs)
  // ===================================================================
  useEffect(() => {
    localStorage.setItem('utm_equipment_rows', JSON.stringify(equipmentRows));
  }, [equipmentRows]);

  useEffect(() => {
    localStorage.setItem('utm_application_queue', JSON.stringify(applicationQueue));
  }, [applicationQueue]);

  useEffect(() => {
    localStorage.setItem('utm_blacklisted_emails', JSON.stringify(blacklistedEmails));
  }, [blacklistedEmails]);

  useEffect(() => {
    localStorage.setItem('utm_transaction_history', JSON.stringify(transactionHistory));
  }, [transactionHistory]);

  useEffect(() => {
    localStorage.setItem('utm_component_inventory', JSON.stringify(componentInventory));
  }, [componentInventory]);

  // ===================================================================
  // LIFE TRANSITION DISPATCHERS
  // ===================================================================
  const updateEquipmentStatus = useCallback((code: string, newStatus: EquipmentStatus) => {
    setEquipmentRows((prev) =>
      prev.map((row) => (row.code === code ? { ...row, status: newStatus } : row))
    );
  }, []);

  const toggleBlacklistUser = useCallback((email: string) => {
    setBlacklistedEmails((prev) => {
      const targetEmail = email.toLowerCase().trim();
      const updatedList = prev.includes(targetEmail) ? prev.filter((e) => e !== targetEmail) : [...prev, targetEmail];
      
      setApplicationQueue((prevApps) =>
        prevApps.map((app) => 
          app.formData?.emailAddress?.toLowerCase().trim() === targetEmail
            ? { ...app, isBlacklisted: updatedList.includes(targetEmail) }
            : app
        )
      );
      return updatedList;
    });
  }, []);

  const submitApplication = useCallback((formData: BorrowFormData, equipmentCode: string, photoAttachment?: string) => {
    const studentEmail = formData.emailAddress.toLowerCase().trim();
    let isBlacklisted = blacklistedEmails.includes(studentEmail);
    const todayStr = new Date().toISOString().split('T')[0];

    const hasOverdueItem = applicationQueue.some(
      (app) =>
        app.formData?.emailAddress?.toLowerCase().trim() === studentEmail &&
        app.isApproved &&
        !app.isReturned &&
        app.formData?.dateBorrow < todayStr
    );

    if (hasOverdueItem) {
      isBlacklisted = true;
      if (!blacklistedEmails.includes(studentEmail)) {
        setBlacklistedEmails((prev) => [...prev, studentEmail]);
      }
    }

    const app: Application = {
      id: crypto.randomUUID(),
      formData,
      equipmentCode,
      submittedAt: new Date().toISOString(),
      isBlacklisted,
      status: 'PENDING',
      photoAttachment,
      stage: 'PENDING',
      isApproved: false,
      isReturned: false,
      isReturnVerified: false,
    };

    try {
      setApplicationQueue((prev) => [...prev, app]);
      return true;
    } catch {
      return false;
    }
  }, [blacklistedEmails, applicationQueue]);

  const approveApplication = useCallback((appId: string) => {
    setApplicationQueue((prevQueue) => {
      const target = prevQueue.find((a) => a.id === appId);
      if (!target) return prevQueue;

      // Stock availability check: count how many units of this equipment code are already borrowed
      const equipmentCode = target.equipmentCode;
      const activeBorrowsForCode = prevQueue.filter(
        (a) => a.equipmentCode === equipmentCode && a.stage === 'ACTIVE_BORROW'
      ).length;

      // Each equipment code represents a single physical unit
      // If already borrowed by someone else, deny approval
      const isAlreadyBorrowed = activeBorrowsForCode > 0;

      if (isAlreadyBorrowed) {
        // Mark as rejected due to insufficient stock instead of approving
        return prevQueue.map((a) =>
          a.id === appId
            ? { ...a, status: 'REJECTED' as const, stage: 'PENDING' as const }
            : a
        );
      }

      // Check component inventory for the matching equipment type
      const equipmentName = equipmentCode.startsWith('AGT') ? 'Digital Oscilloscope'
        : equipmentCode.startsWith('ARD') ? 'Arduino Uno'
        : equipmentCode.startsWith('ESP') ? 'ESP32 Microcontroller'
        : equipmentCode.startsWith('MXW') ? 'Regulated DC Power Supply'
        : 'Digital Oscilloscope';

      setComponentInventory((prevInv) => {
        const item = prevInv.find((i) => i.name === equipmentName);
        if (item && item.unitsOnShelf <= 0) {
          // Insufficient stock — signal rejection
          return prevInv;
        }
        return prevInv.map((i) =>
          i.name === equipmentName
            ? { ...i, unitsOut: i.unitsOut + 1, unitsOnShelf: Math.max(0, i.unitsOnShelf - 1) }
            : i
        );
      });

      setEquipmentRows((prevRows) =>
        prevRows.map((row) => row.code === equipmentCode ? { ...row, status: 'BORROWED' as const } : row)
      );

      return prevQueue.map((a) =>
        a.id === appId
          ? {
              ...a,
              status: 'APPROVED' as const,
              stage: 'ACTIVE_BORROW' as const,
              isApproved: true,
              approvedAt: new Date().toISOString(),
              processedAt: new Date().toISOString(),
            }
          : a
      );
    });
  }, []);

  const rejectApplication = useCallback((appId: string) => {
    setApplicationQueue((prevQueue) => {
      const target = prevQueue.find((a) => a.id === appId);
      if (target) {
        // Only revert equipment status if no other pending/approved applications use this code
        const otherActiveForCode = prevQueue.filter(
          (a) => a.id !== appId && a.equipmentCode === target.equipmentCode &&
            (a.stage === 'PENDING' || a.stage === 'ACTIVE_BORROW')
        );
        if (otherActiveForCode.length === 0) {
          setEquipmentRows((prevRows) =>
            prevRows.map((row) => row.code === target.equipmentCode ? { ...row, status: 'AVAILABLE' as const } : row)
          );
        }
      }
      return prevQueue.filter((a) => a.id !== appId);
    });
  }, []);

  const submitReturnRequest = useCallback((appId: string, returnDetails: ReturnDetailsData) => {
    setApplicationQueue((prevQueue) => {
      const target = prevQueue.find((a) => a.id === appId);
      if (target) {
        setEquipmentRows((prevRows) =>
          prevRows.map((row) => row.code === target.equipmentCode ? { ...row, status: 'RETURN_PENDING' } : row)
        );
      }
      return prevQueue.map((a) =>
        a.id === appId
          ? {
              ...a,
              isReturned: true,
              stage: 'RETURN_PENDING' as const,
              returnDetails,
              returnSubmittedAt: new Date().toISOString(),
            }
          : a
      );
    });
  }, []);

  const approveReturnRequest = useCallback((appId: string) => {
    setApplicationQueue((prevQueue) => {
      const target = prevQueue.find((a) => a.id === appId);

      if (target) {
        setEquipmentRows((prevRows) =>
          prevRows.map((row) =>
            row.code === target.equipmentCode
              ? { ...row, status: 'AVAILABLE' as const, lastDateUsed: target.returnDetails?.dateReturned || new Date().toISOString().split('T')[0] }
              : row
          )
        );

        const equipmentName = target.equipmentCode.startsWith('AGT') ? 'Digital Oscilloscope'
          : target.equipmentCode.startsWith('ARD') ? 'Arduino Uno'
          : target.equipmentCode.startsWith('ESP') ? 'ESP32 Microcontroller'
          : target.equipmentCode.startsWith('MXW') ? 'Regulated DC Power Supply'
          : 'Digital Oscilloscope';

        setComponentInventory((prevInv) =>
          prevInv.map((item) =>
            item.name === equipmentName
              ? { ...item, unitsOut: Math.max(0, item.unitsOut - 1), unitsOnShelf: item.unitsOnShelf + 1 }
              : item
          )
        );

        setTransactionHistory((prevHist) => [
          ...prevHist,
          {
            equipmentCode: target.equipmentCode || 'UNKNOWN',
            componentType: equipmentName,
            studentName: target.formData?.fullName || 'UNKNOWN STUDENT',
            studentEmail: target.formData?.emailAddress || 'unknown@utm.my',
            borrowDate: target.formData?.dateBorrow || new Date().toISOString().split('T')[0],
            returnDueTime: target.formData?.returnTime || '16:00',
            borrowTimestamp: target.approvedAt || new Date().toISOString(),
            status: 'RETURNED',
            returnedDate: target.returnDetails?.dateReturned || new Date().toISOString().split('T')[0],
          }
        ]);
      }

      return prevQueue.map((a) =>
        a.id === appId
          ? {
              ...a,
              status: 'RETURNED' as const,
              stage: 'HISTORICAL' as const,
              isReturnVerified: true,
              processedAt: new Date().toISOString(),
              returnVerifiedAt: new Date().toISOString(),
            }
          : a
      );
    });
  }, []);

  const getLastSubmittedForm = useCallback(() => {
    if (applicationQueue.length === 0) return null;
    return applicationQueue[applicationQueue.length - 1].formData;
  }, [applicationQueue]);

  const resetUserPassword = useCallback((email: string, newPassword: string): boolean => {
    return updateUserPasswordInRegistry(email, newPassword);
  }, []);

  // Pure 3-Stage Pipeline Selectors
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
        updateEquipmentStatus,
        submitApplication,
        approveApplication,
        rejectApplication,
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