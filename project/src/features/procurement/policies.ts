/**
 * Demo Configuration Policies for Procurement Module.
 * Note: These explicit demo policies represent operational defaults where company-specific
 * threshold rules or scoring matrices are unspecified in the contract.
 *
 * Missing required policy must not silently grant approval.
 */

export interface DemoApprovalStepPolicy {
  sequence: number;
  title: string;
  policyId: string;
  role: "APPROVER";
  description: string;
}

export const DEMO_POLICIES = {
  label: "DEMO CONFIGURATION — UltraOps Procurement Approval & Evaluation Policy",
  notes:
    "Configurable demo thresholds and weights. Missing policy must never silently approve.",

  /**
   * Value thresholds for Purchase Order approvals (in safe integer IDR minor units: 100 = Rp1).
   * Tier 1: <= Rp50,000,000 (5,000,000,000 minor units) -> 1 level (Procurement Manager)
   * Tier 2: <= Rp250,000,000 (25,000,000,000 minor units) -> 2 levels (Procurement Manager, Finance Manager)
   * Tier 3: > Rp250,000,000 -> 3 levels (Procurement Manager, Finance Manager, Director)
   */
  poApprovalTiers: {
    tier1LimitMinor: 5_000_000_000, // Rp50M
    tier2LimitMinor: 25_000_000_000, // Rp250M
  },

  /**
   * Documented Review Rule for Suspected PO Splitting:
   * Rather than pretending to guess subjective intent, this rule objectively evaluates whether
   * the same supplier has received multiple purchase orders on the same calendar day whose
   * combined value exceeds the splitting threshold (Rp100,000,000 / 10,000,000,000 minor units).
   * When triggered, approval is escalated to include Executive Director review.
   */
  poSplittingThresholdMinor: 10_000_000_000, // Rp100M

  /**
   * Multi-criteria supplier evaluation policy:
   * Weights must sum to 100.
   */
  supplierEvaluationCriteria: [
    {
      id: "crit_quality",
      name: "Quality & Specifications Compliance",
      weight: 25,
      description: "Sample test results, COA conformance, defect rate history",
    },
    {
      id: "crit_capacity",
      name: "Manufacturing & Production Capacity",
      weight: 15,
      description: "Scale of output, facility readiness, surge order buffer",
    },
    {
      id: "crit_delivery",
      name: "Delivery & Lead Time Reliability",
      weight: 20,
      description: "Promised lead days, on-time delivery track record, logistics",
    },
    {
      id: "crit_price",
      name: "Commercial Terms & Price Competitiveness",
      weight: 20,
      description: "Unit price, payment terms, volume discount discounts",
    },
    {
      id: "crit_legal",
      name: "Qualification & Legal Document Validity",
      weight: 10,
      description: "NIB, SIUP, Halal cert, BPOM registration, ISO certifications",
    },
    {
      id: "crit_risk",
      name: "Supply Chain & Financial Risk",
      weight: 10,
      description: "Single-source dependency, geographic risk, supplier solvency",
    },
  ],
} as const;

/**
 * Derives required approval steps for a Purchase Order based on total value and splitting checks.
 */
export function getRequiredApprovalSteps(
  totalMinor: number,
  isSplittingSuspected: boolean,
): DemoApprovalStepPolicy[] {
  const steps: DemoApprovalStepPolicy[] = [
    {
      sequence: 1,
      title: "Procurement Manager",
      policyId: "POL_DEMO_PROC_MGR",
      role: "APPROVER",
      description: "Verify procurement compliance, price benchmarks, and supplier selection",
    },
  ];

  if (totalMinor > DEMO_POLICIES.poApprovalTiers.tier1LimitMinor || isSplittingSuspected) {
    steps.push({
      sequence: 2,
      title: "Finance Manager",
      policyId: "POL_DEMO_FIN_MGR",
      role: "APPROVER",
      description: "Verify budget allocation, payment terms, and cash flow authorization",
    });
  }

  if (totalMinor > DEMO_POLICIES.poApprovalTiers.tier2LimitMinor || isSplittingSuspected) {
    steps.push({
      sequence: steps.length + 1,
      title: "Executive Director",
      policyId: isSplittingSuspected ? "POL_DEMO_SPLIT_DIRECTOR" : "POL_DEMO_DIRECTOR",
      role: "APPROVER",
      description: isSplittingSuspected
        ? "Mandatory executive review triggered by cumulative supplier day-volume exceeding Rp100M"
        : "Executive expenditure sign-off for orders exceeding Rp250M",
    });
  }

  return steps;
}
