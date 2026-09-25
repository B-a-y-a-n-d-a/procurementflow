import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ChevronRight, 
  Printer, 
  Plus, 
  HelpCircle,
  Award,
  Download,
  CheckCircle,
  FileCheck
} from 'lucide-react';
import { Supplier, determineBeeLevel } from '../types';

interface VerificationHubProps {
  suppliers: Supplier[];
  onAddSupplier: (supplier: Supplier) => void;
}

export default function VerificationHub({ suppliers, onAddSupplier }: VerificationHubProps) {
  // Scorecard state variables
  const [vendorName, setVendorName] = useState('Indlela Infrastructure Group');
  const [regNo, setRegNo] = useState('2019/002341/07');
  const [sector, setSector] = useState('ICT Sector');
  const [cityProvince, setCityProvince] = useState('Pretoria, Gauteng');
  const [contactEmail, setContactEmail] = useState('tenders@indlelagroup.co.za');
  const [contactPhone, setContactPhone] = useState('+27 (0) 12 804 5511');

  // Sliders for points
  const [ownershipPts, setOwnershipPts] = useState(21.5); // Max 25
  const [managementPts, setManagementPts] = useState(13.2); // Max 19
  const [skillsPts, setSkillsPts] = useState(16.5); // Max 20
  const [esdPts, setEsdPts] = useState(32.8); // Max 40
  const [sedPts, setSedPts] = useState(4.5); // Max 5

  // Ownership Details
  const [blackOwnership, setBlackOwnership] = useState(51);
  const [blackWomenOwnership, setBlackWomenOwnership] = useState(30);

  // Computed Values
  const totalScore = parseFloat(
    (ownershipPts + managementPts + skillsPts + esdPts + sedPts).toFixed(2)
  );
  const beeLevel = determineBeeLevel(totalScore);

  // Recognition levels under standard codes
  const recognitionMultipliers: Record<number, string> = {
    1: '135%',
    2: '125%',
    3: '110%',
    4: '100%',
    5: '80%',
    6: '60%',
    7: '50%',
    8: '10%',
    9: '0% (Non-Compliant)',
  };

  const getLevelBadgeStyles = (level: number) => {
    if (level === 1) return 'bg-indigo-900 text-indigo-100 border-indigo-700';
    if (level <= 4) return 'bg-[#1F3864]/10 text-[#1F3864] border-[#1F3864]/30';
    if (level <= 8) return 'bg-amber-50 text-amber-800 border-amber-200';
    return 'bg-rose-50 text-rose-800 border-rose-200';
  };

  // State to track generated certificates
  const [generatedCertificate, setGeneratedCertificate] = useState<any | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  const handleGenerateCertificate = () => {
    const certNum = `BEE-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000) + 10000}`;
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 1);
    const expiryStr = expiry.toISOString().split('T')[0];

    const cert = {
      id: `sup-${Date.now()}`,
      name: vendorName,
      registrationNumber: regNo,
      beeLevel: beeLevel,
      blackOwnership: blackOwnership,
      blackWomenOwnership: blackWomenOwnership,
      status: 'Approved' as const,
      certificateNumber: certNum,
      expiryDate: expiryStr,
      sector: sector,
      contactEmail: contactEmail,
      contactPhone: contactPhone,
      totalScore: totalScore,
      location: cityProvince,
      breakdown: {
        ownership: ownershipPts,
        managementControl: managementPts,
        skillsDevelopment: skillsPts,
        enterpriseSupplierDev: esdPts,
        socioEconomicDev: sedPts,
      }
    };

    setGeneratedCertificate(cert);
    setSuccessMessage('');
  };

  const handleCommitSupplierToDirectory = () => {
    if (!generatedCertificate) return;
    onAddSupplier(generatedCertificate);
    setSuccessMessage(`"${generatedCertificate.name}" has been verified and registered into the Supplier Directory!`);
    
    // Clear Certificate generator values so user can create another
    setTimeout(() => {
      setSuccessMessage('');
    }, 4500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1.5 border-b border-slate-200 pb-4">
        <h1 className="font-sans text-2xl font-bold tracking-tight text-slate-900">BBBEE Scorecard Verification Hub</h1>
        <p className="font-sans text-xs text-slate-500">
          Perform a technical audit on a vendor's scorecard, calculate dynamic recognition levels, and issue verified certificates.
        </p>
      </div>

      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-sm text-xs flex items-center gap-2.5 shadow-sm animate-fade-in">
          <CheckCircle size={18} className="text-emerald-600 flex-shrink-0" />
          <span className="font-sans font-medium">{successMessage}</span>
        </div>
      )}

      {/* Main Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Hand: The Calculator Form (Grid Col Span 7) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-sm p-5 space-y-6">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight">1. Scorecard Audit Input</h2>
            <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-sm">SANAS ICT Code Compliant</span>
          </div>

          {/* Core Profile Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Company / Vendor Name</label>
              <input 
                type="text"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-sm focus:border-[#1F3864] focus:ring-2 focus:ring-[#1F3864]/10 outline-none"
                placeholder="e.g., Indlela Infrastructure Group"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Company Registration Number</label>
              <input 
                type="text"
                value={regNo}
                onChange={(e) => setRegNo(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-sm focus:border-[#1F3864] focus:ring-2 focus:ring-[#1F3864]/10 outline-none"
                placeholder="e.g., 2019/002341/07"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Sector Code</label>
              <select 
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-sm bg-white focus:border-[#1F3864] outline-none"
              >
                <option value="ICT Sector">ICT Sector Charter</option>
                <option value="Generic Sector">Generic Codes of Good Practice</option>
                <option value="Construction Sector">Construction Charter</option>
                <option value="Specialized QSE">Specialized QSE (Qualifying Small Enterprise)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Physical Location</label>
              <input 
                type="text"
                value={cityProvince}
                onChange={(e) => setCityProvince(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-sm focus:border-[#1F3864] focus:ring-2 focus:ring-[#1F3864]/10 outline-none"
                placeholder="e.g., Sandton, Gauteng"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Contact Email Address</label>
              <input 
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-sm focus:border-[#1F3864] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Contact Telephone</label>
              <input 
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-sm focus:border-[#1F3864] outline-none"
              />
            </div>
          </div>

          {/* Ownership Percentages */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-sm space-y-3">
            <span className="text-xs font-bold text-slate-700 block">Demographics & Equity Ownership</span>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  % Black Ownership ({blackOwnership}%)
                </label>
                <input 
                  type="range"
                  min="0"
                  max="100"
                  value={blackOwnership}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setBlackOwnership(value);
                    // Black women ownership is a subset of black ownership
                    setBlackWomenOwnership(prev => Math.min(prev, value));
                  }}
                  className="w-full accent-[#1F3864]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  % Black Women Ownership ({blackWomenOwnership}%)
                </label>
                <input 
                  type="range"
                  min="0"
                  max={blackOwnership} // Cannot exceed black ownership
                  value={blackWomenOwnership}
                  onChange={(e) => setBlackWomenOwnership(Number(e.target.value))}
                  className="w-full accent-[#1F3864]"
                />
              </div>
            </div>
          </div>

          {/* Sliders for Scorecard Elements */}
          <div className="space-y-4">
            <span className="text-xs font-bold text-slate-700 block border-b border-slate-100 pb-1">
              BBBEE Scorecard Weighted Breakdown
            </span>

            {/* Element 1 */}
            <div className="space-y-1">
              <div className="flex justify-between items-baseline text-xs">
                <span className="font-semibold text-slate-600">Ownership (Equity Power)</span>
                <span className="font-mono text-slate-500 font-bold">{ownershipPts} / 25.00 pts</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="25" 
                step="0.1" 
                value={ownershipPts}
                onChange={(e) => setOwnershipPts(parseFloat(e.target.value))}
                className="w-full accent-[#1F3864] h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Element 2 */}
            <div className="space-y-1">
              <div className="flex justify-between items-baseline text-xs">
                <span className="font-semibold text-slate-600">Management Control (Board & Execs)</span>
                <span className="font-mono text-slate-500 font-bold">{managementPts} / 19.00 pts</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="19" 
                step="0.1" 
                value={managementPts}
                onChange={(e) => setManagementPts(parseFloat(e.target.value))}
                className="w-full accent-[#1F3864] h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Element 3 */}
            <div className="space-y-1">
              <div className="flex justify-between items-baseline text-xs">
                <span className="font-semibold text-slate-600">Skills Development (Training spend)</span>
                <span className="font-mono text-slate-500 font-bold">{skillsPts} / 20.00 pts</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="20" 
                step="0.1" 
                value={skillsPts}
                onChange={(e) => setSkillsPts(parseFloat(e.target.value))}
                className="w-full accent-[#1F3864] h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Element 4 */}
            <div className="space-y-1">
              <div className="flex justify-between items-baseline text-xs">
                <span className="font-semibold text-slate-600">Enterprise & Supplier Development (ESD)</span>
                <span className="font-mono text-slate-500 font-bold">{esdPts} / 40.00 pts</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="40" 
                step="0.1" 
                value={esdPts}
                onChange={(e) => setEsdPts(parseFloat(e.target.value))}
                className="w-full accent-[#1F3864] h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Element 5 */}
            <div className="space-y-1">
              <div className="flex justify-between items-baseline text-xs">
                <span className="font-semibold text-slate-600">Socio-Economic Development (SED)</span>
                <span className="font-mono text-slate-500 font-bold">{sedPts} / 5.00 pts</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="5" 
                step="0.1" 
                value={sedPts}
                onChange={(e) => setSedPts(parseFloat(e.target.value))}
                className="w-full accent-[#1F3864] h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          <button 
            id="generate-cert-btn"
            onClick={handleGenerateCertificate}
            className="w-full bg-[#1F3864] hover:bg-[#1a3055] text-white py-3 px-4 font-sans text-xs font-bold uppercase tracking-wider rounded-xs flex items-center justify-center gap-2"
          >
            <ShieldCheck size={16} /> Compute and Generate Audit Certificate
          </button>
        </div>

        {/* Right Hand: The Computed Scorecard & Generated Certificate (Grid Col Span 5) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Section Indicator */}
          <div className="bg-white border border-slate-200 rounded-sm p-5 space-y-5">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight border-b border-slate-100 pb-3">
              2. Real-time Calculation Summary
            </h2>

            <div className="flex justify-between items-center p-3 bg-slate-50 border border-slate-200/60 rounded-xs">
              <span className="text-xs font-bold text-slate-600">Total Scorecard Points:</span>
              <span className="font-mono text-xl font-bold text-slate-900">{totalScore} / 109.00</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-slate-50 border border-slate-200/60 rounded-xs">
              <span className="text-xs font-bold text-slate-600">Determined BBBEE Rating:</span>
              <div className="flex items-center gap-1.5">
                <span className={`px-2.5 py-1 text-xs font-bold font-mono border rounded-xs ${getLevelBadgeStyles(beeLevel)}`}>
                  LEVEL {beeLevel}
                </span>
                {beeLevel === 9 && (
                  <span className="text-[10px] text-rose-600 font-bold uppercase">Non-Compliant</span>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center p-3 bg-slate-50 border border-slate-200/60 rounded-xs">
              <span className="text-xs font-bold text-slate-600">Recognition Multiplier:</span>
              <span className="font-mono text-sm font-bold text-[#1F3864] bg-indigo-50/50 px-2 py-0.5 border border-indigo-100 rounded-xs">
                {recognitionMultipliers[beeLevel]}
              </span>
            </div>

            <div className="text-slate-400 text-[10px] leading-normal flex items-start gap-1.5 p-1 bg-amber-50/30 border border-amber-200/40 rounded-sm">
              <HelpCircle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <span>
                Under preferential procurement regulations, buying from a Level 1 company gives a 135% recognition multiplier (e.g. spending R10,000 counts as R13,500 in compliance targets).
              </span>
            </div>
          </div>

          {/* Generated Certificate UI Block */}
          {generatedCertificate ? (
            <div className="bg-white border border-slate-200 rounded-sm overflow-hidden shadow-sm animate-fade-in">
              <div className="bg-[#1F3864] p-4 text-white">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xs uppercase font-mono tracking-widest opacity-80">ProcurementFlow Compliance</h3>
                    <h2 className="text-sm font-bold font-sans tracking-tight">BBBEE VERIFICATION CERTIFICATE</h2>
                  </div>
                  <FileCheck size={28} className="opacity-90" />
                </div>
              </div>

              {/* Certificate Inner Canvas */}
              <div className="p-5 border-b border-slate-100 bg-slate-50/30 space-y-4 relative overflow-hidden select-none">
                {/* Simulated Certificate Watermark Stamp */}
                <div className="absolute right-4 bottom-4 w-28 h-28 border-[3px] border-[#1F3864]/10 rounded-full flex flex-col items-center justify-center transform rotate-12 pointer-events-none">
                  <span className="font-sans text-[8px] font-bold text-[#1F3864]/10 uppercase tracking-widest">VERIFIED</span>
                  <span className="font-mono text-[9px] font-bold text-[#1F3864]/10 mt-1">{generatedCertificate.certificateNumber}</span>
                  <span className="font-sans text-[7px] font-bold text-[#1F3864]/10 mt-1">PROCURESOUTH</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Measured Enterprise</span>
                    <span className="font-bold text-slate-800 text-sm leading-tight">{generatedCertificate.name}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Registration Number</span>
                      <span className="font-mono font-medium text-slate-700">{generatedCertificate.registrationNumber}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Certificate Number</span>
                      <span className="font-mono font-bold text-slate-800">{generatedCertificate.certificateNumber}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Black Ownership</span>
                      <span className="font-mono font-medium text-slate-700">{generatedCertificate.blackOwnership}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Black Women Ownership</span>
                      <span className="font-mono font-medium text-slate-700">{generatedCertificate.blackWomenOwnership}%</span>
                    </div>
                  </div>

                  <div className="border-t border-b border-slate-200/50 py-2.5 my-3 grid grid-cols-2 items-center">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Overall BBBEE Status</span>
                      <span className="font-sans font-bold text-[#1F3864] text-sm uppercase">Level {generatedCertificate.beeLevel} Contributor</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Audited Points Score</span>
                      <span className="font-mono font-bold text-slate-800 text-sm">{generatedCertificate.totalScore} pts</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Certificate Expiry</span>
                      <span className="font-mono text-xs font-semibold text-slate-700">{generatedCertificate.expiryDate}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 block">Sector Charter Code</span>
                      <span className="font-sans font-medium text-slate-700">{generatedCertificate.sector}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="p-3 bg-slate-50 flex gap-2">
                <button 
                  id="register-supplier-btn"
                  onClick={handleCommitSupplierToDirectory}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-sans text-[11px] font-bold uppercase tracking-wider py-2.5 px-3 rounded-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus size={14} /> Register in Directory
                </button>
                <button 
                  id="print-cert-btn"
                  onClick={() => window.print()} 
                  className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 font-sans text-[11px] font-bold uppercase tracking-wider py-2.5 px-3 rounded-xs flex items-center justify-center gap-1.5 transition-colors"
                  title="Print Certificate"
                >
                  <Printer size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-sm p-8 text-center flex flex-col items-center justify-center h-full min-h-[250px] select-none text-slate-400">
              <ShieldCheck size={40} className="stroke-1 text-slate-300 mb-2.5" />
              <span className="font-sans text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Audit Certificate Pending</span>
              <p className="font-sans text-[11px] text-slate-400 max-w-[240px] leading-relaxed">
                Configure scorecard parameters on the left and click "Compute and Generate" to perform audit verification.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
