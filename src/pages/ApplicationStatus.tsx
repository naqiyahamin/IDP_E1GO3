import { useState, useMemo, useEffect } from 'react';
import {
  Clock,
  ShieldCheck,
  UserX,
  CheckCircle,
  UploadCloud,
  Ban,
  Undo2,
  Table,
  AlertTriangle,
  PackageCheck,
  Wrench,
  Phone,
  XCircle,
} from 'lucide-react';
import emailjs from '@emailjs/browser';
import { useAppState } from '../context';
import type { UserRole } from '../auth';

interface ApplicationStatusProps {
  userRole: UserRole;
  currentUserEmail?: string;
}

export default function ApplicationStatus({
  userRole,
  currentUserEmail = '',
}: ApplicationStatusProps) {
  const {
    incomingVerificationQueue: rawQueue,
    processedApplicationsLog: rawLog,
    historicalLedger: rawLedger,
    equipmentRows,
    componentInventory,
    approveApplication,
    rejectApplication,
    banApplication,
    blacklistedEmails,
    toggleBlacklistUser,
    submitReturnRequest,
    approveReturnRequest,
  } = useAppState();

  const [checkEmail, setCheckEmail] = useState('');
  const [checkerResult, setCheckerResult] = useState<{
    searched: boolean;
    status: 'CLEAR' | 'BLACKLISTED' | null;
  }>({
    searched: false,
    status: null,
  });

  const [activeReturnAppId, setActiveReturnAppId] = useState<string | null>(null);
  const [returnForm, setReturnForm] = useState({
    dateReturned: new Date().toISOString().split('T')[0],
    overseeingStaff: '',
    equipmentImage: '',
  });
  const [returnError, setReturnError] = useState('');

  const [copiedAppId, setCopiedAppId] = useState<string | null>(null);
  const [smsNotificationPayload, setSmsNotificationPayload] = useState<{
    isOpen: boolean;
    studentName: string;
    phone: string;
    message: string;
  } | null>(null);
  const [insufficientStockAppId, setInsufficientStockAppId] = useState<string | null>(null);
  const [banConfirmAppId, setBanConfirmAppId] = useState<string | null>(null);
  const [banToast, setBanToast] = useState<string | null>(null);

  const cleanUserEmail = currentUserEmail.trim().toLowerCase();
  const isStaff = userRole === 'staff' || cleanUserEmail === 'naqiyah@graduate.utm.my';

  useEffect(() => {
    if (!isStaff) return;

    const dispatchAutomatedNotifications = async () => {
      const currentSystemDate = new Date('2026-06-12');
      const targetLogSource = rawLog;

      for (const app of targetLogSource) {
        const isReturnSubmitted = app.isReturned && !!app.returnDetails;
        const targetReturnDate = new Date(app.formData.dateBorrow);

        if (
          !isReturnSubmitted &&
          !isNaN(targetReturnDate.getTime()) &&
          targetReturnDate < currentSystemDate
        ) {
          try {
            await emailjs.send(
              'service_53rcbha',
              'YOUR_TEMPLATE_ID_HERE',
              {
                studentName: app.formData.fullName,
                equipmentCode: app.equipmentCode,
                to_email: app.formData.emailAddress,
              },
              'YOUR_PUBLIC_KEY_HERE'
            );
          } catch (error) {
            console.error('Automated Notification pipeline relay failure:', error);
          }
        }
      }
    };

    dispatchAutomatedNotifications();
  }, [rawLog, isStaff]);

  const incomingVerificationQueue = useMemo(() => {
    if (isStaff) return rawQueue;
    return rawQueue.filter(
      (app) => app.formData.emailAddress.trim().toLowerCase() === cleanUserEmail
    );
  }, [rawQueue, isStaff, cleanUserEmail]);

  const processedApplicationsLog = useMemo(() => {
    if (isStaff) return rawLog;
    return rawLog.filter(
      (app) => app.formData.emailAddress.trim().toLowerCase() === cleanUserEmail
    );
  }, [rawLog, isStaff, cleanUserEmail]);

  const historicalLedger = useMemo(() => {
    if (isStaff) return rawLedger;
    return rawLedger.filter(
      (app) => app.formData.emailAddress.trim().toLowerCase() === cleanUserEmail
    );
  }, [rawLedger, isStaff, cleanUserEmail]);

  const getEquipmentName = (code: string) => {
    if (code.startsWith('AGT')) return 'Digital Storage Oscilloscope (Tektronix)';
    if (code.startsWith('MXW')) return 'Regulated DC Power Supply';
    if (code.startsWith('RFE')) return 'RF Spectrum Analyzer';
    return 'Microcontroller Prototyping Trainer Kit';
  };

  const getAssetTotalCapacity = (code: string) => {
    if (code.includes('570')) return 5;
    if (code.includes('210')) return 8;
    return 4;
  };

  const inventorySpreadsheetData = useMemo(() => {
    const stats: Record<
      string,
      {
        code: string;
        name: string;
        totalBorrowedTimes: number;
        isBeingBorrowed: number;
        inPossession: number;
        overdueCount: number;
        maintenanceStatus: 'BROKEN' | 'CALIBRATING' | null;
      }
    > = {};

    const initRow = (code: string) => {
      if (!stats[code]) {
        const liveMatch = equipmentRows?.find((r) => r.code === code);
        const currentMaint =
          liveMatch?.status === 'BROKEN' || liveMatch?.status === 'CALIBRATING'
            ? liveMatch.status
            : null;

        stats[code] = {
          code,
          name: getEquipmentName(code),
          totalBorrowedTimes: 0,
          isBeingBorrowed: 0,
          inPossession: 0,
          overdueCount: 0,
          maintenanceStatus: currentMaint,
        };
      }
    };

    equipmentRows?.forEach((r) => initRow(r.code));

    incomingVerificationQueue.forEach((app) => {
      initRow(app.equipmentCode);
      stats[app.equipmentCode].isBeingBorrowed += 1;
      stats[app.equipmentCode].totalBorrowedTimes += 1;
    });

    processedApplicationsLog.forEach((app) => {
      initRow(app.equipmentCode);
      stats[app.equipmentCode].totalBorrowedTimes += 1;

      if (!(app.isReturned && app.returnDetails)) {
        stats[app.equipmentCode].inPossession += 1;
        const currentSystemDate = new Date('2026-06-12');
        const targetReturnDate = new Date(app.formData.dateBorrow);
        if (!isNaN(targetReturnDate.getTime()) && targetReturnDate < currentSystemDate) {
          stats[app.equipmentCode].overdueCount += 1;
        }
      }
    });

    historicalLedger.forEach((app) => {
      initRow(app.equipmentCode);
      stats[app.equipmentCode].totalBorrowedTimes += 1;
    });

    return Object.values(stats).sort((a, b) => a.code.localeCompare(b.code));
  }, [incomingVerificationQueue, processedApplicationsLog, historicalLedger, equipmentRows]);

  const handleApproveWithCascade = async (appId: string) => {
    try {
      const result = await approveApplication(appId);

      if (result.status === 'waiting_list') {
        alert('No alternative equipment available. Application placed in waiting list.');
        setInsufficientStockAppId(appId);
        setTimeout(() => setInsufficientStockAppId(null), 4000);
        return;
      }

      if (result.autoRedirectNote) {
        alert(result.autoRedirectNote);
      }
    } catch (error) {
      console.error('Approval failed:', error);
      setInsufficientStockAppId(appId);
      setTimeout(() => setInsufficientStockAppId(null), 4000);
    }
  };
  const handleInstantCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkEmail.trim()) return;

    const targetEmail = checkEmail.trim().toLowerCase();
    const isBad = blacklistedEmails?.includes(targetEmail) || false;
    setCheckerResult({ searched: true, status: isBad ? 'BLACKLISTED' : 'CLEAR' });
  };

  const handleToggleRestrict = () => {
    if (!checkEmail.trim()) return;
    toggleBlacklistUser(checkEmail.trim().toLowerCase());
    setCheckerResult({ searched: false, status: null });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size < 20000) {
      setReturnError('Image quality too low. Please snap a clear, high-resolution photo.');
      return;
    }

    setReturnError('');

    const reader = new FileReader();
    reader.onloadend = () => {
      setReturnForm((prev) => ({ ...prev, equipmentImage: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReturnAppId) return;

    if (!returnForm.overseeingStaff.trim()) {
      setReturnError('Please specify the lab staff overseeing your returning verification sequence.');
      return;
    }

    if (!returnForm.equipmentImage) {
      setReturnError('High quality image validation confirmation payload file is required.');
      return;
    }

    await submitReturnRequest(activeReturnAppId, returnForm);

    setActiveReturnAppId(null);
    setReturnForm({
      dateReturned: new Date().toISOString().split('T')[0],
      overseeingStaff: '',
      equipmentImage: '',
    });
    setReturnError('');
  };

  const handleCopyPhoneNumber = (appId: string, phoneNum: string) => {
    if (!phoneNum) return;

    navigator.clipboard.writeText(phoneNum).then(() => {
      setCopiedAppId(appId);
      setTimeout(() => setCopiedAppId(null), 2000);
    });
  };

  const triggerSmsSimulationModal = (
    studentName: string,
    phone: string,
    equipmentCode: string
  ) => {
    setSmsNotificationPayload({
      isOpen: true,
      studentName,
      phone,
      message: `[UTM LAB ALERT] Hi ${studentName}, your borrowed laboratory equipment (${equipmentCode}) is currently marked as OVERDUE CRITICAL. Please return it to the lab counter immediately to prevent permanent account suspension.`,
    });
  };

  return (
    <div className="space-y-6 text-xs p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Stage 1: Incoming Gatekeeper Queue
            </span>
            <div className="flex items-baseline gap-1">
              <h3 className="text-xl font-extrabold text-slate-800 leading-none">
                {incomingVerificationQueue.length}
              </h3>
              <span className="text-[10px] text-slate-500 font-medium">Applications</span>
            </div>
            <p className="text-[10px] text-amber-600 font-semibold flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" /> Awaiting
              Verification Sign-off
            </p>
          </div>
          <div className="bg-amber-50 p-2.5 rounded-lg text-base shadow-sm">â³</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Stage 2: Active Possession Ledger
            </span>
            <div className="flex items-baseline gap-1">
              <h3 className="text-xl font-extrabold text-slate-800 leading-none">
                {processedApplicationsLog.length}
              </h3>
              <span className="text-[10px] text-slate-500 font-medium">Live Sessions</span>
            </div>
            <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> In Student Use /
              Returns Review
            </p>
          </div>
          <div className="bg-emerald-50 p-2.5 rounded-lg text-base shadow-sm">ðŸ“¦</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Stage 3: Permanent Closed Archive
            </span>
            <div className="flex items-baseline gap-1">
              <h3 className="text-xl font-extrabold text-slate-800 leading-none">
                {historicalLedger.length}
              </h3>
              <span className="text-[10px] text-slate-500 font-medium">Logged Logs</span>
            </div>
            <p className="text-[10px] text-indigo-600 font-semibold flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" /> Unalterable Audited
              Database
            </p>
          </div>
          <div className="bg-indigo-50 p-2.5 rounded-lg text-base shadow-sm">ðŸ—ƒï¸</div>
        </div>
      </div>

      {isStaff && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
            <div className="flex items-center gap-2">
              <Table className="w-4 h-4 text-amber-500" />
              <div>
                <h3 className="font-bold text-xs tracking-wide">Master Equipment Log Spreadsheet</h3>
                <p className="text-[9px] text-slate-300">
                  Cross-pipeline tracking broken down by individual unit type codes.
                </p>
              </div>
            </div>
            <div className="bg-slate-800 border border-slate-700 px-3 py-1 rounded text-[10px] font-mono text-amber-400 font-bold">
              SYSTEM AUDIT TIME: 2026-06-12
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-extrabold text-[10px] tracking-wider uppercase">
                  <th className="px-4 py-3">Equipment Code</th>
                  <th className="px-4 py-3">Classification Model</th>
                  <th className="px-4 py-3 text-center bg-slate-50">Total Borrowed (Times)</th>
                  <th className="px-4 py-3 text-center text-amber-700">Is Being Borrowed (Queue)</th>
                  <th className="px-4 py-3 text-center text-blue-700">In Student Possession</th>
                  <th className="px-4 py-3 text-center bg-red-50 text-red-700">âš ï¸ Status Flags</th>
                  <th className="px-4 py-3 text-center bg-emerald-50 text-emerald-800">
                    Available Stock
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {inventorySpreadsheetData.map((row) => {
                  const totalCap = getAssetTotalCapacity(row.code);
                  const isMaintActive = row.maintenanceStatus !== null;
                  const stockRemaining = isMaintActive
                    ? 0
                    : Math.max(0, totalCap - row.inPossession);

                  return (
                    <tr key={row.code} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-2.5 font-mono font-bold text-red-800 text-xs">
                        {row.code}
                      </td>
                      <td className="px-4 py-2.5 text-slate-800 text-[11px]">{row.name}</td>
                      <td className="px-4 py-2.5 text-center font-bold bg-slate-50 text-slate-900">
                        {row.totalBorrowedTimes} x
                      </td>
                      <td className="px-4 py-2.5 text-center font-bold text-amber-600">
                        {row.isBeingBorrowed}
                      </td>
                      <td className="px-4 py-2.5 text-center font-bold text-blue-600">
                        {row.inPossession}
                      </td>
                      <td className="px-4 py-2.5 text-center text-xs">
                        {row.maintenanceStatus ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 font-bold rounded-sm text-[9px] uppercase bg-red-100 text-red-700 border border-red-200">
                            <Wrench className="w-2.5 h-2.5 animate-spin" /> {row.maintenanceStatus}
                          </span>
                        ) : row.overdueCount > 0 ? (
                          <span className="inline-flex items-center gap-0.5 font-extrabold bg-red-50 text-red-600 animate-pulse">
                            <AlertTriangle className="w-3 h-3 text-red-500" /> {row.overdueCount}{' '}
                            OVERDUE
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal text-[10px]">Normal</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center bg-emerald-50/50">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            stockRemaining > 0
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          <PackageCheck className="w-3 h-3" />{' '}
                          {isMaintActive ? 'OFFLINE' : `${stockRemaining} / ${totalCap} Available`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isStaff && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-gradient-to-r from-red-900 to-[#600018] rounded-xl p-5 text-white shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-base font-bold mb-1">
                Staff Verification & Blacklist Control Panel
              </h2>
              <p className="text-[11px] text-white/80 leading-relaxed">
                Cross-reference incoming student request parameters below. Manually restrict access
                values for non-compliant borrowers, analyze uploaded picture proofs, and process
                return checks.
              </p>
            </div>

            <div className="mt-4 bg-black/10 border border-white/10 rounded-lg p-2.5">
              <span className="font-bold block mb-1 text-[11px] text-amber-400">
                Persistent Blacklisted Registries
              </span>
              {blacklistedEmails.length === 0 ? (
                <p className="text-[10px] text-white/50 italic">
                  No students manually blacklisted yet.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {blacklistedEmails.map((email) => (
                    <span
                      key={email}
                      className="bg-white/10 border border-white/20 text-white px-2 py-0.5 rounded text-[9px] font-mono"
                    >
                      {email}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 font-bold text-gray-900 border-b border-gray-100 pb-2 mb-3 text-xs">
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                <span>Instant Background Checker & Restrictor</span>
              </div>
              <form onSubmit={handleInstantCheck} className="space-y-2">
                <input
                  type="text"
                  placeholder="Enter student email (e.g. name@graduate.utm.my)..."
                  value={checkEmail}
                  onChange={(e) => setCheckEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2 text-[11px] focus:outline-none"
                />
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="submit"
                    className="bg-red-950 text-white font-bold py-1.5 rounded-lg text-[10px]"
                  >
                    Check Clear Status
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleRestrict}
                    className="bg-gray-900 text-white font-bold py-1.5 rounded-lg text-[10px] flex items-center justify-center gap-1"
                  >
                    <Ban className="w-3 h-3" /> Toggle Restrict
                  </button>
                </div>

                {checkerResult.searched && checkerResult.status && (
                  <div
                    className={`text-[10px] font-bold rounded-lg px-2 py-1 border ${
                      checkerResult.status === 'BLACKLISTED'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {checkerResult.status}
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
          <Clock className="w-4 h-4 text-red-900" />
          <h3 className="font-bold text-gray-900 text-xs">
            Stage 1: Incoming Borrow Verification Queue ({incomingVerificationQueue.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold text-[11px]">
                <th className="px-4 py-3">STUDENT DETAILS</th>
                <th className="px-4 py-3">EQUIPMENT CODE</th>
                <th className="px-4 py-3">BORROW TIMING PARAMETERS</th>
                <th className="px-4 py-3 text-center">RISK STATUS</th>
                <th className="px-4 py-3 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {incomingVerificationQueue.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">
                    No pending applications.
                  </td>
                </tr>
              ) : (
                incomingVerificationQueue.map((app) => {
                  const details = app.formData;
                  const studentEmail = details.emailAddress.toLowerCase().trim();
                  const isFlagged = blacklistedEmails?.includes(studentEmail) || app.isBlacklisted;

                  return (
                    <tr
                      key={app.id}
                      className={`border-b border-gray-100 transition-colors ${
                        isFlagged ? 'bg-red-50/30' : 'hover:bg-gray-50/40'
                      }`}
                    >
                      <td className="px-4 py-3 space-y-0.5">
                        <div className="font-bold text-gray-900 uppercase">{details.fullName}</div>
                        <div className="text-gray-500 font-mono text-[10px]">
                          {details.emailAddress}
                        </div>
                        <div className="text-gray-400 text-[10px]">
                          {details.phoneNumber} â€¢ {details.yearCourse}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] text-gray-400 block">Original requested code</span>
                        <span className="font-mono font-bold text-red-900 text-xs block">
                          {app.originalEquipmentCode || app.equipmentCode}
                        </span>

                        {app.finalEquipmentCode &&
                          app.finalEquipmentCode !==
                            (app.originalEquipmentCode || app.equipmentCode) && (
                            <>
                              <span className="text-[10px] text-emerald-600 block mt-1">
                                Final assigned code
                              </span>
                              <span className="font-mono font-bold text-emerald-700 text-xs block">
                                {app.finalEquipmentCode}
                              </span>
                            </>
                          )}

                        {app.autoRedirectNote && (
                          <span className="text-[10px] text-amber-700 block mt-1 max-w-[220px]">
                            {app.autoRedirectNote}
                          </span>
                        )}

                        {app.waitingListReason && (
                          <span className="text-[10px] text-red-600 block mt-1 max-w-[220px]">
                            {app.waitingListReason}
                          </span>
                        )}

                        <span className="text-[10px] text-gray-400 block max-w-[180px] truncate">
                          {getEquipmentName(app.equipmentCode)}
                        </span>
                      </td>
                      <td className="px-4 py-3 space-y-0.5 text-gray-600">
                        <div>
                          Date:{' '}
                          <span className="font-medium text-gray-900">{details.dateBorrow}</span>
                        </div>
                        <div>
                          Duration:{' '}
                          <span className="font-medium text-gray-900">{details.duration}</span>
                        </div>
                        <div>
                          Return Target:{' '}
                          <span className="font-medium text-gray-900">{details.returnTime}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isFlagged ? (
                          <span className="inline-flex items-center gap-1 bg-red-50 border border-red-200 text-red-700 px-2.5 py-1 rounded-full font-bold text-[10px]">
                            <UserX className="w-3 h-3" /> RESTRICTED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-full font-bold text-[10px]">
                            âœ“ CLEAR
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isStaff ? (
                          <div className="space-y-1.5">
                            {insufficientStockAppId === app.id && (
                              <div className="bg-red-50 border border-red-200 text-red-700 px-2 py-1 rounded text-[9px] font-bold animate-pulse">
                                Approval failed â€” no same-type equipment available
                              </div>
                            )}
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              <button
                                onClick={() => handleApproveWithCascade(app.id)}
                                disabled={isFlagged}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold text-white shadow-sm transition-colors ${
                                  isFlagged
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                                    : 'bg-emerald-600 hover:bg-emerald-700'
                                }`}
                              >
                                Approve Borrow
                              </button>
                              <button
                                onClick={() => rejectApplication(app.id)}
                                className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors inline-flex items-center gap-1"
                              >
                                <XCircle className="w-3 h-3" /> Reject
                              </button>
                              <button
                                onClick={() => setBanConfirmAppId(app.id)}
                                className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-red-50 text-red-700 border border-red-300 hover:bg-red-100 transition-colors inline-flex items-center gap-1"
                              >
                                <Ban className="w-3 h-3" /> Ban
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-orange-700 bg-orange-50 border border-orange-200 rounded-full animate-pulse">
                            AWAITING STAFF LOG
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2 bg-emerald-50/20">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <h3 className="font-bold text-gray-900 text-xs">
            Stage 2: Active Borrows Ledger & Returns Review ({processedApplicationsLog.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold text-[11px]">
                <th className="px-4 py-3">BORROWER DETAILS</th>
                <th className="px-4 py-3">HARDWARE CODE</th>
                <th className="px-4 py-3">SESSION TIMINGS / PROOF DATA</th>
                <th className="px-4 py-3 text-center">WORKFLOW REVIEW STATE</th>
                <th className="px-4 py-3 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {processedApplicationsLog.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">
                    No active borrows.
                  </td>
                </tr>
              ) : (
                processedApplicationsLog.map((app) => {
                  const details = app.formData;
                  const isReturnSubmitted = app.isReturned && !!app.returnDetails;
                  const isOverdue =
                    !isReturnSubmitted && new Date(details.dateBorrow) < new Date('2026-06-12');

                  return (
                    <tr
                      key={app.id}
                      className={`border-b border-gray-100 transition-colors ${
                        isOverdue ? 'bg-red-50/50' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-bold text-gray-900 uppercase">{details.fullName}</div>
                        <div className="text-gray-500 font-mono text-[10px]">
                          {details.emailAddress}
                        </div>
                        <div className="text-slate-400 text-[10px] mt-0.5 font-medium">
                          ðŸ“± {details.phoneNumber}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-red-900 text-xs">
                          {app.finalEquipmentCode || app.equipmentCode}
                        </div>

                        {app.originalEquipmentCode &&
                          app.finalEquipmentCode &&
                          app.originalEquipmentCode !== app.finalEquipmentCode && (
                            <div className="mt-1 text-[10px] text-amber-700 font-medium max-w-[240px]">
                              Your request was approved with alternative equipment code{' '}
                              <span className="font-mono font-bold">
                                {app.finalEquipmentCode}
                              </span>
                              . Original requested code:{' '}
                              <span className="font-mono font-bold">
                                {app.originalEquipmentCode}
                              </span>
                              .
                            </div>
                          )}
                      </td>
                      <td className="px-4 py-3 space-y-1">
                        <div className="text-[10px] text-gray-600">
                          <div>
                            Borrowed on:{' '}
                            <span className="font-medium text-gray-900">
                              {details.dateBorrow}
                            </span>
                          </div>
                          <div>
                            Expected Return:{' '}
                            <span
                              className={`font-bold ${
                                isOverdue ? 'text-red-600 underline' : 'text-gray-900'
                              }`}
                            >
                              {details.returnTime}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isOverdue ? (
                          <span className="inline-flex items-center gap-1 bg-red-100 border border-red-300 text-red-700 px-2 py-0.5 rounded font-black text-[9px] animate-bounce">
                            âš ï¸ OVERDUE CRITICAL
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold text-[9px]">
                            âœ“ IN STUDENT POSSESSION
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isStaff ? (
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <button
                              onClick={() => approveReturnRequest(app.id)}
                              disabled={!isReturnSubmitted}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold text-white shadow-sm ${
                                isReturnSubmitted
                                  ? 'bg-orange-600'
                                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              }`}
                            >
                              Verify Return
                            </button>

                            {isOverdue && (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleCopyPhoneNumber(app.id, details.phoneNumber)}
                                  className="px-2 py-1.5 bg-gray-900 text-white rounded-l-lg text-[10px] font-bold"
                                >
                                  {copiedAppId === app.id ? 'Copied' : 'Contact'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    triggerSmsSimulationModal(
                                      details.fullName,
                                      details.phoneNumber,
                                      app.equipmentCode
                                    )
                                  }
                                  className="px-2 py-1.5 bg-amber-500 text-white rounded-r-lg text-[10px] font-bold"
                                >
                                  SMS Alert ðŸ“±
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex justify-center">
                            <button
                              type="button"
                              onClick={() => setActiveReturnAppId(app.id)}
                              className="bg-gray-900 text-white font-bold px-3 py-1.5 rounded-lg text-[10px]"
                            >
                              Return Asset
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2 bg-indigo-50/20">
          <Undo2 className="w-4 h-4 text-indigo-600" />
          <h3 className="font-bold text-gray-900 text-xs">
            Stage 3: Permanent Archive Database Ledger ({historicalLedger.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold text-[11px]">
                <th className="px-4 py-3">COMPLETED BORROWER</th>
                <th className="px-4 py-3">ASSET CODE</th>
                <th className="px-4 py-3">TIMELINE LOG SEQUENCE</th>
                <th className="px-4 py-3 text-center">AUDIT COMPLIANCE</th>
              </tr>
            </thead>
            <tbody>
              {historicalLedger.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400 italic">
                    No archive records.
                  </td>
                </tr>
              ) : (
                historicalLedger.map((app) => {
                  const details = app.formData;
                  const isBanned = app.status === 'BANNED';

                  return (
                    <tr
                      key={app.id}
                      className={`border-b border-gray-100 transition-colors ${
                        isBanned
                          ? 'bg-red-50/30 hover:bg-red-50/50'
                          : 'hover:bg-gray-50/40 text-slate-500'
                      }`}
                    >
                      <td className="px-4 py-2.5">
                        <div
                          className={`font-bold uppercase ${
                            isBanned ? 'text-red-800' : 'text-gray-700'
                          }`}
                        >
                          {details.fullName}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400">
                          {details.emailAddress}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs font-semibold text-slate-600">
                        <div className="font-mono">{app.finalEquipmentCode || app.equipmentCode}</div>
                        {app.originalEquipmentCode &&
                          app.finalEquipmentCode &&
                          app.originalEquipmentCode !== app.finalEquipmentCode && (
                            <div className="mt-1 text-[10px] text-amber-700 font-medium max-w-[220px]">
                              Redirected from{' '}
                              <span className="font-mono font-bold">
                                {app.originalEquipmentCode}
                              </span>
                            </div>
                          )}
                      </td>
                      <td className="px-4 py-2.5 text-[10px] space-y-0.5">
                        <div>
                          Borrowed:{' '}
                          <span className="text-slate-700 font-medium">
                            {details.dateBorrow}
                          </span>
                        </div>
                        <div>
                          {isBanned ? 'Banned at:' : 'Returned:'}{' '}
                          <span className="text-slate-700 font-medium">
                            {app.processedAt?.split('T')[0] ||
                              app.returnDetails?.dateReturned ||
                              details.returnTime}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {isBanned ? (
                          <span className="inline-flex items-center gap-1 bg-red-100 border border-red-200 text-red-700 px-2 py-0.5 rounded font-bold text-[9px]">
                            <Ban className="w-2.5 h-2.5" /> REJECTED - BANNED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold text-[9px]">
                            AUDITED COMPLIANT
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {activeReturnAppId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between">
              <h3 className="font-bold text-xs tracking-wide">Submit Return Verification</h3>
              <button
                type="button"
                onClick={() => setActiveReturnAppId(null)}
                className="text-white font-bold text-sm"
              >
                âœ•
              </button>
            </div>

            <form onSubmit={handleReturnSubmit} className="p-4 space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-600 mb-1">
                  Date Returned
                </label>
                <input
                  type="date"
                  value={returnForm.dateReturned}
                  onChange={(e) =>
                    setReturnForm((prev) => ({ ...prev, dateReturned: e.target.value }))
                  }
                  className="w-full border border-gray-200 rounded-lg p-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-600 mb-1">
                  Overseeing Staff
                </label>
                <input
                  type="text"
                  value={returnForm.overseeingStaff}
                  onChange={(e) =>
                    setReturnForm((prev) => ({ ...prev, overseeingStaff: e.target.value }))
                  }
                  className="w-full border border-gray-200 rounded-lg p-2 text-xs"
                  placeholder="e.g. Lab Staff Name"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-600 mb-1">
                  Equipment Image Proof
                </label>
                <label className="border border-dashed border-gray-300 rounded-lg p-3 flex items-center justify-center gap-2 text-gray-500 text-[10px] font-bold cursor-pointer hover:bg-gray-50">
                  <UploadCloud className="w-4 h-4" />
                  Upload Return Proof
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
                {returnForm.equipmentImage && (
                  <img
                    src={returnForm.equipmentImage}
                    alt="Return proof"
                    className="mt-2 max-h-32 rounded border border-gray-200"
                  />
                )}
              </div>

              {returnError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-2 py-1 rounded text-[10px] font-bold">
                  {returnError}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveReturnAppId(null)}
                  className="flex-1 bg-gray-100 text-gray-700 font-bold py-2 rounded-lg text-[10px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 text-white font-bold py-2 rounded-lg text-[10px]"
                >
                  Submit Return
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {smsNotificationPayload?.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Phone className="w-4 h-4" />
                <h3 className="font-bold text-xs tracking-wide">UTM Mobile SMS API Relay</h3>
              </div>
              <button
                type="button"
                onClick={() => setSmsNotificationPayload(null)}
                className="text-white font-bold text-sm"
              >
                âœ•
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 font-mono text-[10px]">
                <div>
                  <span className="text-slate-500">Student:</span>{' '}
                  <span className="text-slate-800 font-bold">
                    {smsNotificationPayload.studentName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Phone:</span>{' '}
                  <span className="text-blue-500">{smsNotificationPayload.phone}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 mt-1">
                  <p className="text-slate-200 bg-slate-900 p-2 rounded text-[9px] leading-normal">
                    {smsNotificationPayload.message}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSmsNotificationPayload(null)}
                  className="w-full bg-slate-100 text-slate-700 font-bold py-2 rounded-lg text-[10px]"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    alert('Simulated SMS dispatch successful!');
                    setSmsNotificationPayload(null);
                  }}
                  className="w-full bg-emerald-600 text-white font-bold py-2 rounded-lg text-[10px]"
                >
                  Simulate Fire!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {banConfirmAppId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-red-200 shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="bg-gradient-to-r from-red-800 to-red-900 text-white px-4 py-3 flex items-center gap-2">
              <Ban className="w-4 h-4" />
              <h3 className="font-bold text-xs tracking-wide">Confirm Student Ban</h3>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm text-gray-700 font-medium">
                Are you sure you want to ban this student from borrowing equipment?
              </p>
              <p className="text-[10px] text-gray-500">
                This will add the student to the restricted list, remove the application from the
                pending queue, and prevent future borrow submissions. The record will be archived
                for audit purposes.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setBanConfirmAppId(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-lg text-[10px] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const bannedApp = incomingVerificationQueue.find(
                      (a) => a.id === banConfirmAppId
                    );
                    const studentName = bannedApp?.formData?.fullName || 'Student';

                    await banApplication(banConfirmAppId);

                    setBanConfirmAppId(null);
                    setBanToast(studentName);
                    setTimeout(() => setBanToast(null), 4000);
                  }}
                  className="flex-1 bg-red-700 hover:bg-red-800 text-white font-bold py-2 rounded-lg text-[10px] transition-colors inline-flex items-center justify-center gap-1"
                >
                  <UserX className="w-3 h-3" /> Confirm Ban
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {banToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
          <div className="bg-red-950 text-white px-4 py-3 rounded-lg shadow-xl border border-red-800 flex items-center gap-2 max-w-sm">
            <UserX className="w-4 h-4 text-red-300 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold">{banToast} has been banned</p>
              <p className="text-[10px] text-red-300">
                Application removed from queue. Record archived for audit.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setBanToast(null)}
              className="ml-2 text-red-400 hover:text-white font-bold text-sm"
            >
              âœ•
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
