import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  X, 
  ShieldCheck, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase,
  AlertTriangle,
  Award,
  BookOpen
} from 'lucide-react';
import { Supplier, SupplierStatus, determineBeeLevel } from '../types';

interface SupplierDirectoryProps {
  suppliers: Supplier[];
  onAddSupplier: (supplier: Supplier) => void;
}

export default function SupplierDirectory({ suppliers, onAddSupplier }: SupplierDirectoryProps) {
  // Filters & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSector, setSelectedSector] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedBeeLevel, setSelectedBeeLevel] = useState<string>('All');

  // Supplier Drawer State
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);

  // Add Supplier Form State
  const [name, setName] = useState('');
  const [regNo, setRegNo] = useState('');
  const [sector, setSector] = useState('ICT Sector');
  const [location, setLocation] = useState('Johannesburg, Gauteng');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<SupplierStatus>('Approved');
  
  // Dynamic Score breakdown state for form
  const [ownership, setOwnership] = useState(20);
  const [management, setManagement] = useState(14);
  const [skills, setSkills] = useState(15);
  const [esd, setEsd] = useState(30);
  const [sed, setSed] = useState(4);

  const [blackOwned, setBlackOwned] = useState(51);
  const [blackWomenOwned, setBlackWomenOwned] = useState(30);

  // Form Computed Score
  const formTotalScore = ownership + management + skills + esd + sed;
  const formBeeLevel = determineBeeLevel(formTotalScore);

  // Filtered Suppliers List
  const filteredSuppliers = suppliers.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.registrationNumber.includes(searchTerm);
    const matchesSector = selectedSector === 'All' || s.sector === selectedSector;
    const matchesStatus = selectedStatus === 'All' || s.status === selectedStatus;
    const matchesBee = selectedBeeLevel === 'All' || s.beeLevel === Number(selectedBeeLevel);

    return matchesSearch && matchesSector && matchesStatus && matchesBee;
  });

  const uniqueSectors = ['All', ...Array.from(new Set(suppliers.map(s => s.sector)))];

  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !regNo.trim()) return;

    const certNum = `BEE-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000) + 10000}`;
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 1);

    const newSupplier: Supplier = {
      id: `sup-${Date.now()}`,
      name,
      registrationNumber: regNo,
      beeLevel: formBeeLevel,
      blackOwnership: blackOwned,
      blackWomenOwnership: blackWomenOwned,
      status,
      certificateNumber: certNum,
      expiryDate: expiry.toISOString().split('T')[0],
      sector,
      contactEmail: email,
      contactPhone: phone,
      totalScore: formTotalScore,
      location,
      breakdown: {
        ownership,
        managementControl: management,
        skillsDevelopment: skills,
        enterpriseSupplierDev: esd,
        socioEconomicDev: sed
      }
    };

    onAddSupplier(newSupplier);
    setShowAddSupplierModal(false);
    
    // Reset Form Fields
    setName('');
    setRegNo('');
    setEmail('');
    setPhone('');
  };

  const getLevelBadgeStyles = (level: number) => {
    if (level === 1) return 'bg-indigo-900 text-indigo-100 border-indigo-700';
    if (level <= 4) return 'bg-[#1F3864]/10 text-[#1F3864] border-[#1F3864]/20';
    if (level <= 8) return 'bg-amber-50 text-amber-800 border-amber-200';
    return 'bg-rose-50 text-rose-800 border-rose-200';
  };

  const getStatusBadgeStyles = (status: SupplierStatus) => {
    switch (status) {
      case 'Approved':
        return 'bg-emerald-50 text-emerald-800 border border-emerald-200';
      case 'Pending':
        return 'bg-amber-50 text-amber-800 border border-amber-200';
      case 'Expired':
        return 'bg-rose-50 text-rose-800 border border-rose-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="font-sans text-2xl font-bold tracking-tight text-slate-900">Supplier Directory</h1>
          <p className="font-sans text-xs text-slate-500">
            Corporate database of SANAS-audited suppliers, equity ownership details, and compliance credentials.
          </p>
        </div>
        
        <button
          id="open-add-supplier-btn"
          onClick={() => setShowAddSupplierModal(true)}
          className="bg-[#1F3864] hover:bg-[#1a3055] text-white py-2 px-3.5 text-xs font-semibold rounded-xs flex items-center justify-center gap-2 flex-shrink-0 transition-colors"
        >
          <Plus size={15} /> Add Supplier Profile
        </button>
      </div>

      {/* Advanced Filter Block */}
      <div className="bg-white border border-slate-200 rounded-sm p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input 
            type="text"
            id="supplier-search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs p-2 pl-9 border border-slate-200 rounded-sm focus:border-[#1F3864] outline-none"
            placeholder="Search by vendor name or registration..."
          />
        </div>

        {/* Sector Filter */}
        <div>
          <select 
            id="sector-filter"
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className="w-full text-xs p-2 border border-slate-200 rounded-sm bg-white outline-none"
          >
            <option value="All">All Charter Sectors</option>
            {uniqueSectors.filter(s => s !== 'All').map(sec => (
              <option key={sec} value={sec}>{sec}</option>
            ))}
          </select>
        </div>

        {/* Level Filter */}
        <div>
          <select 
            id="bee-level-filter"
            value={selectedBeeLevel}
            onChange={(e) => setSelectedBeeLevel(e.target.value)}
            className="w-full text-xs p-2 border border-slate-200 rounded-sm bg-white outline-none"
          >
            <option value="All">All BBBEE Levels</option>
            {[1,2,3,4,5,6,7,8,9].map(l => (
              <option key={l} value={l}>Level {l} Contributor</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select 
            id="status-filter"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full text-xs p-2 border border-slate-200 rounded-sm bg-white outline-none"
          >
            <option value="All">All Audit Statuses</option>
            <option value="Approved">Approved</option>
            <option value="Pending">Pending Audit</option>
            <option value="Expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Supplier Grid Table */}
      <div className="bg-white border border-slate-200 rounded-sm overflow-hidden">
        {filteredSuppliers.length === 0 ? (
          <div className="p-8 text-center select-none text-slate-400 font-sans text-xs">
            No suppliers found matching the criteria. Adjust filters or register a new company profile.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-3 font-sans">Company Name</th>
                  <th className="p-3 font-sans">Registration No.</th>
                  <th className="p-3 font-sans">Charter Sector</th>
                  <th className="p-3 font-sans">Equity Ownership</th>
                  <th className="p-3 font-sans text-center">BEE Level</th>
                  <th className="p-3 font-sans text-center">Audit Status</th>
                  <th className="p-3 font-sans text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredSuppliers.map((sup) => (
                  <tr key={sup.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3">
                      <button 
                        onClick={() => setSelectedSupplier(sup)}
                        className="font-bold text-slate-800 hover:text-[#1F3864] hover:underline text-left outline-none block"
                      >
                        {sup.name}
                      </button>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{sup.location}</span>
                    </td>
                    <td className="p-3 font-mono text-slate-600">{sup.registrationNumber}</td>
                    <td className="p-3 text-slate-600 font-medium">{sup.sector}</td>
                    <td className="p-3">
                      <div className="flex flex-col">
                        <span className="text-slate-700 font-medium">Black: <strong className="font-mono">{sup.blackOwnership}%</strong></span>
                        <span className="text-[10px] text-slate-400">Women: <strong className="font-mono">{sup.blackWomenOwnership}%</strong></span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`inline-block px-2.5 py-0.5 font-mono text-[10px] font-bold border rounded-sm ${getLevelBadgeStyles(sup.beeLevel)}`}>
                        Level {sup.beeLevel}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`inline-block px-2.5 py-0.5 font-sans text-[9px] font-bold rounded-full ${getStatusBadgeStyles(sup.status)}`}>
                        {sup.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedSupplier(sup)}
                        className="bg-slate-50 hover:bg-[#1F3864] hover:text-white border border-slate-200 hover:border-[#1F3864] py-1 px-2.5 text-[10px] font-semibold rounded-xs transition-all"
                      >
                        Audit Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAIL DRAWER / RIGHT PANEL SLIDE IN */}
      {selectedSupplier && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/30 backdrop-blur-xs flex justify-end animate-fade-in">
          <div className="w-full max-w-md bg-white border-l border-slate-200 flex flex-col h-full shadow-2xl animate-slide-left">
            {/* Drawer Header */}
            <div className="bg-[#1F3864] text-white p-4 flex justify-between items-center flex-shrink-0">
              <div className="flex items-center gap-2">
                <Building2 size={18} />
                <span className="text-xs font-bold uppercase tracking-wider">Audit Profile Details</span>
              </div>
              <button 
                id="close-supplier-drawer"
                onClick={() => setSelectedSupplier(null)} 
                className="text-white hover:text-slate-200 p-1"
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              
              {/* Title Header */}
              <div>
                <h2 className="text-base font-bold text-slate-900 leading-snug">{selectedSupplier.name}</h2>
                <span className="font-mono text-xs text-slate-400 block mt-0.5">Reg No. {selectedSupplier.registrationNumber}</span>
              </div>

              {/* Status Banner */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xs">
                  <span className="text-[10px] font-semibold text-slate-400 block uppercase">BBBEE Level</span>
                  <span className="font-bold text-slate-800 text-sm">LEVEL {selectedSupplier.beeLevel}</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xs">
                  <span className="text-[10px] font-semibold text-slate-400 block uppercase">Audit Standing</span>
                  <span className="font-bold text-slate-800 text-sm uppercase">{selectedSupplier.status}</span>
                </div>
              </div>

              {/* Scorecard Detailed Graph Lines */}
              <div className="space-y-3.5 border border-slate-200 rounded-xs p-4 bg-slate-50/50">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-[#1F3864]" /> Scorecard Elements
                </span>

                {/* Score items */}
                <div className="space-y-3 text-xs">
                  {/* Item 1 */}
                  <div>
                    <div className="flex justify-between font-medium text-slate-600 mb-1">
                      <span>Ownership</span>
                      <span className="font-mono font-bold text-slate-800">{selectedSupplier.breakdown.ownership} / 25</span>
                    </div>
                    <div className="h-2 bg-slate-200/60 rounded-full overflow-hidden">
                      <div className="bg-[#1F3864] h-full" style={{ width: `${(selectedSupplier.breakdown.ownership / 25) * 100}%` }} />
                    </div>
                  </div>

                  {/* Item 2 */}
                  <div>
                    <div className="flex justify-between font-medium text-slate-600 mb-1">
                      <span>Management Control</span>
                      <span className="font-mono font-bold text-slate-800">{selectedSupplier.breakdown.managementControl} / 19</span>
                    </div>
                    <div className="h-2 bg-slate-200/60 rounded-full overflow-hidden">
                      <div className="bg-[#1F3864] h-full" style={{ width: `${(selectedSupplier.breakdown.managementControl / 19) * 100}%` }} />
                    </div>
                  </div>

                  {/* Item 3 */}
                  <div>
                    <div className="flex justify-between font-medium text-slate-600 mb-1">
                      <span>Skills Development</span>
                      <span className="font-mono font-bold text-slate-800">{selectedSupplier.breakdown.skillsDevelopment} / 20</span>
                    </div>
                    <div className="h-2 bg-slate-200/60 rounded-full overflow-hidden">
                      <div className="bg-[#1F3864] h-full" style={{ width: `${(selectedSupplier.breakdown.skillsDevelopment / 20) * 100}%` }} />
                    </div>
                  </div>

                  {/* Item 4 */}
                  <div>
                    <div className="flex justify-between font-medium text-slate-600 mb-1">
                      <span>Enterprise & Supplier Dev</span>
                      <span className="font-mono font-bold text-slate-800">{selectedSupplier.breakdown.enterpriseSupplierDev} / 40</span>
                    </div>
                    <div className="h-2 bg-slate-200/60 rounded-full overflow-hidden">
                      <div className="bg-[#1F3864] h-full" style={{ width: `${(selectedSupplier.breakdown.enterpriseSupplierDev / 40) * 100}%` }} />
                    </div>
                  </div>

                  {/* Item 5 */}
                  <div>
                    <div className="flex justify-between font-medium text-slate-600 mb-1">
                      <span>Socio-Economic Development</span>
                      <span className="font-mono font-bold text-slate-800">{selectedSupplier.breakdown.socioEconomicDev} / 5</span>
                    </div>
                    <div className="h-2 bg-slate-200/60 rounded-full overflow-hidden">
                      <div className="bg-[#1F3864] h-full" style={{ width: `${(selectedSupplier.breakdown.socioEconomicDev / 5) * 100}%` }} />
                    </div>
                  </div>

                  {/* Total indicator */}
                  <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm text-slate-800 font-mono">
                    <span>Aggregate Score:</span>
                    <span>{selectedSupplier.totalScore} / 109.00 pts</span>
                  </div>
                </div>
              </div>

              {/* Demographics Details */}
              <div className="space-y-2 text-xs">
                <span className="text-xs font-bold text-slate-700 uppercase block tracking-wider">Equity Demographics</span>
                <div className="p-3 border border-slate-100 rounded-xs space-y-1.5 bg-slate-50/20">
                  <div className="flex justify-between text-slate-600">
                    <span>Black Ownership Percentage:</span>
                    <strong className="font-mono text-slate-800">{selectedSupplier.blackOwnership}%</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Black Women Ownership:</span>
                    <strong className="font-mono text-slate-800">{selectedSupplier.blackWomenOwnership}%</strong>
                  </div>
                </div>
              </div>

              {/* Contact Credentials */}
              <div className="space-y-3.5 text-xs">
                <span className="text-xs font-bold text-slate-700 uppercase block tracking-wider">Compliance & Contacts</span>
                
                <div className="space-y-2 font-sans text-slate-600">
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-slate-400 flex-shrink-0" />
                    <span>{selectedSupplier.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-slate-400 flex-shrink-0" />
                    <span>{selectedSupplier.contactEmail}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-slate-400 flex-shrink-0" />
                    <span>{selectedSupplier.contactPhone}</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                    <ShieldCheck size={14} className="text-emerald-500 flex-shrink-0" />
                    <span className="font-mono text-[10px] text-slate-500">Certificate: {selectedSupplier.certificateNumber}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Briefcase size={14} className="text-slate-400 flex-shrink-0" />
                    <span className="text-slate-500">Sectors Covered: {selectedSupplier.sector}</span>
                  </div>
                </div>
              </div>

              {selectedSupplier.status === 'Expired' && (
                <div className="p-3 bg-rose-50 border border-rose-150 rounded-xs text-[11px] text-rose-800 font-sans leading-relaxed flex items-start gap-2">
                  <AlertTriangle size={16} className="text-rose-600 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Audit Notice:</strong> This supplier certificate has expired and needs a SANAS compliance recertification process immediately. Bids by this supplier will score zero on preferential points.
                  </span>
                </div>
              )}

            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2.5 flex-shrink-0">
              <button 
                id="close-drawer-bottom"
                onClick={() => setSelectedSupplier(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-xs text-xs font-sans text-center transition-colors"
              >
                Close Audit Detail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD SUPPLIER FORM MODAL */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-300 rounded-sm shadow-xl w-full max-w-xl overflow-hidden animate-slide-up">
            <div className="bg-[#1F3864] text-white px-5 py-4 flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider">Register Supplier Profile</h3>
              <button 
                onClick={() => setShowAddSupplierModal(false)}
                className="text-white hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Company / Trading Name</label>
                  <input 
                    type="text" 
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-sm focus:border-[#1F3864] outline-none"
                    placeholder="e.g. Siyakha Solutions"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Company Registration No.</label>
                  <input 
                    type="text" 
                    required
                    value={regNo}
                    onChange={(e) => setRegNo(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-sm focus:border-[#1F3864] outline-none"
                    placeholder="e.g. 2018/123456/07"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Sector Charter Code</label>
                  <select 
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-sm bg-white focus:border-[#1F3864] outline-none"
                  >
                    <option value="ICT Sector">ICT Sector</option>
                    <option value="Generic Sector">Generic Sector</option>
                    <option value="Construction Sector">Construction Sector</option>
                    <option value="Specialized QSE">Specialized QSE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Compliance Audit Standing</label>
                  <select 
                    value={status}
                    onChange={(e) => setStatus(e.target.value as SupplierStatus)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-sm bg-white focus:border-[#1F3864] outline-none"
                  >
                    <option value="Approved">Approved</option>
                    <option value="Pending">Pending Audit</option>
                    <option value="Expired">Expired</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">HQ Physical Address</label>
                  <input 
                    type="text" 
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-sm focus:border-[#1F3864] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Contact Phone</label>
                  <input 
                    type="text" 
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-sm focus:border-[#1F3864] outline-none"
                    placeholder="+27 (0) 11..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Corporate Contact Email</label>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-sm focus:border-[#1F3864] outline-none"
                  placeholder="tenders@..."
                />
              </div>

              {/* Slider Scores inside addition form */}
              <div className="bg-slate-50 p-4 border border-slate-200 rounded-sm space-y-3.5">
                <span className="text-xs font-bold text-slate-700 uppercase block tracking-wider">Audit Points Settings</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500">Ownership points ({ownership}/25)</label>
                    <input type="range" min="0" max="25" value={ownership} onChange={(e) => setOwnership(Number(e.target.value))} className="w-full accent-[#1F3864]" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500">Management points ({management}/19)</label>
                    <input type="range" min="0" max="19" value={management} onChange={(e) => setManagement(Number(e.target.value))} className="w-full accent-[#1F3864]" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500">Skills points ({skills}/20)</label>
                    <input type="range" min="0" max="20" value={skills} onChange={(e) => setSkills(Number(e.target.value))} className="w-full accent-[#1F3864]" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500">ESD points ({esd}/40)</label>
                    <input type="range" min="0" max="40" value={esd} onChange={(e) => setEsd(Number(e.target.value))} className="w-full accent-[#1F3864]" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500">SED points ({sed}/5)</label>
                    <input type="range" min="0" max="5" value={sed} onChange={(e) => setSed(Number(e.target.value))} className="w-full accent-[#1F3864]" />
                  </div>
                  
                  <div className="pt-2 border-t border-slate-200 sm:col-span-2 flex justify-between text-xs font-bold text-slate-800">
                    <span>Determined Grade Level:</span>
                    <span className="font-mono text-indigo-800">Level {formBeeLevel} Contributor ({formTotalScore} points)</span>
                  </div>
                </div>
              </div>

              {/* Ownership % Sliders */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Black Ownership %</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    max="100"
                    value={blackOwned}
                    onChange={(e) => setBlackOwned(Number(e.target.value))}
                    className="w-full text-xs p-2 border border-slate-200 rounded-sm focus:border-[#1F3864] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Black Women Ownership %</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    max={blackOwned}
                    value={blackWomenOwned}
                    onChange={(e) => setBlackWomenOwned(Number(e.target.value))}
                    className="w-full text-xs p-2 border border-slate-200 rounded-sm focus:border-[#1F3864] outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setShowAddSupplierModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button 
                  id="confirm-add-supplier-btn"
                  type="submit"
                  className="bg-[#1F3864] hover:bg-[#1a3055] text-white px-4 py-2 text-xs font-bold uppercase rounded-xs transition-colors"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
