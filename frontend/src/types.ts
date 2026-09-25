/**
 * South African Corporate Procurement & BBBEE Suite Type System
 * Adhering to PPPFA Regulations & Sanas BBBEE Codes of Good Practice
 */

export interface BBBEEBreakdown {
  ownership: number;            // max 25 pts
  managementControl: number;    // max 19 pts
  skillsDevelopment: number;    // max 20 pts (plus bonus)
  enterpriseSupplierDev: number;// max 40 pts
  socioEconomicDev: number;     // max 5 pts
}

export type SupplierStatus = 'Approved' | 'Pending' | 'Expired';

export interface Supplier {
  id: string;
  name: string;
  registrationNumber: string;
  beeLevel: number; // 1 to 8, or 9 for Non-Compliant
  blackOwnership: number; // percentage (e.g. 51)
  blackWomenOwnership: number; // percentage (e.g. 30)
  status: SupplierStatus;
  certificateNumber: string;
  expiryDate: string;
  sector: string; // ICT, Generic, Construction, Tourism, etc.
  contactEmail: string;
  contactPhone: string;
  totalScore: number; // Sum of breakdown
  breakdown: BBBEEBreakdown;
  location: string; // City, Province (e.g. "Sandton, Gauteng")
}

export type TenderStatus = 'Draft' | 'Open' | 'Evaluation' | 'Awarded';
export type PppfaSystemType = '80/20' | '90/10';

export interface Bid {
  id: string;
  supplierId: string;
  supplierName: string;
  priceClaimed: number; // ZAR Value
  beeLevel: number;
  scorePrice: number; // Calculated using PPPFA
  scoreBee: number;   // BBBEE points
  scoreTotal: number; // scorePrice + scoreBee
  isCompliant: boolean;
  remarks: string;
  status: 'Received' | 'Disqualified' | 'Best Choice' | 'Awarded';
}

export interface Tender {
  id: string;
  referenceNumber: string; // e.g., "RT15-2026"
  title: string;
  department: string; // e.g. "Department of Mineral Resources and Energy"
  budget: number; // ZAR Value
  systemType: PppfaSystemType;
  status: TenderStatus;
  closingDate: string;
  description: string;
  scopeOfWork: string[];
  bids: Bid[];
}

// PPPFA point allocations for BBBEE levels
export const BBBEE_POINTS_80_20: Record<number, number> = {
  1: 20,
  2: 18,
  3: 14,
  4: 12,
  5: 8,
  6: 6,
  7: 4,
  8: 2,
  9: 0, // Non-compliant
};

export const BBBEE_POINTS_90_10: Record<number, number> = {
  1: 10,
  2: 9,
  3: 6,
  4: 5,
  5: 4,
  6: 3,
  7: 2,
  8: 1,
  9: 0, // Non-compliant
};

/**
 * Calculates PPPFA Price points
 * Ps = 80 * (1 - (Pt - Pmin)/Pmin)  or  90 * (1 - (Pt - Pmin)/Pmin)
 */
export function calculatePricePoints(
  pt: number,
  pMin: number,
  systemType: PppfaSystemType
): number {
  if (pMin <= 0 || pt <= 0) return 0;
  
  const basePoints = systemType === '80/20' ? 80 : 90;
  // Formula handles bids higher than minimum
  const points = basePoints * (1 - (pt - pMin) / pMin);
  
  // Points cannot be negative under standard PPPFA regulations
  return Math.max(0, parseFloat(points.toFixed(2)));
}

/**
 * Calculates BBBEE level from total scorecard points
 */
export function determineBeeLevel(score: number): number {
  if (score >= 100) return 1;
  if (score >= 95) return 2;
  if (score >= 90) return 3;
  if (score >= 80) return 4;
  if (score >= 75) return 5;
  if (score >= 70) return 6;
  if (score >= 55) return 7;
  if (score >= 40) return 8;
  return 9; // Non-compliant
}

/**
 * Default mock suppliers data
 */
