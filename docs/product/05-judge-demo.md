# F. Judge Demo: "Illegal dumping in Soshanguve: from a problem to 34.7% fewer hotspots"

**Length:** 7 minutes (a 5-minute cut is marked ✂). **Setup:** `docker compose up`, open http://localhost:3000, *Settings → Reset demo data*. Keep two tabs open: the executive dashboard and a working tab.

Seeded starting point: the **Illegal Dumping Monitoring Solution** need (Environmental Services, R500 000) is approved, and its opportunity **OPP-2026-003** has closed with **3 submissions** (CleanSight SA R420 000 L1, EcoVision R390 000 L2, GlobalTech R350 000 L4). Two of the three are already evaluated. Other seeded projects fill the dashboards (a completed water-leak project, an in-progress digital permit service, an at-risk streetlight project, a pending low-value quotation, an overdue approval).

---

### 0:00 The problem (30 s)
> "Mzansi Metro has a growing illegal-dumping problem across 12 wards. Today it would go to the usual suppliers, and nobody would know if it worked. CIVICFLOW follows that problem all the way to measurable impact."

Show the **Executive dashboard**: investment, active opportunities, projects at risk, SLA breaches, and the lifecycle funnel.

### 0:30 Need → budget → approval (90 s) ✂ show only the journey
1. Log in as **Thandi (Department Officer)** and open *Public Needs → New need*.
2. Type a quick need: "Smart bins for taxi rank", R48 000, *Quotation*. Point out the **live budget panel** (allocated / committed / available) and the routing preview: **"R5 000–R50 000 → Department Manager"**. Submit.
3. Switch to **Sipho (Department Manager)**. The **Approvals inbox** shows it with a 48 h SLA countdown. Approve. (The seeded **overdue** request, PR-2026-009, belongs to ICT, so it shows under *All requests* rather than in Sipho's own inbox.)
4. Open the **Illegal Dumping** need → **Journey** tab. It shows NEED_CREATED → BUDGET_VALIDATED → approved by Sipho → approved by **Lerato (Finance Director)** because it's above R50 000.

### 2:00 Opportunity → local solutions (60 s)
1. Log in as **Nomsa (CleanSight SA provider)** and open the **Opportunities** marketplace. Filter by province: Gauteng.
2. Open *Illegal Dumping Intelligence Platform*. Point out the problem, budget, required capabilities, map location and the **evaluation criteria with weights**, which are published up front.
3. Open the **Solutions registry**, filter *Open source*, and show *OpenWard DumpWatch-Lite* (MIT licence, 3 deployments). "Innovations are discoverable, not only suppliers."

### 3:00 Transparent evaluation (90 s)
1. Log in as **Johan (Procurement Officer)** → *Evaluations → OPP-2026-003*.
2. Score **CleanSight**: Technical 90, Suitability 90, with a rationale. Complete.
3. The ranking table shows **CleanSight 90.0 · EcoVision 84.4 · GlobalTech 76.0**. Expand the breakdown: *GlobalTech is cheapest (price 100/100) but scores 60 on B-BBEE and 70 on local participation*.
4. Try to select **GlobalTech**. CIVICFLOW **demands a justification** because it isn't the recommended option. Cancel, then select **CleanSight**, which needs no justification.
5. Point out: "*The AI never chooses. CIVIC AI can summarise proposals, but Johan decides, and the rule engine records why.*"

### 4:30 Provider becomes supplier → PO (40 s)
1. CleanSight appears under **Suppliers → Pending verification**. Enter the CSD number and tick *Tax compliant* → **ACTIVE**.
2. **Issue the PO**: PO-2026-0004 for R420 000. Pick **Sipho** as implementation manager and set the **start date three months back** (e.g. today minus 90 days), so the impact results in the next step are dated after delivery began. Show the Environmental Services budget: committed now counts the R420 000 PO value instead of the R500 000 request estimate, so R80 000 is released back to *available*.

### 5:10 Implementation → impact (80 s)
1. Log in as **Sipho** → *Implementations → Illegal Dumping*. Add a milestone, post an **Evidence** update (a photo link) and set progress to 100%.
2. On the **Impact** tab, click the suggested templates (*Illegal dumping hotspots, Wards covered, Jobs supported, Local SMEs supported*). Enter baseline **147**, target **100**, then record a measurement of **96** (dated today, the default, with an evidence link; CIVICFLOW rejects measurements dated in the future or before the implementation's start date). The status becomes **ACHIEVED** and the change **−34.7%**. Record wards 12, jobs 8, SMEs 1.
3. Complete the implementation (allowed because evidence exists, per BR-14).

### 6:30 Executive outcome + audit (30 s)
1. Log in as **Ayesha (Executive)**. The dashboard now reads **R420 000 invested → 12 wards → 1 local SME → 8 jobs → 34.7% fewer tracked dumping hotspots**.
2. Click **CIVIC AI → Executive briefing**. It returns a grounded summary that cites record references and is labelled *draft*.
3. **Audit log → Verify chain**: ✅ intact. "*Every step from NEED_CREATED to IMPACT_UPDATED is here and tamper-evident.*"

### 7:00 Close
> "CIVICFLOW is not procurement software with a marketplace bolted on. It's one lifecycle: public need → local innovation → transparent procurement → implementation → measurable impact."

---

## Fallbacks
- **AI key missing or offline:** CIVIC AI shows *Deterministic mode*, with the same grounded content.
- **Something breaks mid-demo:** *Settings → Reset demo data* (admin) restores everything in seconds.
- **No time for live scoring:** complete the CleanSight evaluation beforehand and start at the ranking table.
