import { z } from 'zod'

export const FindingSchema = z.object({
  id: z.string(),
  severity: z.enum(['critical', 'high', 'medium', 'low', 'informational']),
  name: z.string(),
  cve_id: z.string().nullable(),
  repo: z.string(),
  file: z.string().nullable(),
  line: z.number().nullable(),
  cvss_score: z.number().nullable(),
  status: z.enum(['open', 'mitigated', 'false_positive']),
  description: z.string().nullable(),
  created_at: z.string(),
})

export const RepositorySchema = z.object({
  id: z.string(),
  nickname: z.string(),
  uri: z.string(),
  source_control: z.string(),
  scan_status: z.enum(['idle', 'scanning', 'completed', 'failed']),
})

export const RemediationSchema = z.object({
  id: z.string(),
  finding_id: z.string(),
  diff: z.string().nullable(),
  status: z.enum(['pending', 'ready', 'applied']),
  auto_create: z.boolean(),
})

export const PRSchema = z.object({
  remediation_id: z.string(),
  url: z.string(),
  status: z.string(),
})

export const ApiTokenSchema = z.object({
  id: z.string(),
  name: z.string(),
  token: z.string(),
  created_at: z.string(),
})

export const SessionUserSchema = z.object({
  id: z.string(),
  email: z.string(),
})

export const LoginResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string().default('Bearer'),
  requires_2fa: z.boolean().optional(),
})

export const FindingsListSchema = z.array(FindingSchema)
export const RepositoriesListSchema = z.array(RepositorySchema)
export const RemediationsListSchema = z.array(RemediationSchema)
export const ApiTokensListSchema = z.array(ApiTokenSchema)
