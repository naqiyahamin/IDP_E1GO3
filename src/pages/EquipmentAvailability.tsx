import { useState } from 'react';
import {
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Clock,
  History,
  FileSpreadsheet,
  Eye,
  Wrench,
} from 'lucide-react';
import BorrowFormModal, { type BorrowFormData } from '../components/BorrowFormModal';
import TinkerIoTSimulator from '../components/TinkerIoTSimulator';
import { useAppState, type EquipmentStatus, type Application } from '../context';
import type { UserRole } from '../auth';

const statusBadge: Record<EquipmentStatus, string> = {
  AVAILABLE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'PENDING PICKUP': 'bg-orange-50 text-orange-700 border-orange-200',
  BORROWED: 'bg-red-50 text-red-700 border-red-200',
  RETURN_PENDING: 'bg-blue-50 text-blue-700 border-blue-200',
  BROKEN: 'bg-red-100 text-red-800 border-red-300',
  CALIBRATING: 'bg-orange-100 text-orange-800 border-orange-300',
};

const statusDot: Record<EquipmentStatus, string> = {
  AVAILABLE: 'bg-emerald-500',
  'PENDING PICKUP': 'bg-orange-500',
  BORROWED: 'bg-red-500',
  RETURN_PENDING: 'bg-blue-500',
  BROKEN: 'bg-red-600 animate-pulse',
  CALIBRATING: 'bg-orange-500 animate-pulse',
};

interface EquipmentAvailabilityProps {
  userRole: UserRole;
  currentUserEmail: string;
  onSuccessRedirect?: () => void;
}

