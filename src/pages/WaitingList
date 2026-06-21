import { useMemo } from 'react';
import { Clock, PackageCheck, RefreshCw, User, Wrench } from 'lucide-react';
import { useAppState } from '../context';
import type { UserRole } from '../auth';

interface WaitingListProps {
  userRole: UserRole;
  currentUserEmail?: string;
}

function getEquipmentType(code: string): string {
  const match = code.match(/^[A-Za-z]+/);
  return match ? match[0].toUpperCase() : 'GENERAL';
}

function getEquipmentName(code: string): string {
  if (code.startsWith('AGT')) return 'Digital Oscilloscope';
  if (code.startsWith('ARD')) return 'Arduino Uno';
  if (code.startsWith('ESP')) return 'ESP32 Microcontroller';
  if (code.startsWith('MXW')) return 'Regulated DC Power Supply';
  if (code.startsWith('RFE')) return 'RF Spectrum Analyzer';
  return 'General Equipment';
}

export default function WaitingList({
  userRole,
  currentUserEmail = '',
}: WaitingListProps) {
  const { applicationQueue, equipmentRows } = useAppState();

  const cleanUserEmail = currentUserEmail.trim().toLowerCase();
  const isStaff = userRole === 'staff';

  const waitingApplications = useMemo(() => {
    return applicationQueue
      .filter((app) => app.stage === 'PENDING' && app.waitingListReason)
      .filter((app) => {
        if (isStaff) return true;
        return app.formData.emailAddress.trim().toLowerCase() === cleanUserEmail;
      })
      .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
  }, [applicationQueue, isStaff, cleanUserEmail]);

  const equipmentAvailability = useMemo(() => {
    const availability: Record<string, {
      type: string;
      name: string;
      availableCodes: string[];
      unavailableCodes: string[];
    }> = {};

    equipmentRows.forEach((row) => {
      const type = row.equipmentType || getEquipmentType(row.code);
      const name = row.equipmentName || getEquipmentName(row.code);
      const key = `${type}:${name}`;

      if (!availability[key]) {
        availability[key] = {
          type,
          name,
          availableCodes: [],
          unavailableCodes: [],
        };
      }

      if (row.status === 'AVAILABLE') {
        availability[key].availableCodes.push(row.code);
      } else {
        availability[key].unavailableCodes.push(row.code);
      }
    });

    return availability;
  }, [equipmentRows]);

  const rows = waitingApplications.map((app, index) => {
    const requestedCode = app.originalEquipmentCode || app.equipmentCode;
    const type = app.equipmentType || getEquipmentType(requestedCode);
    const name = getEquipmentName(requestedCode);
    const matchingAvailability =
      equipmentAvailability[`${type}:${name}`] ||
      Object.values(equipmentAvailability).find((item) => item.type === type);

    return {
      app,
      position: index + 1,
      requestedCode,
      matchingAvailability,
    };
  });

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Waiting List Queue</h2>
            <p className="text-xs text-gray-500">
              Applications here were approved by staff but are waiting for compatible equipment to become available.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-100 text-amber-700 px-3 py-1 rounded text-xs font-bold">
            <Clock className="w-4 h-4" />
            {rows.length} Waiting
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold">
                <th className="px-4 py-3">Queue</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Requested Equipment</th>
                <th className="px-4 py-3">Borrow Timing</th>
                <th className="px-4 py-3">Availability Match</th>
                <th className="px-4 py-3">Automation Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400 italic">
                    No waiting-list applications.
                  </td>
                </tr>
              ) : (
                rows.map(({ app, position, requestedCode, matchingAvailability }) => {
                  const availableCodes = matchingAvailability?.availableCodes || [];
                  const unavailableCodes = matchingAvailability?.unavailableCodes || [];
                  const canAutoAssign = availableCodes.length > 0;

                  return (
                    <tr key={app.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-50 border border-amber-100 text-amber-700 font-black">
                          {position}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-gray-900 uppercase flex items-center gap-1">
                          <User className="w-3 h-3 text-gray-400" />
                          {app.formData.fullName}
                        </div>
                        <div className="font-mono text-[10px] text-gray-500">
                          {app.formData.emailAddress}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {app.formData.phoneNumber}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-[10px] text-gray-400">Original requested code</div>
                        <div className="font-mono font-bold text-red-800">{requestedCode}</div>
                        <div className="text-[10px] text-gray-500 mt-1">
                          {app.equipmentType || getEquipmentType(requestedCode)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>Date: <span className="font-bold">{app.formData.dateBorrow}</span></div>
                        <div>Duration: <span className="font-bold">{app.formData.duration}</span></div>
                        <div>Return Target: <span className="font-bold">{app.formData.returnTime}</span></div>
                      </td>
                      <td className="px-4 py-3">
                        {canAutoAssign ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold text-[10px]">
                              <PackageCheck className="w-3 h-3" />
                              Available now
                            </span>
                            <div className="font-mono text-[10px] text-emerald-700">
                              {availableCodes.join(', ')}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 bg-gray-50 border border-gray-200 text-gray-500 px-2 py-0.5 rounded font-bold text-[10px]">
                              <Wrench className="w-3 h-3" />
                              No compatible unit yet
                            </span>
                            <div className="font-mono text-[10px] text-gray-400">
                              Tracking {unavailableCodes.length} units
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-[10px] font-bold ${
                            canAutoAssign
                              ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                              : 'bg-amber-50 border-amber-100 text-amber-700'
                          }`}
                        >
                          <RefreshCw className="w-3 h-3" />
                          {canAutoAssign
                            ? 'Supabase trigger will assign automatically'
                            : 'Waiting for equipment return'}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1 max-w-xs">
                          {app.waitingListReason}
                        </p>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
