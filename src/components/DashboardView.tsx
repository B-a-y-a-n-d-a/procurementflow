import React from 'react';
import { 
  TrendingUp, 
  ShieldCheck, 
  FileSpreadsheet, 
  Users, 
  ArrowUpRight, 
  Calendar,
  Layers,
  Award
} from 'lucide-react';
import { Supplier, Tender } from '../types';

interface DashboardViewProps {
  suppliers: Supplier[];
  tenders: Tender[];
  setActiveTab: (tab: string) => void;
}

export default function DashboardView({ suppliers, tenders, setActiveTab }: DashboardViewProps) {
  // Dynamic Calculations
  const totalSuppliersCount = suppliers.length;
  
  // Calculate BEE level distribution
  const beeLevels = Array(9).fill(0).map((_, i) => ({
    level: i + 1,
    count: suppliers.filter(s => s.beeLevel === (i + 1)).length,
  }));

  // BBBEE Compliant (Level 1 to 4) suppliers percentage
  const compliantSuppliers = suppliers.filter(s => s.beeLevel >= 1 && s.beeLevel <= 4);
  const complianceRate = totalSuppliersCount > 0 
    ? Math.round((compliantSuppliers.length / totalSuppliersCount) * 100) 
    : 0;

  // Active tenders count (Open or Evaluation status)
  const activeTenders = tenders.filter(t => t.status === 'Open' || t.status === 'Evaluation');
  
  // Calculate total award spend and BBBEE preferred spend
  // Bids with status 'Awarded' represent direct award spend. 
  // We can also calculate a general corporate procurement ledger from our suppliers list
  const totalSpend = 120500000; // ZAR Ledger
  const bbeCompliantSpend = 94600000; // ZAR Ledger Level 1-4
  const compliantSpendRate = Math.round((bbeCompliantSpend / totalSpend) * 100);

  // Sector breakdown
  const sectors = Array.from(new Set(suppliers.map(s => s.sector)));
  const sectorDistribution = sectors.map(sector => {
    const count = suppliers.filter(s => s.sector === sector).length;
    const percentage = Math.round((count / totalSuppliersCount) * 100);
    return { name: sector, count, percentage };
  }).sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1.5 border-b border-slate-200 pb-4">
        <h1 className="font-sans text-2xl font-bold tracking-tight text-slate-900">Procurement Dashboard</h1>
        <p className="font-sans text-xs text-slate-500">
          Real-time compliance scorecard and preferential procurement spending analysis.
        </p>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="p-4 bg-white border border-slate-200 rounded-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Corporate Spend</span>
            <div className="p-1.5 bg-slate-50 rounded-xs text-slate-600">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="font-mono text-xl font-bold text-slate-900">
              R {(totalSpend / 1000000).toFixed(1)}M
            </span>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-emerald-600 font-medium">
              <span>+12.4% year-on-year</span>
            </div>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="p-4 bg-white border border-slate-200 rounded-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">BBBEE Preferential Spend</span>
            <div className="p-1.5 bg-emerald-50 rounded-xs text-emerald-700">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="font-mono text-xl font-bold text-slate-900">
              R {(bbeCompliantSpend / 1000000).toFixed(1)}M
            </span>
            <div className="flex items-center gap-1.5 mt-1 text-[11px]">
              <span className="text-emerald-600 font-medium">{compliantSpendRate}% of total spend</span>
              <span className="text-slate-400">| Target 70%</span>
            </div>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="p-4 bg-white border border-slate-200 rounded-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Tenders</span>
            <div className="p-1.5 bg-indigo-50 rounded-xs text-[#1F3864]">
              <FileSpreadsheet size={16} />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="font-mono text-xl font-bold text-slate-900">
              {activeTenders.length} <span className="text-xs text-slate-400 font-sans font-normal">Tenders</span>
            </span>
            <div className="flex items-center gap-1.5 mt-1 text-[11px]">
              <span className="text-slate-500 font-medium">
                {tenders.filter(t => t.status === 'Open').length} open for bidding
              </span>
            </div>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="p-4 bg-white border border-slate-200 rounded-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Verified Suppliers</span>
            <div className="p-1.5 bg-amber-50 rounded-xs text-amber-700">
              <Users size={16} />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="font-mono text-xl font-bold text-slate-900">
              {totalSuppliersCount} <span className="text-xs text-slate-400 font-sans font-normal">Vendors</span>
            </span>
            <div className="flex items-center gap-1.5 mt-1 text-[11px]">
              <span className="text-emerald-600 font-medium">{complianceRate}% compliance rate</span>
              <span className="text-slate-400">(Level 1-4)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Visualization Block (Blueprint Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Charts & Visualizers */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chart Card 1: BBBEE Level Distribution */}
          <div className="bg-white border border-slate-200 rounded-sm p-5">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-800">BBBEE Compliance Levels</h3>
                <p className="text-[11px] text-slate-400">Supplier breakdown by SANAS Verification Level (Level 1 is highest)</p>
              </div>
              <span className="text-[11px] font-mono text-slate-400 uppercase">Verification Registry</span>
            </div>

            <div className="space-y-3 pt-2">
              {beeLevels.map((item) => {
                const maxCount = Math.max(...beeLevels.map(l => l.count)) || 1;
                const widthPercent = Math.max(4, (item.count / maxCount) * 100);
                const isCompliant = item.level <= 4;
                
                return (
                  <div key={item.level} className="flex items-center gap-4 text-xs">
                    <div className="w-16 flex-shrink-0 font-medium text-slate-600">
                      Level {item.level}
                    </div>
                    <div className="flex-1 h-5 bg-slate-50 border border-slate-100 rounded-xs overflow-hidden relative">
                      <div 
                        className={`h-full transition-all duration-500 rounded-r-xs 
                          ${isCompliant 
                            ? 'bg-[#1F3864]' 
                            : 'bg-slate-300'}`}
                        style={{ width: `${widthPercent}%` }}
                      />
                      {item.count > 0 && (
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-[10px] font-bold text-slate-700">
                          {item.count} supplier{item.count > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="w-10 text-right font-mono text-slate-400">
                      {totalSuppliersCount > 0 
                        ? `${Math.round((item.count / totalSuppliersCount) * 100)}%` 
                        : '0%'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chart Card 2: Sector Compliance Analysis */}
          <div className="bg-white border border-slate-200 rounded-sm p-5">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Sector Compliance Spread</h3>
                <p className="text-[11px] text-slate-400">Distribution of registered suppliers across various charter sectors</p>
              </div>
              <Layers size={16} className="text-slate-400" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sectorDistribution.map((sector) => (
                <div key={sector.name} className="p-3 bg-slate-50/50 border border-slate-200/60 rounded-xs flex flex-col justify-between">
                  <span className="text-xs font-semibold text-slate-700">{sector.name}</span>
                  <div className="flex justify-between items-baseline mt-2.5">
                    <span className="text-lg font-mono font-bold text-[#1F3864]">
                      {sector.count} <span className="text-xs text-slate-400 font-sans font-normal">Suppliers</span>
                    </span>
                    <span className="text-xs font-mono text-slate-400">{sector.percentage}% share</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1 mt-2 rounded-full overflow-hidden">
                    <div className="bg-[#1F3864] h-full" style={{ width: `${sector.percentage}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Column: Circular Preferential Gauge & Audit Timeline */}
        <div className="space-y-6">
          {/* Target Preferential Gauge */}
          <div className="bg-white border border-slate-200 rounded-sm p-5 flex flex-col items-center justify-center text-center">
            <h3 className="text-sm font-bold text-slate-800 self-start mb-1">Preferential Target</h3>
            <p className="text-[11px] text-slate-400 self-start mb-4">Percentage of spend from Level 1-4 black-owned companies</p>
            
            <div className="relative w-36 h-36 flex items-center justify-center my-2">
              {/* Custom SVG Circle Ring Gauge */}
              <svg className="w-full h-full transform -rotate-90">
                <circle 
                  cx="72" 
                  cy="72" 
                  r="58" 
                  stroke="#f1f5f9" 
                  strokeWidth="10" 
                  fill="transparent" 
                />
                <circle 
                  cx="72" 
                  cy="72" 
                  r="58" 
                  stroke="#1F3864" 
                  strokeWidth="10" 
                  fill="transparent" 
                  strokeDasharray={364.4}
                  strokeDashoffset={364.4 - (364.4 * compliantSpendRate) / 100}
                  className="transition-all duration-1000 ease-out"
                  strokeLinecap="square"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="font-mono text-2xl font-bold text-slate-800">{compliantSpendRate}%</span>
                <span className="text-[9px] font-semibold text-slate-400 tracking-wider uppercase">Achieved</span>
              </div>
            </div>

            <div className="mt-3 py-1.5 px-4 bg-emerald-50 text-emerald-800 text-[11px] font-semibold rounded-xs border border-emerald-200/50 w-full">
              Target R75.3M (70%) Exceeded By R19.3M
            </div>
          </div>

          {/* Compliance Audit Log */}
          <div className="bg-white border border-slate-200 rounded-sm p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">National Compliance Log</h3>
            
            <div className="relative border-l border-slate-200 pl-4 ml-2.5 space-y-5">
              {/* Event 1 */}
              <div className="relative">
                <div className="absolute -left-[24.5px] top-1 bg-indigo-50 border border-[#1F3864] text-[#1F3864] w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-bold">
                  1
                </div>
                <div>
                  <span className="text-[10px] font-mono text-slate-400 block">JULY 2026</span>
                  <span className="text-xs font-bold text-slate-800 block">Tender Closed - RT102-2026</span>
                  <span className="text-xs text-slate-500">SITA Secure Cloud Network procurement bidding officially closed.</span>
                  <button 
                    onClick={() => setActiveTab('tenders')}
                    className="mt-1 text-xs text-[#1F3864] hover:underline font-semibold flex items-center gap-0.5"
                  >
                    Go to tender evaluation <ArrowUpRight size={12} />
                  </button>
                </div>
              </div>

              {/* Event 2 */}
              <div className="relative">
                <div className="absolute -left-[24.5px] top-1 bg-amber-50 border border-amber-500 text-amber-700 w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-bold">
                  2
                </div>
                <div>
                  <span className="text-[10px] font-mono text-slate-400 block">JUNE 2026</span>
                  <span className="text-xs font-bold text-slate-800 block">BBBEE Audit Warning</span>
                  <span className="text-xs text-slate-500">Apex Consulting certificate has expired. Status changed to Unverified.</span>
                  <button 
                    onClick={() => setActiveTab('suppliers')}
                    className="mt-1 text-xs text-[#1F3864] hover:underline font-semibold flex items-center gap-0.5"
                  >
                    View supplier directory <ArrowUpRight size={12} />
                  </button>
                </div>
              </div>

              {/* Event 3 */}
              <div className="relative">
                <div className="absolute -left-[24.5px] top-1 bg-emerald-50 border border-emerald-500 text-emerald-700 w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-bold">
                  3
                </div>
                <div>
                  <span className="text-[10px] font-mono text-slate-400 block">MAY 2026</span>
                  <span className="text-xs font-bold text-slate-800 block">Vukani Tech Recertified</span>
                  <span className="text-xs text-slate-500">Sanas Auditor successfully validated Vukani Tech at Level 1 status.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
