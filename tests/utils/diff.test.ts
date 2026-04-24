import { describe, it, expect } from 'bun:test'
import { parseDiff } from '../../src/utils/diff.js'

const SAMPLE_DIFF = `--- a/src/auth/login.py
+++ b/src/auth/login.py
@@ -40,7 +40,8 @@
 def login(email, password):
-    query = f"SELECT * FROM users WHERE email='{email}'"
+    query = "SELECT * FROM users WHERE email=?"
+    cursor.execute(query, (email,))
     result = cursor.execute(query)`

describe('parseDiff', () => {
  it('returns empty array for empty string', () => {
    expect(parseDiff('')).toEqual([])
    expect(parseDiff('   ')).toEqual([])
  })

  it('parses add lines', () => {
    const lines = parseDiff('+added line')
    expect(lines[0]).toEqual({ type: 'add', content: 'added line' })
  })

  it('parses remove lines', () => {
    const lines = parseDiff('-removed line')
    expect(lines[0]).toEqual({ type: 'remove', content: 'removed line' })
  })

  it('treats +++ and --- as header not add/remove', () => {
    const lines = parseDiff('--- a/file.py\n+++ b/file.py')
    expect(lines[0].type).toBe('header')
    expect(lines[1].type).toBe('header')
  })

  it('parses @@ lines as header', () => {
    const lines = parseDiff('@@ -1,3 +1,4 @@')
    expect(lines[0].type).toBe('header')
  })

  it('parses a full unified diff', () => {
    const lines = parseDiff(SAMPLE_DIFF)
    const addLines = lines.filter(l => l.type === 'add')
    const removeLines = lines.filter(l => l.type === 'remove')
    expect(addLines.length).toBe(2)
    expect(removeLines.length).toBe(1)
  })
})
