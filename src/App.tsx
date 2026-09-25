import React, { useState, useEffect } from 'react';
import { Menu, Bell, User, Calendar, ShieldAlert, Building2 } from 'lucide-react';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import SupplierDirectory from './components/SupplierDirectory';
import VerificationHub from './components/VerificationHub';
import TenderBoard from './components/TenderBoard';
import { 
  Supplier, 
  Tender, 
  Bid, 
  DEFAULT_SUPPLIERS, 
  DEFAULT_TENDERS 
} from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // Initialize Suppliers State
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    try {
      const stored = localStorage.getItem('procuresouth_suppliers_v1');
      return stored ? JSON.parse(stored) : DEFAULT_SUPPLIERS;
    } catch (e) {
      console.error("Failed to parse stored suppliers, falling back to defaults.", e);
      return DEFAULT_SUPPLIERS;
    }
  });

  // Initialize Tenders State
  const [tenders, setTenders] = useState<Tender[]>(() => {
    try {
      const stored = localStorage.getItem('procuresouth_tenders_v1');
      return stored ? JSON.parse(stored) : DEFAULT_TENDERS;
    } catch (e) {
      console.error("Failed to parse stored tenders, falling back to defaults.", e);
      return DEFAULT_TENDERS;
    }
  });

  // Save states to Local Storage on change
  useEffect(() => {
    localStorage.setItem('procuresouth_suppliers_v1', JSON.stringify(suppliers));
  }, [suppliers]);

  useEffect(() => {
    localStorage.setItem('procuresouth_tenders_v1', JSON.stringify(tenders));
  }, [tenders]);

  // Actions
  const handleAddSupplier = (newSupplier: Supplier) => {
    setSuppliers(prev => {
      // Avoid duplicate registration numbers if possible, or just append
      const exists = prev.some(s => s.registrationNumber === newSupplier.registrationNumber);
      if (exists) {
        // Update existing record
        return prev.map(s => s.registrationNumber === newSupplier.registrationNumber ? newSupplier : s);
      }
      return [newSupplier, ...prev];
    });
  };

  const handleAddTender = (newTender: Tender) => {
    setTenders(prev => [newTender, ...prev]);
  };

  const handleAddBid = (tenderId: string, newBid: Bid) => {
    setTenders(prevTenders => {
      return prevTenders.map(tender => {
        if (tender.id !== tenderId) return tender;
        
        // Append or replace bid for this supplier
        const existingBidIndex = tender.bids.findIndex(b => b.supplierId === newBid.supplierId);
        let updatedBids = [...tender.bids];
        if (existingBidIndex >= 0) {
          updatedBids[existingBidIndex] = newBid;
        } else {
          updatedBids.push(newBid);
        }

        return {
          ...tender,
          bids: updatedBids
        };
      });
    });
  };

  // Render Core Views based on Active Tab
  const renderView = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView 
            suppliers={suppliers} 
            tenders={tenders} 
            setActiveTab={setActiveTab} 
          />
        );
      case 'suppliers':
        return (
          <SupplierDirectory 
            suppliers={suppliers} 
            onAddSupplier={handleAddSupplier} 
          />
        );
      case 'verification':
        return (
          <VerificationHub 
            suppliers={suppliers} 
            onAddSupplier={handleAddSupplier} 
          />
        );
      case 'tenders':
        return (
          <TenderBoard 
            tenders={tenders} 
            suppliers={suppliers} 
            onAddTender={handleAddTender} 
            onAddBid={handleAddBid} 
          />
        );
      default:
        return (
          <DashboardView 
            suppliers={suppliers} 
            tenders={tenders} 
            setActiveTab={setActiveTab} 
          />
        );
    }
  };

  return (
    <div id="app-container" className="min-h-screen bg-[#F8FAFC] flex font-sans antialiased text-slate-800">
      
      {/* Sidebar Navigation Left Rail */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isOpen={sidebarOpen} 
        setIsOpen={setSidebarOpen} 
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-[72px] lg:pl-[265px]">
        
        {/* Top Header Controls */}
        <header id="app-header" className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 select-none">
          
          {/* Mobile Menu Toggle button */}
          <div className="flex items-center gap-3">
            <button 
              id="mobile-menu-toggle"
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 text-slate-500 hover:text-slate-800 rounded-xs md:hidden"
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>
            
            {/* Context Breadcrumb */}
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-400 font-mono tracking-wider uppercase">
              <span>National Procurement Portal</span>
              <span>/</span>
              <span className="text-[#1F3864] font-bold">{activeTab.replace('-', ' ')}</span>
            </div>
          </div>

          {/* Quick Stats / Environment Details */}
          <div className="flex items-center gap-4">
            
            {/* Treasury Alert Indicator */}
            <div className="hidden lg:flex items-center gap-2 py-1 px-3 bg-slate-50 border border-slate-200/80 rounded-xs text-[10px] text-slate-500 font-mono">
              <Calendar size={13} className="text-[#1F3864]" />
              <span>ZAR LEDGER ONLINE</span>
            </div>

            {/* Notifications */}
            <button 
              id="notification-bell"
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full relative transition-colors"
              title="Notifications"
            >
              <Bell size={18} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#1F3864] rounded-full"></span>
            </button>

            {/* User Badge */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-[#1F3864] font-bold text-xs">
                JD
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-700 leading-none">J. Du Plessis</span>
                <span className="text-[9px] font-medium text-slate-400 font-mono mt-0.5 uppercase tracking-wider">Treasury Officer</span>
              </div>
            </div>
          </div>
        </header>

        {/* Primary Screen Content */}
        <main id="main-content" className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          {renderView()}
        </main>

        {/* Minimal Blueprint Footer */}
        <footer className="py-4 border-t border-slate-200 bg-white text-center font-mono text-[9px] text-slate-400 select-none">
          <p>
            PROCU RE SOUTH VER. 2026.1 // PREFERENTIAL PROCUREMENT POLICY FRAMEWORK ACT (ACT NO. 5 OF 2000) REGISTERED PLATFORM.
          </p>
        </footer>
      </div>

    </div>
  );
}
