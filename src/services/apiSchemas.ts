import { z } from 'zod'

const FindingAttributesSchema = z.object({
  title: z.string(),
  severity: z.enum(['critical', 'high', 'medium', 'low', 'informational']),
  severity_numerical: z.number().nullable().default(null),
  status: z.enum(['open', 'mitigated', 'enriched']).default('open'),
  type: z.enum(['SAST', 'SCA', 'DAST']).nullable().default(null),
  category: z.string().nullable().default(null),
  tool: z.string().nullable().default(null),
  language: z.string().nullable().default(null),
  file_path: z.string().nullable().default(null),
  line: z.number().nullable().default(null),
  cwe: z.number().nullable().default(null),
  extra_cwe: z.array(z.number()).default([]),
  cvssv3_score: z.number().nullable().default(null),
  cvssv4_score: z.number().nullable().default(null),
  prioritization_value: z.number().nullable().default(null),
  effort_for_fixing: z.number().nullable().default(null),
  exploitability: z.number().nullable().default(null),
  impact: z.number().nullable().default(null),
  confidence: z.number().nullable().default(null),
  estimated_epss: z.number().nullable().default(null),
  repo_id: z.string(),
  date: z.string(),
  is_false_positive: z.boolean().default(false),
  is_duplicate: z.boolean().default(false),
  is_sandbox: z.boolean().default(false),
  owasps: z.array(z.string()).default([]),
  policy_rules: z.array(z.unknown()).default([]),
  tags: z.array(z.string()).default([]),
  cve: z.string().nullable().default(null),
  description: z.string().nullable().default(null),
  mitigation: z.string().nullable().default(null),
  single_line_code: z.string().nullable().default(null),
  policy_name: z.string().nullable().default(null),
})

export const FindingItemSchema = z.object({
  id: z.string(),
  attributes: FindingAttributesSchema,
})

const PaginationSchema = z.object({
  page: z.number(),
  pageCount: z.number(),
  pageSize: z.number(),
  total: z.number(),
})

export const FindingsResponseSchema = z.object({
  data: z.array(FindingItemSchema),
  meta: z.object({ pagination: PaginationSchema }).optional(),
})

export const SingleFindingResponseSchema = z.object({
  data: FindingItemSchema,
  meta: z.unknown().optional(),
})

const RepoAttributesSchema = z.object({
  nickname: z.string(),
  uri: z.string(),
  active: z.boolean().default(true),
  repo_type: z.string().default('github'),
  status: z.string().default('active'),
  data: z.object({
    branch: z.string().optional(),
    source_control: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }).optional(),
  findings: z.object({
    total: z.number().default(0),
    critical: z.number().default(0),
    high: z.number().default(0),
    medium: z.number().default(0),
    low: z.number().default(0),
    info: z.number().default(0),
  }).optional(),
})

export const RepoItemSchema = z.object({
  id: z.string(),
  attributes: RepoAttributesSchema,
})

export const RepositoriesResponseSchema = z.object({
  data: z.array(RepoItemSchema),
  meta: z.object({ pagination: PaginationSchema }).optional(),
})

export const RemediationSchema = z.object({
  id: z.string(),
  finding_id: z.string(),
  diff: z.string().nullable(),
  status: z.enum(['pending', 'ready', 'applied']),
  auto_create: z.boolean(),
})

export const RemediationsCollectionSchema = z.object({
  items: z.array(RemediationSchema),
  next: z.string().nullable().optional(),
  prev: z.string().nullable().optional(),
})

export const PRSchema = z.object({
  remediation_id: z.string(),
  url: z.string(),
  status: z.string(),
})

export const ApiTokenListItemSchema = z.object({
  name: z.string(),
  created_at: z.string(),
  expires_at: z.string().nullable().optional(),
  token_type: z.string().default('api'),
})

export const ApiTokenCreatedSchema = z.object({
  id: z.string(),
  name: z.string(),
  token: z.string(),
  created_at: z.string(),
})

export const ApiTokensListSchema = z.array(ApiTokenListItemSchema)
export const RemediationsListSchema = z.array(RemediationSchema)

export const SessionUserSchema = z.object({
  user_id: z.string(),
  client_id: z.string(),
  email: z.string(),
}).transform(u => ({ id: u.user_id, client_id: u.client_id, email: u.email }))

export const LoginResponseFlatSchema = z.object({
  access_token: z.string(),
  token_type: z.string().default('Bearer'),
})

export const LoginResponse2FASchema = z.object({
  otp_data: z.object({ secret: z.string() }),
  requires_2fa: z.literal(true),
  message: z.string(),
})

export const LoginResponseUnion = z.union([LoginResponseFlatSchema, LoginResponse2FASchema])

export const Verify2FAResponseSchema = z.object({
  verify_otp: z.boolean(),
  access_token: z.string().optional(),
  token_type: z.string().optional(),
})

export const LoginResponseSchema = LoginResponseFlatSchema
