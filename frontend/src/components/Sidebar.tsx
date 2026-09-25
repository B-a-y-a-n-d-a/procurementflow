import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  ShieldCheck, 
  FileSpreadsheet, 
  Menu, 
  X,
  FileBadge,
  TrendingUp
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export default function Sidebar({ activeTab, setActiveTab, isOpen, setIsOpen }: SidebarProps) {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Procurement Dashboard',
      icon: LayoutDashboard,
      description: 'Spend analytics & compliance targets',
    },
    {
      id: 'suppliers',
      label: 'Supplier Directory',
      icon: Users,
      description: 'Vendor compliance & profiles',
    },
    {
      id: 'verification',
      label: 'BBBEE Verification Hub',
      icon: ShieldCheck,
      description: 'Scorecard audit & level generator',
    },
    {
      id: 'tenders',
      label: 'Tender Evaluation Board',
      icon: FileSpreadsheet,
      description: 'PPPFA 80/20 & 90/10 solver',
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs lg:hidden transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        id="sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-white border-r border-slate-200 transition-all duration-300 
          ${isOpen ? 'translate-x-0 w-[265px]' : '-translate-x-full lg:translate-x-0 lg:w-[265px]'}
          md:translate-x-0 md:w-[72px] lg:w-[265px]`}
      >
        {/* Header Branding */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-100">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex items-center justify-center w-9 h-9 bg-[#1F3864] text-white rounded-xs flex-shrink-0 font-bold tracking-tight">
              P
            </div>
            <div className="flex flex-col select-none md:hidden lg:flex">
              <span className="font-sans text-sm font-bold text-[#1F3864] uppercase tracking-wide">ProcurementFlow</span>
              <span className="font-mono text-[9px] text-slate-400">SA PROCUREMENT SUITE</span>
            </div>
          </div>
          <button 
            id="close-sidebar-btn"
            onClick={() => setIsOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-xs md:hidden"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-start gap-3.5 p-3 text-left transition-all duration-150 rounded-xs relative group
                  ${isActive 
                    ? 'bg-slate-50 text-[#1F3864] font-medium border-l-[3.5px] border-[#1F3864] pl-[8.5px]' 
                    : 'text-slate-500 hover:bg-slate-50/50 hover:text-slate-800'
                  }`}
              >
                <IconComponent 
                  size={20} 
                  className={`flex-shrink-0 mt-0.5 transition-colors
                    ${isActive ? 'text-[#1F3864]' : 'text-slate-400 group-hover:text-slate-600'}`} 
                />
                
                {/* Text for expanded states */}
                <div className="flex flex-col min-w-0 md:hidden lg:flex">
                  <span className="text-sm font-sans tracking-tight leading-snug">{item.label}</span>
                  <span className="text-[10px] text-slate-400 line-clamp-1 font-sans">{item.description}</span>
                </div>

                {/* Tooltip for collapsed tablet view */}
                <div className="hidden md:group-hover:flex lg:group-hover:hidden absolute left-14 top-1/2 -translate-y-1/2 bg-[#1F3864] text-white text-xs px-2.5 py-1.5 rounded-sm whitespace-nowrap z-50 shadow-md">
                  <div className="font-bold">{item.label}</div>
                  <div className="text-[9px] opacity-85 mt-0.5">{item.description}</div>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Footer info/Status info (Strictly objective compliance detail) */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 md:hidden lg:block select-none">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-sans text-[11px] font-semibold text-slate-700 tracking-wide">PPPFA / SANAS RULES ACTIVE</span>
          </div>
          <p className="font-mono text-[10px] text-slate-400 leading-normal">
            National Treasury Ruleset Ver. 2026.1<br />
            System Default Currency: ZAR (R)
          </p>
        </div>
      </aside>
    </>
  );
}
