import type { Action } from '../state/actions.js'

// Module-level state so trigger() can check across re-renders
export const mockFlowState = new Map<string, 'running' | 'ready'>()

// Per-finding diffs (realistic patches for each mock finding)
const MOCK_DIFFS: Record<string, string> = {
  'f-001': `--- a/src/auth/login.py\n+++ b/src/auth/login.py\n@@ -1,6 +1,4 @@\n-from flask import request, session, redirect, render_template\n-import psycopg2\n+from flask import request, session, redirect, render_template\n+import psycopg2\n \n def authenticate_user():\n     username = request.form.get('username', '')\n     password = request.form.get('password', '')\n     if not username or not password:\n         return render_template('login.html', error='Missing fields')\n     conn = psycopg2.connect(DATABASE_URL)\n     cursor = conn.cursor()\n-    # VULNERABLE: string concatenation into SQL query\n-    query = "SELECT * FROM users WHERE username='" + username + "' AND password='" + password + "'"\n-    cursor.execute(query)\n+    # FIXED: parameterized query prevents SQL injection\n+    query = "SELECT * FROM users WHERE username = %s AND password = %s"\n+    cursor.execute(query, (username, password))\n     user = cursor.fetchone()\n     if user:\n         session['user_id'] = user[0]\n         session['role'] = user[3]\n         return redirect('/dashboard')\n     return render_template('login.html', error='Invalid credentials')`,

  'f-002': `--- a/lib/serializer.rb\n+++ b/lib/serializer.rb\n@@ -9,7 +9,7 @@\n   def import(raw_data)\n     case @format\n     when :yaml\n-      # VULNERABLE: YAML.load allows arbitrary object instantiation\n-      data = YAML.load(raw_data)\n+      # FIXED: safe_load restricts to basic types only\n+      data = YAML.safe_load(raw_data, permitted_classes: [])\n     when :json\n       data = JSON.parse(raw_data, symbolize_names: true)\n     end\n     process(data)\n   end`,

  'f-003': `--- a/components/Search.jsx\n+++ b/components/Search.jsx\n@@ -1,4 +1,5 @@\n import React, { useState, useEffect } from 'react'\n+import DOMPurify from 'dompurify'\n \n export function SearchResults({ query }) {\n   const [results, setResults] = useState([])\n@@ -11,8 +12,9 @@\n   // FIXED: sanitize before rendering any HTML\n   return (\n     <div className="results">\n-      <h2 dangerouslySetInnerHTML={{ __html: 'Results for: ' + query }} />\n+      <h2>{\`Results for: \${query}\`}</h2>\n       {results.map(item => (\n-        <div key={item.id} dangerouslySetInnerHTML={{ __html: item.title }} />\n+        <div key={item.id} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item.title) }} />\n       ))}\n     </div>\n   )\n }`,

  'f-004': `--- a/.env.production\n+++ b/.env.production\n@@ -8,8 +8,8 @@\n # AWS — credentials must come from IAM role or Secrets Manager\n-AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE\n-AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY\n+AWS_ACCESS_KEY_ID=\n+AWS_SECRET_ACCESS_KEY=\n AWS_DEFAULT_REGION=us-east-1\n AWS_S3_BUCKET=prod-assets-bucket\n \n-STRIPE_SECRET_KEY=sk_example_REDACTED\n+STRIPE_SECRET_KEY=\n \n-JWT_SECRET=hardcoded-jwt-secret-do-not-ship\n+JWT_SECRET=`,

  'f-005': `--- a/routes/users.py\n+++ b/routes/users.py\n@@ -1,5 +1,6 @@\n from flask import Flask, request, jsonify, session\n from functools import wraps\n+from flask_wtf.csrf import CSRFProtect, validate_csrf\n import database as db\n \n app = Flask(__name__)\n+csrf = CSRFProtect(app)\n \n def login_required(f):\n@@ -15,6 +17,8 @@\n @login_required\n def update_user(user_id):\n-    # VULNERABLE: no CSRF token validation on state-changing endpoint\n+    # FIXED: validate CSRF token before processing\n+    validate_csrf(request.headers.get('X-CSRFToken'))\n     data = request.get_json()\n     db.users.update(user_id, {'email': data.get('email'), 'role': data.get('role')})\n     return jsonify({'status': 'updated', 'user_id': user_id})`,
}

const DEFAULT_DIFF = MOCK_DIFFS['f-001']

function ts(): string {
  const now = new Date()
  const h = String(now.getHours()).padStart(2, '0')
  const m = String(now.getMinutes()).padStart(2, '0')
  const s = String(now.getSeconds()).padStart(2, '0')
  return `[${h}:${m}:${s}]`
}

type Step = { delay: number; pct: number; label: string; done?: boolean }