export const DEFAULT_SUPPLIERS: Supplier[] = [
  {
    id: 'sup-1',
    name: 'Vukani Technologies (Pty) Ltd',
    registrationNumber: '2015/348293/07',
    beeLevel: 1,
    blackOwnership: 100,
    blackWomenOwnership: 45,
    status: 'Approved',
    certificateNumber: 'BEE-2026-0921-REV1',
    expiryDate: '2027-02-15',
    sector: 'ICT Sector',
    contactEmail: 'info@vukanitech.co.za',
    contactPhone: '+27 (0) 11 482 9901',
    totalScore: 101.5,
    breakdown: {
      ownership: 25.0,
      managementControl: 16.5,
      skillsDevelopment: 19.0,
      enterpriseSupplierDev: 36.0,
      socioEconomicDev: 5.0,
    },
    location: 'Midrand, Gauteng',
  },
  {
    id: 'sup-2',
    name: 'Phakamani Civil Engineering',
    registrationNumber: '2010/194821/07',
    beeLevel: 2,
    blackOwnership: 51,
    blackWomenOwnership: 25,
    status: 'Approved',
    certificateNumber: 'BEE-CIV-2025-4491',
    expiryDate: '2026-11-30',
    sector: 'Construction Sector',
    contactEmail: 'tenders@phakamani.co.za',
    contactPhone: '+27 (0) 21 851 2309',
    totalScore: 96.2,
    breakdown: {
      ownership: 23.0,
      managementControl: 14.2,
      skillsDevelopment: 18.0,
      enterpriseSupplierDev: 36.5,
      socioEconomicDev: 4.5,
    },
    location: 'Bellville, Western Cape',
  },
  {
    id: 'sup-3',
    name: 'Ikwezi Logistics & Freight',
    registrationNumber: '2018/104928/07',
    beeLevel: 4,
    blackOwnership: 30,
    blackWomenOwnership: 10,
    status: 'Approved',
    certificateNumber: 'BEE-LOG-99201',
    expiryDate: '2027-01-10',
    sector: 'Generic Sector',
    contactEmail: 'dispatch@ikwezilogs.co.za',
    contactPhone: '+27 (0) 31 305 7711',
    totalScore: 82.5,
    breakdown: {
      ownership: 14.0,
      managementControl: 12.0,
      skillsDevelopment: 15.5,
      enterpriseSupplierDev: 37.0,
      socioEconomicDev: 4.0,
    },
    location: 'Durban Harbour, KwaZulu-Natal',
  },
  {
    id: 'sup-4',
    name: 'Sisonke Stationery & Office Supplies',
    registrationNumber: '2021/004921/07',
    beeLevel: 1,
    blackOwnership: 100,
    blackWomenOwnership: 100,
    status: 'Approved',
    certificateNumber: 'BEE-SIS-2026-112',
    expiryDate: '2026-09-18',
    sector: 'Specialized QSE',
    contactEmail: 'sales@sisonkeoffices.co.za',
    contactPhone: '+27 (0) 12 344 5592',
    totalScore: 104.0,
    breakdown: {
      ownership: 25.0,
      managementControl: 18.0,
      skillsDevelopment: 19.5,
      enterpriseSupplierDev: 36.5,
      socioEconomicDev: 5.0,
    },
    location: 'Pretoria, Gauteng',
  },
  {
    id: 'sup-5',
    name: 'Motswako Energy Solutions',
    registrationNumber: '2014/992813/07',
    beeLevel: 3,
    blackOwnership: 49,
    blackWomenOwnership: 15,
    status: 'Pending',
    certificateNumber: 'BEE-MOT-TEMP-04',
    expiryDate: '2026-07-15',
    sector: 'Generic Sector',
    contactEmail: 'energy@motswako.com',
    contactPhone: '+27 (0) 11 784 9011',
    totalScore: 91.8,
    breakdown: {
      ownership: 20.0,
      managementControl: 13.8,
      skillsDevelopment: 16.5,
      enterpriseSupplierDev: 37.0,
      socioEconomicDev: 4.5,
    },
    location: 'Sandton, Gauteng',
  },
  {
    id: 'sup-6',
    name: 'Apex Consulting Africa',
    registrationNumber: '2008/112948/07',
    beeLevel: 8,
    blackOwnership: 0,
    blackWomenOwnership: 0,
    status: 'Expired',
    certificateNumber: 'BEE-APX-88203',
    expiryDate: '2025-05-20',
    sector: 'Generic Sector',
    contactEmail: 'regulatory@apexconsulting.co.za',
    contactPhone: '+27 (0) 21 422 1044',
    totalScore: 42.0,
    breakdown: {
      ownership: 0.0,
      managementControl: 10.0,
      skillsDevelopment: 12.0,
      enterpriseSupplierDev: 18.0,
      socioEconomicDev: 2.0,
    },
    location: 'Cape Town CBD, Western Cape',
  }
];

/**
 * Default mock tenders data with custom bids
 */
