import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  HelpCircle, 
  Plus, 
  ArrowRight, 
  TrendingUp, 
  Award, 
  PlusCircle, 
  Calculator, 
  Settings, 
  ShieldCheck,
  CheckCircle2,
  Trash2,
  ListFilter
} from 'lucide-react';
import { 
  Tender,
  Bid,
  Supplier,
  PppfaSystemType, 
  BBBEE_POINTS_80_20, 
  BBBEE_POINTS_90_10, 
  calculatePricePoints,
  DEFAULT_SUPPLIERS
} from '../types';

interface TenderBoardProps {
  tenders: Tender[];
  suppliers: Supplier[];
  onAddTender: (tender: Tender) => void;
  onAddBid: (tenderId: string, bid: Bid) => void;
}

export default function TenderBoard({ tenders, suppliers, onAddTender, onAddBid }: TenderBoardProps) {
  const [selectedTenderId, setSelectedTenderId] = useState<string>(tenders[0]?.id || '');
  const [showAddTenderModal, setShowAddTenderModal] = useState(false);

  // New Tender Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDepartment, setNewDepartment] = useState('National Department of Public Works');
  const [newBudget, setNewBudget] = useState(15000000);
  const [newSystemType, setNewSystemType] = useState<PppfaSystemType>('80/20');
  const [newDescription, setNewDescription] = useState('');
  const [newClosingDate, setNewClosingDate] = useState('2026-09-30');
  
  // New Bid Form State (For adding a bid to a tender)
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [bidPrice, setBidPrice] = useState(12000000);
  const [bidRemarks, setBidRemarks] = useState('');

  // Sandbox State
  const [sandboxSystem, setSandboxSystem] = useState<PppfaSystemType>('80/20');
  const [sandboxPMin, setSandboxPMin] = useState<number>(10000000);
  const [sandboxBidders, setSandboxBidders] = useState<Array<{ id: string, name: string, price: number, beeLevel: number }>>([
    { id: 'sb-1', name: 'Alpha Infrastructure', price: 10000000, beeLevel: 1 },
    { id: 'sb-2', name: 'Siyaphambili Projects', price: 11500000, beeLevel: 2 },
    { id: 'sb-3', name: 'High-Tech Solutions', price: 9500000, beeLevel: 8 },
  ]);
  const [newSandboxName, setNewSandboxName] = useState('');
  const [newSandboxPrice, setNewSandboxPrice] = useState(10500000);
  const [newSandboxBee, setNewSandboxBee] = useState(1);

  const selectedTender = tenders.find(t => t.id === selectedTenderId) || tenders[0];

  // Recalculate and sort bids for selected tender
  const getEvaluatedBids = (tender: Tender): Bid[] => {
    if (!tender || !tender.bids || tender.bids.length === 0) return [];
    
    // 1. Identify minimum price of compliant, realistic bids
    const compliantBids = tender.bids.filter(b => b.isCompliant);
    if (compliantBids.length === 0) return tender.bids;
    
    const pMin = Math.min(...compliantBids.map(b => b.priceClaimed));

    // 2. Compute scores
    const evaluated = tender.bids.map(bid => {
      if (!bid.isCompliant) {
        return {
          ...bid,
          scorePrice: 0,
          scoreBee: 0,
          scoreTotal: 0
        };
      }
      const scorePrice = calculatePricePoints(bid.priceClaimed, pMin, tender.systemType);
      const pointsTable = tender.systemType === '80/20' ? BBBEE_POINTS_80_20 : BBBEE_POINTS_90_10;
      const scoreBee = pointsTable[bid.beeLevel] || 0;
      const scoreTotal = parseFloat((scorePrice + scoreBee).toFixed(2));

      return {
        ...bid,
        scorePrice,
        scoreBee,
        scoreTotal
      };
    });

    // 3. Sort by total score descending, and flag the winner
    const sorted = [...evaluated].sort((a, b) => b.scoreTotal - a.scoreTotal);
    
    // Auto-tag top scoring compliant bid as best choice/awarded if tender status matches
    return sorted.map((bid, idx) => {
      let status = bid.status;
      if (!bid.isCompliant) {
        status = 'Disqualified';
      } else if (idx === 0) {
        status = tender.status === 'Awarded' ? 'Awarded' : 'Best Choice';
      } else {
        status = 'Received';
      }
      return { ...bid, status };
    });
  };

  const currentEvaluatedBids = selectedTender ? getEvaluatedBids(selectedTender) : [];

  // Add Bid Submission Handler
  const handleAddBid = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenderId || !selectedSupplierId) return;

    const supplier = suppliers.find(s => s.id === selectedSupplierId);
    if (!supplier) return;

    const newBid: Bid = {
      id: `bid-${Date.now()}`,
      supplierId: supplier.id,
      supplierName: supplier.name,
      priceClaimed: bidPrice,
      beeLevel: supplier.beeLevel,
      scorePrice: 0,
      scoreBee: 0,
      scoreTotal: 0,
      isCompliant: supplier.status === 'Approved',
      remarks: bidRemarks || 'Manual bid submission during evaluation.',
      status: 'Received'
    };

    onAddBid(selectedTenderId, newBid);
    setBidRemarks('');
    setSelectedSupplierId('');
  };

  // Add Tender Submission Handler
  const handleCreateTender = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const refNum = `RT${Math.floor(Math.random() * 900) + 100}-2026`;

    const newTender: Tender = {
      id: `ten-${Date.now()}`,
      referenceNumber: refNum,
      title: newTitle,
      department: newDepartment,
      budget: Number(newBudget),
      systemType: newSystemType,
      status: 'Open',
      closingDate: newClosingDate,
      description: newDescription,
      scopeOfWork: ['Mandatory compliance checks', 'Site deployment and operations SLA evaluation'],
      bids: []
    };

    onAddTender(newTender);
    setSelectedTenderId(newTender.id);
    setShowAddTenderModal(false);
    
    // Clear fields
    setNewTitle('');
    setNewDescription('');
  };

  // Sandbox Handler Actions
  const handleAddSandboxBidder = () => {
    if (!newSandboxName.trim()) return;
    const newBidder = {
      id: `sb-${Date.now()}`,
      name: newSandboxName,
      price: newSandboxPrice,
      beeLevel: Number(newSandboxBee)
    };
    setSandboxBidders([...sandboxBidders, newBidder]);
    setNewSandboxName('');
  };

  const handleRemoveSandboxBidder = (id: string) => {
    setSandboxBidders(sandboxBidders.filter(b => b.id !== id));
  };

  // Sandbox calculations
  const evaluatedSandboxBidders = (() => {
    if (sandboxBidders.length === 0) return [];
    const minPrice = Math.min(...sandboxBidders.map(b => b.price));
    
    const results = sandboxBidders.map(b => {
      const pricePts = calculatePricePoints(b.price, minPrice, sandboxSystem);
      const pointsTable = sandboxSystem === '80/20' ? BBBEE_POINTS_80_20 : BBBEE_POINTS_90_10;
      const beePts = pointsTable[b.beeLevel] || 0;
      const totalPts = parseFloat((pricePts + beePts).toFixed(2));
      return {
        ...b,
        pricePts,
        beePts,
        totalPts
      };
    });

    return results.sort((a, b) => b.totalPts - a.totalPts);
  })();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Awarded':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Best Choice':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'Disqualified':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="font-sans text-2xl font-bold tracking-tight text-slate-900">Tender Board & Preferential Evaluator</h1>
          <p className="font-sans text-xs text-slate-500">
            Audit South African tender bids using official Treasury 80/20 & 90/10 PPPFA rulesets.
          </p>
        </div>
        
        <button
          id="open-create-tender-modal-btn"
          onClick={() => setShowAddTenderModal(true)}
          className="bg-[#1F3864] hover:bg-[#1a3055] text-white py-2 px-3.5 text-xs font-semibold rounded-xs flex items-center justify-center gap-2 flex-shrink-0 transition-colors"
        >
          <PlusCircle size={15} /> Publish New Tender
        </button>
      </div>

      {/* Main Split Layout: Tender Board (Left) / Solver Sandbox (Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Left Hand: Live Tender and Bid Auditor (Grid Col Span 8) */}
        <div className="xl:col-span-8 space-y-6">
          
          {/* Active Tender Selector */}
          <div className="bg-white border border-slate-200 rounded-sm p-4 flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-2 flex-shrink-0">
              <ListFilter size={16} className="text-[#1F3864]" />
              <span className="text-xs font-bold text-slate-700">Select Active Tender:</span>
            </div>
            <select 
              id="tender-selector"
              value={selectedTenderId}
              onChange={(e) => setSelectedTenderId(e.target.value)}
              className="flex-1 text-xs p-2 border border-slate-200 rounded-sm bg-white font-semibold text-slate-800 outline-none"
            >
              {tenders.map((tender) => (
                <option key={tender.id} value={tender.id}>
                  [{tender.referenceNumber}] {tender.title} ({tender.systemType})
                </option>
              ))}
            </select>
          </div>

          {/* Tender Technical Details Sheets */}
          {selectedTender && (
            <div className="bg-white border border-slate-200 rounded-sm p-5 space-y-5">
              
              {/* Reference and Budget Header */}
              <div className="flex flex-col sm:flex-row justify-between border-b border-slate-100 pb-3 gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-xs">
                      {selectedTender.referenceNumber}
                    </span>
                    <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-xs">
                      PPPFA {selectedTender.systemType} SYSTEM
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 border rounded-sm ${
                      selectedTender.status === 'Open' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                      selectedTender.status === 'Evaluation' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                      'bg-indigo-50 text-indigo-800 border-indigo-300'
                    }`}>
                      {selectedTender.status}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-slate-800 mt-2 leading-tight">
                    {selectedTender.title}
                  </h2>
                  <span className="text-xs text-slate-400 font-sans block mt-1">
                    Issued by: <span className="font-medium text-slate-600">{selectedTender.department}</span>
                  </span>
                </div>

                <div className="text-left sm:text-right flex-shrink-0">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Estimated Budget Allocation</span>
                  <span className="font-mono text-lg font-bold text-[#1F3864]">
                    R {selectedTender.budget.toLocaleString('en-ZA')}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Closing Date: {selectedTender.closingDate}</span>
                </div>
              </div>

              {/* Scope Description */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 uppercase block tracking-wider">Tender Summary & Overview</span>
                <p className="text-xs text-slate-600 leading-relaxed font-sans">
                  {selectedTender.description}
                </p>
              </div>

              {/* Bids Submitted Table Block */}
              <div className="space-y-3 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Evaluated Bids and Audit Standings</span>
                  <span className="text-[10px] text-slate-400 font-mono">Sorted by Total Combined Points</span>
                </div>

                {currentEvaluatedBids.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-200 border-dashed rounded-sm p-6 text-center select-none text-slate-400 text-xs">
                    No bids submitted for evaluation yet. Submit a new bidder in the workspace form below.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-sm">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-400 font-bold">
                          <th className="p-2.5 font-sans">Bidder / Supplier</th>
                          <th className="p-2.5 font-sans text-right">ZAR Bid Price</th>
                          <th className="p-2.5 font-sans text-center">BEE Lvl</th>
                          <th className="p-2.5 font-sans text-right">Price Pts</th>
                          <th className="p-2.5 font-sans text-right">BEE Pts</th>
                          <th className="p-2.5 font-sans text-right font-bold text-[#1F3864]">Total Pts</th>
                          <th className="p-2.5 font-sans text-center">Compliance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans">
                        {currentEvaluatedBids.map((bid, index) => (
                          <tr key={bid.id} className={`hover:bg-slate-50/40 transition-colors ${index === 0 && bid.isCompliant ? 'bg-indigo-50/20' : ''}`}>
                            <td className="p-2.5">
                              <span className="font-bold text-slate-800 block">{bid.supplierName}</span>
                              <span className="text-[10px] text-slate-400 font-sans block max-w-xs truncate">{bid.remarks}</span>
                            </td>
                            <td className="p-2.5 font-mono text-right text-slate-700">
                              R {bid.priceClaimed.toLocaleString('en-ZA')}
                            </td>
                            <td className="p-2.5 text-center">
                              <span className="font-mono font-bold text-slate-700">L{bid.beeLevel}</span>
                            </td>
                            <td className="p-2.5 font-mono text-right text-slate-500">{bid.isCompliant ? bid.scorePrice : '0.00'}</td>
                            <td className="p-2.5 font-mono text-right text-slate-500">{bid.isCompliant ? bid.scoreBee : '0.00'}</td>
                            <td className="p-2.5 font-mono text-right font-bold text-slate-900">
                              {bid.isCompliant ? bid.scoreTotal : '0.00'}
                            </td>
                            <td className="p-2.5 text-center">
                              <span className={`inline-block px-2 py-0.5 font-mono text-[9px] font-bold border rounded-full ${getStatusBadge(bid.status)}`}>
                                {bid.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Submit Bid Form panel - inside the context sheet for ease */}
              <div className="border-t border-slate-200 pt-5 mt-5">
                <span className="text-xs font-bold text-slate-800 uppercase block mb-3">Submit Bidder Proposal to this Tender</span>
                <form onSubmit={handleAddBid} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end bg-slate-50 p-4 rounded-sm border border-slate-200">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Select Supplier</label>
                    <select
                      value={selectedSupplierId}
                      onChange={(e) => setSelectedSupplierId(e.target.value)}
                      required
                      className="w-full text-xs p-2 border border-slate-200 rounded-sm bg-white outline-none"
                    >
                      <option value="">-- Choose Supplier --</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} (BEE Level {s.beeLevel}) [{s.status}]
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Bid Price (ZAR)</label>
                    <input 
                      type="number"
                      required
                      value={bidPrice}
                      onChange={(e) => setBidPrice(Number(e.target.value))}
                      className="w-full text-xs p-2 border border-slate-200 rounded-sm bg-white outline-none"
                      placeholder="e.g., 12000000"
                    />
                  </div>

                  <button
                    id="submit-bid-tender-btn"
                    type="submit"
                    className="bg-[#1F3864] hover:bg-[#1a3055] text-white py-2 px-4 font-sans text-xs font-bold rounded-sm tracking-wide transition-colors"
                  >
                    Post Submission
                  </button>

                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Technical remarks or deviations</label>
                    <input 
                      type="text"
                      value={bidRemarks}
                      onChange={(e) => setBidRemarks(e.target.value)}
                      className="w-full text-xs p-2 border border-slate-200 rounded-sm bg-white outline-none"
                      placeholder="e.g. Fully compliant with SCADA standards..."
                    />
                  </div>
                </form>
              </div>

            </div>
          )}
        </div>

        {/* Right Hand: Sandbox Preferential Procurement Solver (Grid Col Span 4) */}
        <div className="xl:col-span-4 bg-white border border-slate-200 rounded-sm p-4 space-y-5">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
              <Calculator size={16} className="text-[#1F3864]" /> Live Bidding Solver
            </h2>
            <p className="text-[11px] text-slate-400">Sandbox playground to solve & trace South African PPPFA evaluations.</p>
          </div>

          {/* System Selectors */}
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">PPPFA Rule Framework</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSandboxSystem('80/20')}
                  className={`py-1.5 text-xs font-bold rounded-xs border transition-all ${
                    sandboxSystem === '80/20' 
                      ? 'bg-[#1F3864] text-white border-[#1F3864]' 
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  80/20 (Spend &lt; R50m)
                </button>
                <button
                  type="button"
                  onClick={() => setSandboxSystem('90/10')}
                  className={`py-1.5 text-xs font-bold rounded-xs border transition-all ${
                    sandboxSystem === '90/10' 
                      ? 'bg-[#1F3864] text-white border-[#1F3864]' 
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  90/10 (Spend &gt; R50m)
                </button>
              </div>
            </div>
          </div>

          {/* List of custom sandbox bidders */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Sandbox Bid Entries</span>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-100 p-2 rounded-xs">
              {evaluatedSandboxBidders.map((b, idx) => (
                <div key={b.id} className="p-2.5 bg-slate-50/60 border border-slate-200/80 rounded-xs flex items-center justify-between">
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-700 block truncate">
                      {idx + 1}. {b.name}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      R {b.price.toLocaleString('en-ZA')} | L{b.beeLevel}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="font-mono text-xs font-bold text-[#1F3864] block">{b.totalPts} pts</span>
                      <span className="text-[9px] text-slate-400 block font-mono">({b.pricePts} + {b.beePts})</span>
                    </div>
                    <button 
                      onClick={() => handleRemoveSandboxBidder(b.id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                      title="Delete Bidder"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Add Bidders */}
          <div className="p-3 bg-slate-50/50 border border-slate-200 rounded-sm space-y-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Quick Add Mock Bidder</span>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <input 
                  type="text" 
                  value={newSandboxName}
                  onChange={(e) => setNewSandboxName(e.target.value)}
                  placeholder="Bidder name..."
                  className="w-full text-xs p-1.5 border border-slate-200 rounded-xs bg-white outline-none"
                />
              </div>
              <div>
                <label className="block text-[8px] font-bold text-slate-400">Price (ZAR)</label>
                <input 
                  type="number" 
                  value={newSandboxPrice}
                  onChange={(e) => setNewSandboxPrice(Number(e.target.value))}
                  className="w-full text-xs p-1.5 border border-slate-200 rounded-xs bg-white outline-none"
                />
              </div>
              <div>
                <label className="block text-[8px] font-bold text-slate-400">BEE Level</label>
                <select 
                  value={newSandboxBee}
                  onChange={(e) => setNewSandboxBee(Number(e.target.value))}
                  className="w-full text-xs p-1.5 border border-slate-200 rounded-xs bg-white outline-none"
                >
                  {[1,2,3,4,5,6,7,8,9].map(l => (
                    <option key={l} value={l}>Level {l}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              id="add-sandbox-bidder-btn"
              type="button"
              onClick={handleAddSandboxBidder}
              className="w-full bg-[#1F3864] hover:bg-[#1a3055] text-white py-1.5 text-[10px] font-bold uppercase rounded-xs transition-colors"
            >
              Add to Sandbox Solver
            </button>
          </div>

          {/* Mathematical Solver Trace Sheet */}
          {evaluatedSandboxBidders.length > 0 && (
            <div className="p-3.5 bg-indigo-50/30 border border-indigo-100 rounded-xs space-y-3 font-sans">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#1F3864]">
                <CheckCircle2 size={14} /> Recommended Awardee Trace
              </div>
              
              <div className="text-xs">
                The recommended awardee is <strong className="text-slate-900">{evaluatedSandboxBidders[0].name}</strong> with a total score of <strong className="font-mono text-indigo-900">{evaluatedSandboxBidders[0].totalPts} points</strong>.
              </div>

              <div className="text-[10px] text-slate-500 font-mono space-y-1.5 leading-normal bg-white p-2 border border-slate-200 rounded-xs">
                <div>Formula Used ({sandboxSystem}):</div>
                <div>Ps = {sandboxSystem === '80/20' ? '80' : '90'} * (1 - (Pt - Pmin)/Pmin)</div>
                <div className="pt-1 border-t border-slate-100">
                  - Pmin (Lowest Price) = R {Math.min(...sandboxBidders.map(b => b.price)).toLocaleString('en-ZA')}<br />
                  - Winner Price = R {evaluatedSandboxBidders[0].price.toLocaleString('en-ZA')}<br />
                  - Price Points scored = {evaluatedSandboxBidders[0].pricePts}<br />
                  - BBBEE Level {evaluatedSandboxBidders[0].beeLevel} points = {evaluatedSandboxBidders[0].beePts}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* NEW TENDER MODAL */}
      {showAddTenderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-300 rounded-sm shadow-xl w-full max-w-lg overflow-hidden animate-slide-up">
            <div className="bg-[#1F3864] text-white px-5 py-4 flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider">Publish Corporate/State Tender</h3>
              <button 
                onClick={() => setShowAddTenderModal(false)}
                className="text-white hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTender} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Tender Project Title</label>
                <input 
                  type="text" 
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-sm focus:border-[#1F3864] outline-none"
                  placeholder="e.g., Installation of UPS batteries for City Power"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Organisational Department</label>
                  <input 
                    type="text" 
                    required
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-sm focus:border-[#1F3864] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Estimated Budget (ZAR)</label>
                  <input 
                    type="number" 
                    required
                    value={newBudget}
                    onChange={(e) => setNewBudget(Number(e.target.value))}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-sm focus:border-[#1F3864] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">PPPFA Points System</label>
                  <select 
                    value={newSystemType}
                    onChange={(e) => setNewSystemType(e.target.value as PppfaSystemType)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-sm bg-white focus:border-[#1F3864] outline-none"
                  >
                    <option value="80/20">80/20 (Contracts &lt; R50m)</option>
                    <option value="90/10">90/10 (Contracts &gt; R50m)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Closing Submission Date</label>
                  <input 
                    type="date" 
                    required
                    value={newClosingDate}
                    onChange={(e) => setNewClosingDate(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-sm focus:border-[#1F3864] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Project Description & Scope Brief</label>
                <textarea 
                  required
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-sm focus:border-[#1F3864] outline-none"
                  placeholder="Detailed breakdown of requirements..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setShowAddTenderModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button 
                  id="confirm-publish-tender-btn"
                  type="submit"
                  className="bg-[#1F3864] hover:bg-[#1a3055] text-white px-4 py-2 text-xs font-bold uppercase rounded-xs transition-colors"
                >
                  Publish Live
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