export function EquipmentAvailability({
  userRole,
  currentUserEmail,
  onSuccessRedirect,
}: EquipmentAvailabilityProps) {
  const {
    equipmentRows,
    updateEquipmentStatus,
    submitApplication,
    processedApplicationsLog,
    historicalLedger,
  } = useAppState();

  const [borrowTarget, setBorrowTarget] = useState<string | null>(null);
  const [activePreviewImage, setActivePreviewImage] = useState<string | null>(null);

  const availableCount = equipmentRows.filter((r) => r.status === 'AVAILABLE').length;
  const pendingCount = equipmentRows.filter(
    (r) => r.status === 'PENDING PICKUP' || r.status === 'RETURN_PENDING'
  ).length;
  const borrowedCount = equipmentRows.filter((r) => r.status === 'BORROWED').length;
  const maintenanceCount = equipmentRows.filter(
    (r) => r.status === 'BROKEN' || r.status === 'CALIBRATING'
  ).length;

  const handleBorrowSubmitWithAttachment = async (
    data: BorrowFormData,
    photoBase64?: string
  ): Promise<boolean> => {
    if (!borrowTarget) return false;

    const success = await submitApplication(data, borrowTarget, photoBase64);

    if (success) {
      setBorrowTarget(null);
      onSuccessRedirect?.();
    }

    return success;
  };

  const agt567Status = equipmentRows.find((r) => r.code === 'AGT567')?.status ?? 'AVAILABLE';
  const isStudent = userRole === 'student';

  if (borrowTarget && isStudent) {
    return (
      <div className="flex gap-6">
        <div className="flex-1">
          <BorrowFormModal
            equipmentCode={borrowTarget}
            currentUserEmail={currentUserEmail}
            onSubmit={handleBorrowSubmitWithAttachment}
            onBack={() => setBorrowTarget(null)}
          />
        </div>

        <div className="w-72 flex-shrink-0">
          <div className="sticky top-20">
            <TinkerIoTSimulator
              agt567Status={agt567Status}
              onSimulateRemove={() => updateEquipmentStatus('AGT567', 'BORROWED')}
              onSimulatePlace={() => updateEquipmentStatus('AGT567', 'AVAILABLE')}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{availableCount}</p>
              <p className="text-xs text-gray-500">Available</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
              <p className="text-xs text-gray-500">Pending Actions</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{borrowedCount}</p>
              <p className="text-xs text-gray-500">Borrowed Out</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{maintenanceCount}</p>
              <p className="text-xs text-gray-500">Maintenance</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-utm-maroon/10 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-utm-maroon" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">
                Oscilloscope Live Stock Tracker
              </h3>
              <p className="text-[10px] text-gray-500">
                Advanced Electronics Laboratory
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs w-12">
                    NO
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">
                    CODE
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">
                    EQUIPMENT
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">
                    TYPE
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs">
                    QTY
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">
                    LAST DATE USED
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">
                    LAB LOCATION
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs">
                    STATUS
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">
                    VERIFICATION BY
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs">
                    ACTION
                  </th>
                </tr>
              </thead>

              <tbody>
                {equipmentRows.map((row) => (
                  <tr
                    key={row.code}
                    className={`border-b border-gray-100 transition-colors ${
                      row.code === 'AGT567' ? 'bg-utm-gold/5' : 'hover:bg-gray-50/50'
                    }`}
                  >
                    <td className="px-4 py-3 text-center text-gray-400 text-xs">
                      {row.no}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-gray-900 text-xs">
                      {row.code}
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs font-semibold">
                      {row.equipmentName}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">
                      {row.equipmentType}
                    </td>
                    <td className="px-4 py-3 text-center text-xs font-bold">
                      {row.quantityAvailable}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {row.lastDateUsed}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {row.labLocation}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                          statusBadge[row.status] ?? 'bg-gray-50 text-gray-600 border-gray-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            statusDot[row.status] ?? 'bg-gray-400'
                          }`}
                        />
                        {row.status === 'PENDING PICKUP'
                          ? 'PENDING APPROVAL'
                          : row.status === 'BROKEN' || row.status === 'CALIBRATING'
                            ? 'MAINTENANCE'
                            : row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs font-medium">
                      {row.verificationBy}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isStudent && row.status === 'AVAILABLE' && row.quantityAvailable > 0 ? (
                        <button
                          onClick={() => setBorrowTarget(row.code)}
                          className="px-3 py-1.5 text-[10px] font-bold rounded-lg bg-utm-maroon text-white hover:bg-utm-maroon-dark transition-colors cursor-pointer"
                        >
                          Borrow
                        </button>
                      ) : isStudent &&
                        (row.status === 'BROKEN' || row.status === 'CALIBRATING') ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 rounded-md select-none">
                          <Wrench className="w-3 h-3" />
                          Maintenance
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-400 font-medium">--</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="w-full lg:w-72 flex-shrink-0">
          <div className="sticky top-20">
            <TinkerIoTSimulator
              agt567Status={agt567Status}
              onSimulateRemove={() => updateEquipmentStatus('AGT567', 'BORROWED')}
              onSimulatePlace={() => updateEquipmentStatus('AGT567', 'AVAILABLE')}
            />
          </div>
        </div>
      </div>

      {!isStudent && (
        <div className="space-y-6 pt-4">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2.5">
              <History className="w-4 h-4 text-amber-600" />
              <div>
                <h3 className="font-bold text-gray-900 text-sm">
                  Processed Applications History Log (Active Borrows)
                </h3>
                <p className="text-[10px] text-gray-500">
                  Equipment currently out in field context layout - not yet returned
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/70 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[10px] font-bold">
                    <th className="p-4">Original Code</th>
                    <th className="p-4">Assigned Code</th>
                    <th className="p-4">Student Details</th>
                    <th className="p-4">Timestamp Duration</th>
                    <th className="p-4">Live Status Tracking</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {processedApplicationsLog.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-gray-400 italic">
                        No active borrowing cycles currently deployed in the field.
                      </td>
                    </tr>
                  ) : (
                    processedApplicationsLog.map((app: Application) => (
                      <tr key={app.id} className="hover:bg-gray-50/40">
                        <td className="p-4 font-mono font-bold text-gray-500 text-sm">
                          {app.originalEquipmentCode || app.equipmentCode}
                        </td>
                        <td className="p-4">
                          <div className="font-mono font-bold text-utm-maroon text-sm">
                            {app.finalEquipmentCode || app.equipmentCode}
                          </div>
                          {app.autoRedirectNote && (
                            <div className="mt-1 max-w-xs text-[10px] text-amber-700 font-semibold">
                              {app.autoRedirectNote}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-gray-900 uppercase">
                            {app.formData.fullName}
                          </div>
                          <div className="text-gray-400 text-[10px] font-mono">
                            {app.formData.emailAddress}
                          </div>
                        </td>
                        <td className="p-4 text-gray-600">
                          <div>
                            Borrowed: <b>{app.formData.dateBorrow}</b>
                          </div>
                          <div className="text-[10px] text-gray-400">
                            Duration Limit: {app.formData.duration}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 uppercase">
                            Still Borrowing / Not Returned
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <div>
                <h3 className="font-bold text-gray-900 text-sm">
                  All-Time Transaction Historical Ledger
                </h3>
                <p className="text-[10px] text-gray-500">
                  Immutable structural system record trail logs - cannot be deleted
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/70 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[10px] font-bold">
                    <th className="p-4">Original Code</th>
                    <th className="p-4">Final Code</th>
                    <th className="p-4">Student Account</th>
                    <th className="p-4">Time Window Lifecycle</th>
                    <th className="p-4">Overseeing Sign-Off</th>
                    <th className="p-4 text-center">Attachment</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {historicalLedger.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-gray-400 italic">
                        No permanently archived transaction cycles recorded yet.
                      </td>
                    </tr>
                  ) : (
                    historicalLedger.map((app: Application) => (
                      <tr key={app.id} className="hover:bg-gray-50/40">
                        <td className="p-4 font-mono font-bold text-gray-500">
                          {app.originalEquipmentCode || app.equipmentCode}
                        </td>
                        <td className="p-4">
                          <div className="font-mono font-bold text-gray-900">
                            {app.finalEquipmentCode || app.equipmentCode}
                          </div>
                          {app.autoRedirectNote && (
                            <div className="mt-1 max-w-xs text-[10px] text-amber-700 font-semibold">
                              {app.autoRedirectNote}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-gray-800 uppercase">
                            {app.formData.fullName}
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono">
                            {app.formData.emailAddress}
                          </div>
                        </td>
                        <td className="p-4 text-gray-500 text-[11px]">
                          <div>Issued: {app.formData.dateBorrow}</div>
                          <div className="text-emerald-600 font-medium">
                            Returned: {app.returnDetails?.dateReturned || 'Completed'}
                          </div>
                        </td>
                        <td className="p-4 font-medium text-gray-700 uppercase">
                          {app.returnDetails?.overseeingStaff || 'SYSTEM AUTO'}
                        </td>
                        <td className="p-4 text-center">
                          {app.returnDetails?.equipmentImage ? (
                            <button
                              type="button"
                              onClick={() =>
                                setActivePreviewImage(
                                  app.returnDetails?.equipmentImage || null
                                )
                              }
                              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] bg-gray-100 hover:bg-gray-200 font-bold rounded text-gray-700 cursor-pointer transition-colors mx-auto"
                            >
                              <Eye className="w-3 h-3" /> View Proof
                            </button>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activePreviewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setActivePreviewImage(null)}
        >
          <div
            className="relative max-w-lg w-full bg-white rounded-lg p-3 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={activePreviewImage}
              alt="Verification snapshot proof"
              className="w-full h-auto rounded object-contain max-h-[70vh]"
            />
            <button
              onClick={() => setActivePreviewImage(null)}
              className="absolute top-2 right-2 bg-black text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold cursor-pointer"
            >
              x
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default EquipmentAvailability;