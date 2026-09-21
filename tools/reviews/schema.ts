import { z } from "zod";

export const Materialization = z.enum(["PUBLICLY_MATERIALIZED", "NOT_PUBLICLY_MATERIALIZED"]);
export const LegalDecision = z.enum([
  "CLEARED",
  "CLEARED_WITH_CONDITIONS",
  "NOT_CLEARED",
  "REQUIRES_FURTHER_REVIEW",
]);
export const Od14Decision = z.enum(["APPROVED", "REVISIONS_REQUIRED", "REJECTED"]);
export const ChecklistResult = z.enum(["PASS", "ISSUE", "N/A"]);
export const ReviewFileStatus = z.enum(["PENDING", "COMPLETED"]);

export const HumanReview = z.strictObject({
  schema: z.literal("aletheia-web/web-2-human-review/1"),
  status: ReviewFileStatus,
  project: z.literal("ALETHEIA-WEB"),
  release: z.literal("WEB-2"),
  reviewed_commit: z.string().regex(/^[0-9a-f]{40}$/),
  production_url: z.string().startsWith("https://"),
  package_generated_at: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/),
  reviewer: z.string(),
  relationship_to_project: z.string(),
  author_name: z.string(),
  reviewer_equals_author: z.boolean().nullable(),
  review_date: z.string(),
  signature: z.string(),
  observations: z.string(),
  required_changes: z.string(),
  decision: z.union([Od14Decision, z.literal("")]),
  checklist: z.array(
    z.strictObject({
      id: z.number().int().min(1),
      item: z.string().min(1),
      result: z.union([ChecklistResult, z.literal("")]),
    }),
  ),
});
export type HumanReviewT = z.infer<typeof HumanReview>;

export const LegalItemDecision = z.strictObject({
  id: z.string().min(1),
  review_date: z.string(),
  reviewer: z.string(),
  decision: z.union([LegalDecision, z.literal("")]),
  attribution_required: z.string(),
  sharealike_applicable: z.string(),
  publisher_link_required: z.string(),
  conditions: z.string(),
  notes: z.string(),
  evidence_reference: z.string(),
  signature: z.string(),
});
export type LegalItemDecisionT = z.infer<typeof LegalItemDecision>;

export const CgiSection = z.strictObject({
  root_id: z.literal("LAB-ROOT-0002"),
  attribution_to_indec: z.string(),
  cgi_imo_denomination: z.string(),
  cc_by_sa_4_0_reference: z.string(),
  license_link: z.string(),
  sharealike: z.string(),
  published_derivatives_nature: z.string(),
  sobre_changes_required: z.string(),
});

export const LegalReview = z.strictObject({
  schema: z.literal("aletheia-web/web-2-legal-review/1"),
  status: ReviewFileStatus,
  reviewed_commit: z.string().regex(/^[0-9a-f]{40}$/),
  production_url: z.string().startsWith("https://"),
  package_generated_at: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/),
  warning: z.string().min(1),
  reviewer: z.string(),
  review_date: z.string(),
  signature: z.string(),
  required_public_attribution_changes: z.string(),
  cgi_cc_by_sa: CgiSection,
  items: z.array(LegalItemDecision),
  derived_types: z.array(
    z.strictObject({
      id: z.string().min(1),
      clearance: z.union([LegalDecision, z.literal("PENDING"), z.literal("")]),
      notes: z.string(),
    }),
  ),
});
export type LegalReviewT = z.infer<typeof LegalReview>;