export const DEFAULT_TENDERS: Tender[] = [
  {
    id: 'ten-1',
    referenceNumber: 'RT50-2026',
    title: 'Provision of Hybrid Solar Power Infrastructure for Gauteng Health Facilities',
    department: 'Gauteng Department of Health',
    budget: 45000000, // R45,000,000 (Fits 80/20 standard)
    systemType: '80/20',
    status: 'Evaluation',
    closingDate: '2026-08-15',
    description: 'Procurement, installation, and long-term maintenance of hybrid solar and backup battery storage solutions across five tertiary hospitals in Gauteng.',
    scopeOfWork: [
      'Site audit of existing grid-tie backup diesel generator capabilities',
      'Installation of tier-1 solar photovoltaic system panels (minimum 2.5 MW combined capacity)',
      'Lithium iron phosphate (LFP) energy storage units integration',
      'SCADA system for real-time remote telemetry and energy management',
      'Skills transfer program to local technicians and hospital operations staff'
    ],
    bids: [
      {
        id: 'bid-1-1',
        supplierId: 'sup-1',
        supplierName: 'Vukani Technologies (Pty) Ltd',
        priceClaimed: 41200000, // Lowest Acceptable
        beeLevel: 1,
        scorePrice: 80, // Highest possible
        scoreBee: 20,   // Level 1 yields 20 pts
        scoreTotal: 100,
        isCompliant: true,
        remarks: 'Highly technical engineering specifications. Fully compliant and certified components specified.',
        status: 'Best Choice'
      },
      {
        id: 'bid-1-2',
        supplierId: 'sup-2',
        supplierName: 'Phakamani Civil Engineering',
        priceClaimed: 44000000,
        beeLevel: 2,
        scorePrice: 74.56, // 80 * (1 - (44.0m - 41.2m)/41.2m) = 74.56
        scoreBee: 18,   // Level 2 yields 18 pts
        scoreTotal: 92.56,
        isCompliant: true,
        remarks: 'Strong experience in physical mounts and substructures. Slightly higher pricing.',
        status: 'Received'
      },
      {
        id: 'bid-1-3',
        supplierId: 'sup-5',
        supplierName: 'Motswako Energy Solutions',
        priceClaimed: 39900000, // Cheaper, but pending verification
        beeLevel: 3,
        // Vukani: 41.2m Pt -> scorePrice = 80 * (1 - (41.2 - 39.9)/39.9) = 77.39
        // This bid has a pending BBBEE status, which must be verified.
        scorePrice: 80,
        scoreBee: 14, // Level 3 yields 14 pts
        scoreTotal: 94.0,
        isCompliant: false, // Flagged because BBBEE certificate is 'Pending' / expired audit
        remarks: 'Cheapest pricing, but bidder has a Pending/Unverified BBBEE status. Subject to disqualification if not resolved by closing.',
        status: 'Disqualified'
      }
    ]
  },
  {
    id: 'ten-2',
    referenceNumber: 'RT102-2026',
    title: 'Integrated Secure Corporate Network & Unified Cloud Communications Suite',
    department: 'State Information Technology Agency (SITA)',
    budget: 120000000, // R120,000,000 (Fits 90/10 standard)
    systemType: '90/10',
    status: 'Open',
    closingDate: '2026-07-30',
    description: 'Implementation of an enterprise-grade SD-WAN network across 180 government office nodes, with integrated VOIP infrastructure, firewalls, and data center connectivity.',
    scopeOfWork: [
      'Architecture design of SD-WAN orchestration layer and local firewalls',
      'Hardware provisioning, installation, and routing configuration at 180 branch offices',
      'Deployment of cloud voice over IP (VOIP) system with central SIP trunking',
      'Establishment of direct high-speed links to state data centers in Pretoria and Cape Town',
      '24/7 Security Operations Centre (SOC) monitoring and proactive mitigation SLAs'
    ],
    bids: []
  },
  {
    id: 'ten-3',
    referenceNumber: 'RT15-2026',
    title: 'Supply and Delivery of Specialized Diagnostic Reagents for State Laboratories',
    department: 'National Department of Health',
    budget: 68000000, // R68,000,000 (90/10 system)
    systemType: '90/10',
    status: 'Awarded',
    closingDate: '2026-03-10',
    description: 'Bulk framework contract for the continuous procurement and temperature-controlled cold chain shipping of molecular diagnostic tests, biochemical reagents, and assays.',
    scopeOfWork: [
      'Regulatory compliance certification under South African Health Products Regulatory Authority (SAHPRA)',
      'Establishment of cold chain warehousing and logistics routes',
      'Consistent supply of high-sensitivity diagnostic reagents',
      'Quality control batch testing on each international shipment arrivals'
    ],
    bids: [
      {
        id: 'bid-3-1',
        supplierId: 'sup-4',
        supplierName: 'Sisonke Stationery & Office Supplies',
        priceClaimed: 64000000, // Not fully qualified for medical reagents, disqualified
        beeLevel: 1,
        scorePrice: 0,
        scoreBee: 10,
        scoreTotal: 10,
        isCompliant: false,
        remarks: 'Disqualified - Supplier core business is stationery; does not possess requisite SAHPRA license or cold-chain logistics capabilities.',
        status: 'Disqualified'
      },
      {
        id: 'bid-3-2',
        supplierId: 'sup-1',
        supplierName: 'Vukani Technologies (Pty) Ltd',
        priceClaimed: 58000000, // Lowest Acceptable
        beeLevel: 1,
        scorePrice: 90,
        scoreBee: 10, // Level 1 is 10 pts
        scoreTotal: 100,
        isCompliant: true,
        remarks: 'Partnered with international medical lab logistics. Excellent technical proposal.',
        status: 'Awarded'
      },
      {
        id: 'bid-3-3',
        supplierId: 'sup-3',
        supplierName: 'Ikwezi Logistics & Freight',
        priceClaimed: 61500000,
        beeLevel: 4,
        scorePrice: 84.57, // 90 * (1 - (61.5m - 58.0m)/58.0m) = 84.57
        scoreBee: 5,   // Level 4 is 5 pts
        scoreTotal: 89.57,
        isCompliant: true,
        remarks: 'Excellent logistical scores. Pricing slightly higher and BBBEE points are lower.',
        status: 'Received'
      }
    ]
  }
];
