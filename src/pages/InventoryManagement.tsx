import { useState } from 'react';
import { useAppState, type OscilloscopeRow, type ComponentType } from '../context';
import { 
  Boxes, 
  ChevronDown, 
  ChevronRight, 
  Layers, 
  Search,
  ClipboardList,
  Wrench,
  CheckCircle
} from 'lucide-react';

interface InventoryManagementProps {
  userRole: string;
  currentUserEmail: string;
}

export default function InventoryManagement({ userRole, currentUserEmail }: InventoryManagementProps) {
  // Added 'updateEquipmentStatus' pulled surgically from your global context
  const { componentInventory, equipmentRows, applicationQueue, updateEquipmentStatus } = useAppState();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Track which parent equipment models are expanded to show their unique serial sub-ledgers
  const [expandedModels, setExpandedModels] = useState<Record<string, boolean>>({
    'Digital Oscilloscope': true, // Keep it open by default to display your oscilloscope rows beautifully
  });

  const toggleModelExpand = (modelName: string) => {
    setExpandedModels(prev => ({
      ...prev,
      [modelName]: !prev[modelName]
    }));
  };

  // Help calculate the live statuses of individual codes by looking up active application data
  const getActiveBorrower = (equipmentCode: string) => {
    const activeApp = applicationQueue.find(
      app => app.equipmentCode === equipmentCode && (app.stage === 'PENDING' || app.stage === 'ACTIVE_BORROW')
    );
    return activeApp ? activeApp.formData : null;
  };

  // Helper styling functions for unique asset statuses
  const getStatusBadge = (status: OscilloscopeRow['status'] | 'BROKEN' | 'CALIBRATING') => {
    switch (status) {
      case 'AVAILABLE':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            In Stock / Available
          </span>
        );
      case 'BORROWED':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-700 rounded-full border border-rose-200 inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            In Student Possession
          </span>
        );
      case 'PENDING PICKUP':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold bg-amber-50 text-amber-700 rounded-full border border-amber-200 inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Awaiting Gatekeeper Sign-off
          </span>
        );
      case 'RETURN_PENDING':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 rounded-full border border-blue-200 inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            Return Reviewing Queue
          </span>
        );
      // Added visually striking badges for your new custom hardware states
      case 'BROKEN':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded-full border border-red-300 inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
            Broken / Down
          </span>
        );
      case 'CALIBRATING':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold bg-orange-100 text-orange-800 rounded-full border border-orange-300 inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
            Under Calibration
          </span>
        );
      default:
        return <span className="text-gray-500 text-xs">{status}</span>;
    }
  };

  // Filter models based on search query
  const filteredInventory = componentInventory.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Upper Status Title Banner Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Boxes className="w-7 h-7 text-utm-maroon" />
            Master Inventory Management
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Faculty of Electrical Engineering — Aggregated Stock Analytics & Individual Physical Asset Tracking Ledger.
          </p>
        </div>
        
        {/* Search Bar Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search equipment type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-utm-maroon focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* PARENT TABLE: Aggregated Equipment Stock Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-utm-maroon-dark to-utm-maroon px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Layers className="w-5 h-5 text-utm-gold" />
            <h3 className="font-semibold text-base">General Equipment Categories Summary Spreadsheet</h3>
          </div>
          <span className="bg-white/10 text-utm-gold text-xs font-mono px-2.5 py-1 rounded border border-white/10">
            SYSTEM AUDIT TIME: {new Date().toISOString().split('T')[0]}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase text-[11px] font-bold tracking-wider">
                <th className="py-3 px-6 w-12 text-center">View Units</th>
                <th className="py-3 px-6">Equipment Model Type</th>
                <th className="py-3 px-6 text-center">Total Registered Stock</th>
                <th className="py-3 px-6 text-center text-rose-700 bg-rose-50/50">Units In Possession</th>
                <th className="py-3 px-6 text-center text-amber-700 bg-amber-50/50">Pending Verification</th>
                <th className="py-3 px-6 text-center text-emerald-700 bg-emerald-50/50">Net Available On Shelf</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
              {filteredInventory.map((item) => {
                const isExpanded = !!expandedModels[item.name];
                
                // For demonstration, let's derive pending values using the queue or existing context structure
                // Fallback dynamically from your initialInventory metrics structure safely
                const pendingUnits = item.name === 'Digital Oscilloscope' 
                  ? equipmentRows.filter(r => r.status === 'PENDING PICKUP' || r.status === 'RETURN_PENDING').length
                  : 0;
                
                // Pure stock math: Available on Shelf = Total - (Out + Pending)
                const onShelfStock = item.totalUnits - (item.unitsOut + pendingUnits);

                return (
                  <tr key={item.name} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-4 px-6 text-center">
                      <button 
                        onClick={() => toggleModelExpand(item.name)}
                        className="p-1 rounded text-gray-400 hover:text-utm-maroon hover:bg-gray-100 transition-colors"
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="py-4 px-6 font-semibold text-gray-900">{item.name}</td>
                    <td className="py-4 px-6 text-center font-mono font-medium">{item.totalUnits} items</td>
                    <td className="py-4 px-6 text-center font-mono text-rose-700 bg-rose-50/30 font-semibold">{item.unitsOut} x</td>
                    <td className="py-4 px-6 text-center font-mono text-amber-700 bg-amber-50/30 font-medium">{pendingUnits} x</td>
                    <td className="py-4 px-6 text-center bg-emerald-50/30">
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-md font-mono font-bold text-xs">
                        {onShelfStock} / {item.totalUnits} Available
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CHILD SUB-TABLES: Segmented Absolute Item Unit Ledgers */}
      {filteredInventory.map((item) => {
        const isExpanded = !!expandedModels[item.name];
        if (!isExpanded) return null;

        // Filter out individual hardware pieces belonging to this equipment family.
        // Currently, your initial rows represent 'Digital Oscilloscope' units starting with code 'AGT'
        const relevantUnits = item.name === 'Digital Oscilloscope' 
          ? equipmentRows 
          : []; // Placeholder for alternative items inside componentInventory array

        return (
          <div key={`${item.name}-child`} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden border-l-4 border-l-utm-maroon animate-slideDown">
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-utm-maroon" />
                <h4 className="text-sm font-bold text-gray-800">
                  Granular Traceability Assets Under: <span className="text-utm-maroon">{item.name}</span>
                </h4>
              </div>
              <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded font-medium">
                {relevantUnits.length || 0} Registered Traceable Codes
              </span>
            </div>

            {relevantUnits.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400 italic">
                No singular asset codes registered under this model family. System default assumes virtual bulk storage tracking.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-100/50 border-b border-gray-200 text-gray-500 uppercase text-[10px] font-bold tracking-wider">
                      <th className="py-2.5 px-6">Hardware Item Code</th>
                      <th className="py-2.5 px-6">Assigned Laboratory Base</th>
                      <th className="py-2.5 px-6 text-center">Last Calibration / Audit</th>
                      <th className="py-2.5 px-6 text-center">Absolute Lifespan Status</th>
                      <th className="py-2.5 px-6">Active Borrower Details</th>
                      {/* SURGICAL ADDITION: Added dedicated Actions header column for staff control */}
                      <th className="py-2.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-xs text-gray-600">
                    {relevantUnits.map((row) => {
                      const borrower = getActiveBorrower(row.code);
                      return (
                        <tr key={row.code} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-6 font-mono font-bold text-utm-maroon text-sm">{row.code}</td>
                          <td className="py-3 px-6 font-medium text-gray-700">{row.labLocation}</td>
                          <td className="py-3 px-6 text-center font-mono text-gray-500">{row.lastDateUsed}</td>
                          <td className="py-3 px-6 text-center">{getStatusBadge(row.status)}</td>
                          <td className="py-3 px-6">
                            {borrower ? (
                              <div className="flex flex-col">
                                <span className="font-semibold text-gray-900 text-[11px] uppercase">{borrower.fullName}</span>
                                <span className="text-gray-400 font-mono text-[10px]">{borrower.emailAddress} &bull; {borrower.yearCourse}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">No Active Borrow Records</span>
                            )}
                          </td>
                          {/* SURGICAL ADDITION: Inline conditional staff operation controls */}
                          <td className="py-3 px-6 text-right">
                            {row.status === 'AVAILABLE' ? (
                              <div className="inline-flex gap-1.5">
                                <button
                                  onClick={() => updateEquipmentStatus?.(row.code, 'BROKEN')}
                                  className="px-2 py-1 font-semibold text-[11px] bg-red-50 text-red-600 hover:bg-red-100 rounded border border-red-200 transition-all flex items-center gap-1"
                                  title="Mark item as broken"
                                >
                                  <Wrench className="w-3 h-3" />
                                  Broken
                                </button>
                                <button
                                  onClick={() => updateEquipmentStatus?.(row.code, 'CALIBRATING')}
                                  className="px-2 py-1 font-semibold text-[11px] bg-orange-50 text-orange-600 hover:bg-orange-100 rounded border border-orange-200 transition-all"
                                  title="Send item for calibration"
                                >
                                  Calibrate
                                </button>
                              </div>
                            ) : (row.status === 'BROKEN' || row.status === 'CALIBRATING') ? (
                              <button
                                onClick={() => updateEquipmentStatus?.(row.code, 'AVAILABLE')}
                                className="px-2 py-1 font-semibold text-[11px] bg-emerald-600 text-white hover:bg-emerald-700 rounded shadow-sm transition-all inline-flex items-center gap-1"
                              >
                                <CheckCircle className="w-3 h-3" />
                                Finish Fix/Calibrate
                              </button>
                            ) : (
                              // Disabled block placeholder if item is currently borrowed/pending pickup
                              <span className="text-[10px] font-medium text-gray-400 italic bg-gray-50 px-2 py-1 rounded border border-gray-100">
                                Asset Locked
                              </span>
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
        );
      })}
    </div>
  );
}