const FINDING_STEPS: Record<string, Step[]> = {
  'f-001': [
    { delay: 500,  pct: 8,   label: 'Initializing remediation agent' },
    { delay: 700,  pct: 16,  label: 'Fetching repository context: src/auth/login.py' },
    { delay: 600,  pct: 24,  label: 'Analyzing vulnerability: SQL Injection (CWE-89)' },
    { delay: 800,  pct: 33,  label: 'Root cause: unsafe string concatenation into cursor.execute()' },
    { delay: 700,  pct: 42,  label: 'Checking test coverage for authenticate_user()' },
    { delay: 800,  pct: 52,  label: 'Generating parameterized query replacement' },
    { delay: 600,  pct: 62,  label: 'Rewriting query with %s placeholders + tuple params' },
    { delay: 900,  pct: 73,  label: 'Running test suite: tests/test_auth.py' },
    { delay: 700,  pct: 82,  label: '12/12 tests passing', done: true },
    { delay: 700,  pct: 90,  label: 'Static analysis: verifying patch with semgrep' },
    { delay: 600,  pct: 96,  label: 'No SQL injection patterns detected in patched code', done: true },
    { delay: 400,  pct: 100, label: 'Generating unified diff' },
  ],
  'f-002': [
    { delay: 500,  pct: 8,   label: 'Initializing remediation agent' },
    { delay: 700,  pct: 16,  label: 'Fetching repository context: lib/serializer.rb' },
    { delay: 600,  pct: 24,  label: 'Analyzing vulnerability: Unsafe deserialization (CWE-502)' },
    { delay: 800,  pct: 33,  label: 'Root cause: YAML.load() instantiates arbitrary Ruby objects' },
    { delay: 700,  pct: 42,  label: 'Checking Ruby version compatibility for safe_load' },
    { delay: 800,  pct: 52,  label: 'Replacing YAML.load with YAML.safe_load(permitted_classes: [])' },
    { delay: 600,  pct: 62,  label: 'Applying fix to lib/serializer.rb:14' },
    { delay: 900,  pct: 73,  label: 'Running RSpec: spec/serializer_spec.rb' },
    { delay: 700,  pct: 82,  label: '8/8 examples passing, 0 failures', done: true },
    { delay: 700,  pct: 90,  label: 'Brakeman scan: checking for remaining gadget chains' },
    { delay: 600,  pct: 96,  label: 'No deserialization vulnerabilities detected', done: true },
    { delay: 400,  pct: 100, label: 'Generating unified diff' },
  ],
}

const DEFAULT_STEPS: Step[] = [
  { delay: 500,  pct: 8,   label: 'Initializing remediation agent' },
  { delay: 700,  pct: 20,  label: 'Fetching repository context' },
  { delay: 800,  pct: 35,  label: 'Analyzing vulnerability root cause' },
  { delay: 900,  pct: 50,  label: 'Generating secure code replacement' },
  { delay: 800,  pct: 65,  label: 'Applying fix' },
  { delay: 900,  pct: 80,  label: 'Running test suite' },
  { delay: 700,  pct: 92,  label: 'Tests passing — verifying with static analysis', done: true },
  { delay: 500,  pct: 100, label: 'Generating unified diff' },
]

function getSteps(findingId: string): Step[] {
  return FINDING_STEPS[findingId] ?? DEFAULT_STEPS
}

function fmtStep(step: Step): string {
  const prefix = step.done ? '✓' : '▸'
  return `${ts()} ${prefix} ${step.label}`
}

export function getMockDiff(findingId: string): string {
  return MOCK_DIFFS[findingId] ?? DEFAULT_DIFF
}

export async function runMockRemediationFlow(
  findingId: string,
  findingTitle: string,
  dispatch: (action: Action) => void,
): Promise<void> {
  mockFlowState.set(findingId, 'running')

  dispatch({
    type: 'status/open',
    payload: {
      type: 'remediation',
      id: findingId,
      name: findingTitle,
      status: 'running',
      progress: 0,
      logs: [],
    },
  })

  const steps = getSteps(findingId)
  for (const step of steps) {
    await new Promise<void>(resolve => setTimeout(resolve, step.delay))
    dispatch({
      type: 'status/update',
      payload: {
        id: findingId,
        status: 'running',
        progress: step.pct,
        logs: [fmtStep(step)],
      },
    })
  }

  await new Promise<void>(resolve => setTimeout(resolve, 500))

  mockFlowState.set(findingId, 'ready')

  dispatch({
    type: 'status/update',
    payload: {
      id: findingId,
      status: 'ready',
      progress: 100,
      logs: [`${ts()} ✓ Remediation complete — press p to create PR`],
    },
  })
}
