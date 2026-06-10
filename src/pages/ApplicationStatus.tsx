import { useState, useMemo } from 'react';
import { Clock, ShieldCheck, UserX, UserCheck, CheckCircle, FileText, Camera, UploadCloud, Ban, Undo2, Table, AlertTriangle, PackageCheck } from 'lucide-react';
import { useAppState } from '../context';
import type { UserRole } from '../auth';

interface ApplicationStatusProps {
  userRole: UserRole;
  currentUserEmail?: string;
}

export default function ApplicationStatus({ userRole, currentUserEmail = "" }: ApplicationStatusProps) {
  const { 
    incomingVerificationQueue: rawQueue,
    processedApplicationsLog: rawLog,
    historicalLedger: rawLedger,
    approveApplication, 
    rejectApplication, 
    blacklistedEmails, 
    toggleBlacklistUser,
    submitReturnRequest,
    approveReturnRequest
  } = useAppState();

  const [checkEmail, setCheckEmail] = useState('');
  const [checkerResult, setCheckerResult] = useState<{ searched: boolean; status: 'CLEAR' | 'BLACKLISTED' | null }>({
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

  const isStaff = userRole === 'staff';
  const cleanUserEmail = currentUserEmail.trim().toLowerCase();

  // ==========================================
  // ROLE-BASED DATA FILTERING PIPELINE
  // ==========================================
  const incomingVerificationQueue = useMemo(() => {
    if (isStaff) return rawQueue;
    return rawQueue.filter(app => app.formData.emailAddress.trim().toLowerCase() === cleanUserEmail);
  }, [rawQueue, isStaff, cleanUserEmail]);

  const processedApplicationsLog = useMemo(() => {
    if (isStaff) return rawLog;
    return rawLog.filter(app => app.formData.emailAddress.trim().toLowerCase() === cleanUserEmail);
  }, [rawLog, isStaff, cleanUserEmail]);

  const historicalLedger = useMemo(() => {
    if (isStaff) return rawLedger;
    return rawLedger.filter(app => app.formData.emailAddress.trim().toLowerCase() === cleanUserEmail);
  }, [rawLedger, isStaff, cleanUserEmail]);

  // ==========================================
  // INVENTORY MASTER AGGREGATOR SPREADSHEET LOGIC
  // ==========================================
  const inventorySpreadsheetData = useMemo(() => {
    const stats: Record<string, {
      code: string;
      name: string;
      totalBorrowedTimes: number;
      isBeingBorrowed: number; // Awaiting confirmation in queue
      inPossession: number;    // Checked out and with the student
      overdueCount: number;    // Kept beyond promised target date
    }> = {};

    const getEquipmentName = (code: string) => {
      if (code.startsWith('AGT')) return 'Digital Storage Oscilloscope (Tektronix)';
      if (code.startsWith('MXW')) return 'Regulated DC Power Supply';
      if (code.startsWith('RFE')) return 'RF Spectrum Analyzer';
      return 'Microcontroller Prototyping Trainer Kit';
    };

    const initRow = (code: string) => {
      if (!stats[code]) {
        stats[code] = {
          code,
          name: getEquipmentName(code),
          totalBorrowedTimes: 0,
          isBeingBorrowed: 0,
          inPossession: 0,
          overdueCount: 0
        };
      }
    };

    // Pipeline 1: Awaiting Approvals
    rawQueue.forEach(app => {
      initRow(app.equipmentCode);
      stats[app.equipmentCode].isBeingBorrowed += 1;
      stats[app.equipmentCode].totalBorrowedTimes += 1;
    });

    // Pipeline 2: Active Possessions
    rawLog.forEach(app => {
      initRow(app.equipmentCode);
      stats[app.equipmentCode].totalBorrowedTimes += 1;
      
      if (!(app.isReturned && app.returnDetails)) {
        stats[app.equipmentCode].inPossession += 1;
        
        // Target timeline parsing matching system clock context: 2026-06-04
        try {
          const currentSystemDate = new Date('2026-06-04');
          const targetReturnDate = new Date(app.formData.dateBorrow);
          
          if (!isNaN(targetReturnDate.getTime()) && targetReturnDate < currentSystemDate) {
            stats[app.equipmentCode].overdueCount += 1;
          }
        } catch (e) {
          // Graceful fallback ignore
        }
      }
    });

    // Pipeline 3: Closed Historical Archives
    rawLedger.forEach(app => {
      initRow(app.equipmentCode);
      stats[app.equipmentCode].totalBorrowedTimes += 1;
    });

    return Object.values(stats);
  }, [rawQueue, rawLog, rawLedger]);

  // Baseline asset laboratory limits allocations
  const getAssetTotalCapacity = (code: string) => {
    if (code.includes('570')) return 5;
    if (code.includes('210')) return 8;
    return 4;
  };

  // ==========================================

  const handleInstantCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkEmail.trim()) return;
    const isBad = blacklistedEmails.includes(checkEmail.trim().toLowerCase());
    setCheckerResult({ searched: true, status: isBad ? 'BLACKLISTED' : 'CLEAR' });
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
      setReturnForm(prev => ({ ...prev, equipmentImage: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleReturnSubmit = (e: React.FormEvent) => {
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

    submitReturnRequest(activeReturnAppId, returnForm);
    setActiveReturnAppId(null);
    setReturnForm({ dateReturned: new Date().toISOString().split('T')[0], overseeingStaff: '', equipmentImage: '' });
    setReturnError('');
  };

  return (
    <div className="space-y-6 text-xs p-4">
      
      {/* COUNTER WIDGETS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Stage 1: Incoming Gatekeeper Queue</span>
            <div className="flex items-baseline gap-1">
              <h3 className="text-xl font-extrabold text-slate-800 leading-none">{incomingVerificationQueue.length}</h3>
              <span className="text-[10px] text-slate-500 font-medium">Applications</span>
            </div>
            <p className="text-[10px] text-amber-600 font-semibold flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" /> Awaiting Verification Sign-off
            </p>
          </div>
          <div className="bg-amber-50 p-2.5 rounded-lg text-base shadow-sm">⏳</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Stage 2: Active Possession Ledger</span>
            <div className="flex items-baseline gap-1">
              <h3 className="text-xl font-extrabold text-slate-800 leading-none">{processedApplicationsLog.length}</h3>
              <span className="text-[10px] text-slate-500 font-medium">Live Sessions</span>
            </div>
            <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> In Student Use / Returns Review
            </p>
          </div>
          <div className="bg-emerald-50 p-2.5 rounded-lg text-base shadow-sm">📦</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Stage 3: Permanent Closed Archive</span>
            <div className="flex items-baseline gap-1">
              <h3 className="text-xl font-extrabold text-slate-800 leading-none">{historicalLedger.length}</h3>
              <span className="text-[10px] text-slate-500 font-medium">Logged Logs</span>
            </div>
            <p className="text-[10px] text-indigo-600 font-semibold flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" /> Unalterable Audited Database
            </p>
          </div>
          <div className="bg-indigo-50 p-2.5 rounded-lg text-base shadow-sm">🗃️</div>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* SPREADSHEET LOG: THREE PIPELINES EQUIPMENT LIFECYCLE AUDITING ENGINE    */}
      {/* ======================================================================= */}
      {isStaff && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
            <div className="flex items-center gap-2">
              <Table className="w-4 h-4 text-utm-gold" />
              <div>
                <h3 className="font-bold text-xs tracking-wide">Master Equipment Log Spreadsheet</h3>
                <p className="text-[9px] text-slate-300">Cross-pipeline tracking broken down by individual unit type codes.</p>
              </div>
            </div>
            <div className="bg-slate-800 border border-slate-700 px-3 py-1 rounded text-[10px] font-mono text-utm-gold font-bold">
              SYSTEM AUDIT TIME: 2026-06-04
            </div>
          </div>

          {inventorySpreadsheetData.length === 0 ? (
            <div className="p-6 text-center text-slate-400 italic">
              No laboratory items registered across any borrowing pipelines.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-extrabold text-[10px] tracking-wider uppercase">
                    <th className="px-4 py-3">Equipment Code</th>
                    <th className="px-4 py-3">Classification Model</th>
                    <th className="px-4 py-3 text-center bg-slate-50">Total Borrowed (Times)</th>
                    <th className="px-4 py-3 text-center text-amber-700">Is Being Borrowed (Queue)</th>
                    <th className="px-4 py-3 text-center text-blue-700">In Student Possession</th>
                    <th className="px-4 py-3 text-center bg-red-50 text-red-700">⚠️ Beyond Due Date</th>
                    <th className="px-4 py-3 text-center bg-emerald-50 text-emerald-800">Available Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {inventorySpreadsheetData.map((row) => {
                    const totalCap = getAssetTotalCapacity(row.code);
                    const stockRemaining = Math.max(0, totalCap - row.inPossession);

                    return (
                      <tr key={row.code} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-2.5 font-mono font-bold text-utm-maroon text-xs">{row.code}</td>
                        <td className="px-4 py-2.5 text-slate-800 text-[11px]">{row.name}</td>
                        <td className="px-4 py-2.5 text-center font-bold bg-slate-50 text-slate-900">{row.totalBorrowedTimes} x</td>
                        <td className="px-4 py-2.5 text-center font-bold text-amber-600">{row.isBeingBorrowed}</td>
                        <td className="px-4 py-2.5 text-center font-bold text-blue-600">{row.inPossession}</td>
                        <td className={`px-4 py-2.5 text-center font-extrabold ${row.overdueCount > 0 ? 'bg-red-50 text-red-600 animate-pulse' : 'text-slate-400 font-normal'}`}>
                          {row.overdueCount > 0 ? (
                            <span className="inline-flex items-center gap-0.5">
                              <AlertTriangle className="w-3 h-3 text-red-500" /> {row.overdueCount} OVERDUE
                            </span>
                          ) : '0'}
                        </td>
                        <td className="px-4 py-2.5 text-center bg-emerald-50/50">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${stockRemaining > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                            <PackageCheck className="w-3 h-3" /> {stockRemaining} / {totalCap} Available
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {/* ======================================================================= */}

      {/* CONTROL PANEL & RISK CHECKER */}
      {isStaff && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-gradient-to-r from-utm-maroon to-[#600018] rounded-xl p-5 text-white shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-base font-bold mb-1">Staff Verification & Blacklist Control Panel</h2>
              <p className="text-[11px] text-white/80 leading-relaxed">
                Cross-reference incoming student request parameters below. Manually restrict access values for non-compliant borrowers, analyze uploaded picture proofs, and process return checks.
              </p>
            </div>
            
            <div className="mt-4 bg-black/10 border border-white/10 rounded-lg p-2.5">
              <span className="font-bold block mb-1 text-[11px] text-utm-gold">Persistent Blacklisted Registries ({blacklistedEmails.filter(e => e !== 'badstudent@utm.my').length})</span>
              {blacklistedEmails.length <= 1 ? (
                <p className="text-[10px] text-white/50 italic">No students manually blacklisted yet.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto pt-1">
                  {blacklistedEmails.map(email => {
                    if (email === 'badstudent@utm.my') return null;
                    return (
                      <span key={email} className="inline-flex items-center gap-1 bg-red-950/60 text-red-200 px-2 py-0.5 rounded border border-red-800/40 font-mono text-[9px]">
                        {email}
                        <button type="button" onClick={() => toggleBlacklistUser(email)} className="hover:text-white text-red-400 ml-1 font-bold">×</button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 font-bold text-gray-900 border-b border-gray-100 pb-2 mb-3 text-xs">
                <ShieldCheck className="w-4 h-4 text-utm-gold" />
                <span>Instant Background Checker & Restrictor</span>
              </div>
              <form onSubmit={handleInstantCheck} className="space-y-2">
                <input
                  type="text"
                  placeholder="Enter student email (e.g. name@graduate.utm.my)..."
                  value={checkEmail}
                  onChange={(e) => setCheckEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2 text-[11px] focus:outline-none focus:border-utm-maroon"
                />
                <div className="grid grid-cols-2 gap-2">
                  <button type="submit" className="bg-utm-maroon text-white font-bold py-1.5 rounded-lg hover:bg-opacity-90 transition-all text-[10px]">
                    Check Clear Status
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      if (checkEmail.trim()) {
                        toggleBlacklistUser(checkEmail.trim());
                        setCheckerResult({ searched: true, status: blacklistedEmails.includes(checkEmail.trim().toLowerCase()) ? 'CLEAR' : 'BLACKLISTED' });
                      }
                    }}
                    className="bg-gray-900 text-white font-bold py-1.5 rounded-lg hover:bg-gray-800 transition-all text-[10px] flex items-center justify-center gap-1"
                  >
                    <Ban className="w-3 h-3" /> Toggle Restrict
                  </button>
                </div>
              </form>
            </div>

            {checkerResult.searched && (
              <div className="mt-2.5">
                {blacklistedEmails.includes(checkEmail.trim().toLowerCase()) ? (
                  <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-2 flex items-center gap-2 font-bold text-[10px]">
                    <UserX className="w-4 h-4 flex-shrink-0 text-red-600" />
                    <span>ALERT: Student blacklisted. Reject access request.</span>
                  </div>
                ) : (
                  <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg p-2 flex items-center gap-2 font-bold text-[10px]">
                    <UserCheck className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                    <span>Student records clear. Eligible to borrow.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STAGE 1: INCOMING VERIFICATION QUEUE */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
          <Clock className="w-4 h-4 text-utm-maroon" />
          <h3 className="font-bold text-gray-900 text-xs">
            {isStaff ? `Stage 1: Incoming Borrow Verification Queue (${incomingVerificationQueue.length})` : 'My Tracked Verification Borrow Entries'}
          </h3>
        </div>

        {incomingVerificationQueue.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="font-medium">No active borrow applications found.</p>
          </div>
        ) : (
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
                {incomingVerificationQueue.map((app) => {
                  const details = app.formData;
                  const studentEmail = details.emailAddress.toLowerCase().trim();
                  const isFlagged = blacklistedEmails.includes(studentEmail);
                  
                  return (
                    <tr key={app.id} className="border-b border-gray-100 hover:bg-gray-50/40 transition-colors">
                      <td className="px-4 py-3 space-y-0.5">
                        <div className="font-bold text-gray-900 uppercase">{details.fullName}</div>
                        <div className="text-gray-500 font-mono text-[10px]">{details.emailAddress}</div>
                        <div className="text-gray-400 text-[10px]">{details.phoneNumber} • {details.yearCourse}</div>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-utm-maroon text-xs">
                        {app.equipmentCode}
                      </td>
                      <td className="px-4 py-3 space-y-0.5 text-gray-600">
                        <div>Date: <span className="font-medium text-gray-900">{details.dateBorrow}</span></div>
                        <div>Duration: <span className="font-medium text-gray-900">{details.duration}</span></div>
                        <div>Return Target: <span className="font-medium text-gray-900">{details.returnTime}</span></div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isFlagged ? (
                          <span className="inline-flex items-center gap-1 bg-red-50 border border-red-200 text-red-700 px-2.5 py-1 rounded-full font-bold text-[10px]">
                            ❌ RESTRICTED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-full font-bold text-[10px]">
                            ✓ CLEAR
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isStaff ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => approveApplication(app.id)}
                              disabled={isFlagged}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold text-white shadow-sm transition-all ${
                                isFlagged ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' : 'bg-emerald-600 hover:bg-emerald-700'
                              }`}
                            >
                              Approve Borrow
                            </button>
                            <button
                              onClick={() => {
                                toggleBlacklistUser(studentEmail);
                                rejectApplication(app.id);
                              }}
                              className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-all"
                            >
                              Reject & Ban
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-orange-700 bg-orange-50 border border-orange-200 rounded-full animate-pulse">
                              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" /> AWAITING STAFF LOG
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* STAGE 2: PROCESSED APPLICATIONS LOG */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2 bg-emerald-50/20">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <h3 className="font-bold text-gray-900 text-xs">
            {isStaff ? `Stage 2: Active Borrows Ledger & Returns Review (${processedApplicationsLog.length})` : 'My Active Possessed Devices'}
          </h3>
        </div>

        {processedApplicationsLog.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="font-medium">No hardware configurations currently active in your session log.</p>
          </div>
        ) : (
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
                {processedApplicationsLog.map((app) => {
                  const details = app.formData;
                  const isReturnSubmitted = app.isReturned && !!app.returnDetails;

                  let isOverdue = false;
                  try {
                    const currentSystemDate = new Date('2026-06-04');
                    const targetReturnDate = new Date(details.dateBorrow);
                    if (!isReturnSubmitted && !isNaN(targetReturnDate.getTime()) && targetReturnDate < currentSystemDate) {
                      isOverdue = true;
                    }
                  } catch (e) {}

                  return (
                    <tr key={app.id} className={`border-b border-gray-100 transition-colors ${isOverdue ? 'bg-red-50/50 hover:bg-red-50' : 'hover:bg-gray-50/40'}`}>
                      <td className="px-4 py-3">
                        <div className="font-bold text-gray-900 uppercase">{details.fullName}</div>
                        <div className="text-gray-500 font-mono text-[10px]">{details.emailAddress}</div>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-utm-maroon text-xs">
                        {app.equipmentCode}
                      </td>
                      <td className="px-4 py-3 space-y-1">
                        {isReturnSubmitted ? (
                          <div className="bg-orange-50/70 border border-orange-100 rounded-md p-2 space-y-0.5 text-[10px]">
                            <div>Returned: <span className="font-bold text-gray-900">{app.returnDetails?.dateReturned}</span></div>
                            <div>Witness Staff: <span className="font-bold text-gray-900 uppercase">{app.returnDetails?.overseeingStaff}</span></div>
                            <div className="pt-1">
                              <a href={app.returnDetails?.equipmentImage} target="_blank" rel="noreferrer" className="text-utm-maroon underline font-bold flex items-center gap-0.5 hover:text-utm-maroon-dark">
                                <Camera className="w-3 h-3" /> View Photo Proof payload
                              </a>
                            </div>
                          </div>
                        ) : (
                          <div className="text-[10px] text-gray-600">
                            <div>Borrowed on: <span className="font-medium text-gray-900">{details.dateBorrow}</span></div>
                            <div>Expected Return: <span className={`font-bold ${isOverdue ? 'text-red-600 underline' : 'text-gray-900'}`}>{details.returnTime}</span></div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isReturnSubmitted ? (
                          <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 rounded font-bold text-[9px] animate-pulse">
                            🔄 RETURN PENDING AUDIT
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-flex items-center gap-1 bg-red-100 border border-red-300 text-red-700 px-2 py-0.5 rounded font-black text-[9px] animate-bounce">
                            ⚠️ OVERDUE CRITICAL
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold text-[9px]">
                            ✓ IN STUDENT POSSESSION
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isStaff ? (
                          <div className="flex justify-center">
                            <button
                              onClick={() => approveReturnRequest(app.id)}
                              disabled={!isReturnSubmitted}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold text-white shadow-sm transition-all ${
                                isReturnSubmitted 
                                  ? 'bg-orange-600 hover:bg-orange-700' 
                                  : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                              }`}
                            >
                              Verify & Close Session
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-center">
                            {isReturnSubmitted ? (
                              <span className="text-gray-400 italic text-[10px]">Awaiting Staff Signoff...</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setActiveReturnAppId(app.id)}
                                className="bg-gray-900 hover:bg-gray-800 text-white font-bold px-2.5 py-1 rounded transition-all text-[10px]"
                              >
                                Dispatch Return Protocol Form
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* STAGE 3: PERSISTENT HISTORICAL LEDGER */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
          <h4 className="font-bold text-gray-800 text-xs">
            {isStaff ? 'Stage 3: Permanent Closed Transaction Ledger' : 'My Archival Return History'}
          </h4>
        </div>
        {historicalLedger.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-[11px]">
            <FileText className="w-8 h-8 mx-auto mb-1 opacity-40" />
            No permanently archived closed sessions tracked.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-60 overflow-y-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold">
                  <th className="px-4 py-2.5">STUDENT BENEFICIARY</th>
                  <th className="px-4 py-2.5">EQUIPMENT</th>
                  <th className="px-4 py-2.5">LIFECYCLE SIGN-OFF TIMESTAMPS</th>
                  <th className="px-4 py-2.5 text-center">PERMANENT LEDGER STATUS</th>
                </tr>
              </thead>
              <tbody>
                {historicalLedger.map((log) => (
                  <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/20">
                    <td className="px-4 py-2.5 font-medium text-gray-700 uppercase">
                      {log.formData.fullName}
                      <span className="block text-[9px] font-mono text-gray-400 lowercase">{log.formData.emailAddress}</span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-gray-600 font-bold">{log.equipmentCode}</td>
                    <td className="px-4 py-2.5 text-gray-500 space-y-0.5 text-[10px]">
                      <div>Borrowed Date: <span className="text-gray-900 font-mono">{log.formData.dateBorrow}</span></div>
                      {log.returnDetails && (
                        <div>Returned Date: <span className="text-emerald-700 font-mono font-bold">{log.returnDetails.dateReturned}</span></div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="inline-flex items-center gap-1 text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded font-bold text-[9px]">
                        <Undo2 className="w-3 h-3" /> VERIFIED RETURN ARCHIVED
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RETURN MODAL OVERLAY */}
      {activeReturnAppId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-gray-200 max-w-sm w-full p-5 space-y-4 shadow-xl">
            <div>
              <h4 className="text-sm font-bold text-gray-900">Equipment Return Upkeep Protocol</h4>
              <p className="text-[10px] text-gray-500">Provide verified staff audit parameters and structural image upload logs to avoid blacklists.</p>
            </div>

            <form onSubmit={handleReturnSubmit} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-700 mb-1">Date Returned</label>
                <input
                  type="date"
                  value={returnForm.dateReturned}
                  onChange={(e) => setReturnForm({ ...returnForm, dateReturned: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg p-2 focus:outline-none focus:border-utm-maroon"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-700 mb-1">Overseeing Staff Name</label>
                <input
                  type="text"
                  placeholder="e.g. INCIK RAZALI"
                  value={returnForm.overseeingStaff}
                  onChange={(e) => setReturnForm({ ...returnForm, overseeingStaff: e.target.value.toUpperCase() })}
                  className="w-full border border-gray-200 rounded-lg p-2 focus:outline-none focus:border-utm-maroon uppercase"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-700 mb-1">Upload Component Photo (High-Quality Check)</label>
                <div className="relative border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:bg-gray-50 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {returnForm.equipmentImage ? (
                    <div className="space-y-1">
                      <p className="text-[10px] text-emerald-600 font-bold flex items-center justify-center gap-1">✓ File Loaded Successfully</p>
                      <img src={returnForm.equipmentImage} alt="Preview" className="h-16 mx-auto object-cover rounded border" />
                    </div>
                  ) : (
                    <div className="text-gray-400 space-y-1">
                      <UploadCloud className="w-6 h-6 mx-auto opacity-60" />
                      <p className="text-[10px] font-medium">Click to capture or choose high-res hardware image</p>
                    </div>
                  )}
                </div>
              </div>

              {returnError && <p className="text-[10px] font-bold text-red-500">{returnError}</p>}

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveReturnAppId(null)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 rounded-lg transition-colors text-[10px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-utm-maroon hover:bg-utm-maroon-dark text-white font-bold py-2 rounded-lg transition-colors text-[10px]"
                >
                  Submit Return Check
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}