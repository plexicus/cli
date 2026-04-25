const RESET = "\x1b[m"
const BOLD = "\x1b[1m"
const DIM = "\x1b[2m"
const PURPLE = "\x1b[38;2;146;65;255m"

const FAVICON_LINES = [
  "\x1b[49m \x1b[38;2;146;59;254;49m▄\x1b[38;2;144;62;252;49m▄\x1b[38;2;144;60;252;49m▄\x1b[38;2;145;60;253;49m▄\x1b[38;2;144;66;252;49m▄\x1b[38;2;144;69;255;49m▄\x1b[49m \x1b[m",
  "\x1b[38;2;141;54;250;49m▄\x1b[38;2;175;116;250;48;2;150;72;252m▄\x1b[38;2;203;194;215;48;2;186;139;252m▄\x1b[38;2;239;229;252;48;2;205;167;253m▄\x1b[38;2;239;229;253;48;2;202;165;253m▄\x1b[38;2;202;193;212;48;2;185;135;251m▄\x1b[38;2;175;117;250;48;2;150;73;254m▄\x1b[38;2;142;55;251;49m▄\x1b[m",
  "\x1b[38;2;146;72;236;48;2;130;37;252m▄\x1b[38;2;155;83;253;48;2;159;100;233m▄\x1b[38;2;202;177;239;48;2;22;24;25m▄\x1b[38;2;226;208;252;48;2;212;204;224m▄\x1b[38;2;229;211;253;48;2;220;213;233m▄\x1b[38;2;205;179;239;48;2;22;24;25m▄\x1b[38;2;155;80;252;48;2;154;98;228m▄\x1b[38;2;137;58;254;48;2;130;37;252m▄\x1b[m",
  "\x1b[49m \x1b[49;38;2;146;70;255m▀\x1b[49;38;2;145;66;253m▀\x1b[49;38;2;151;75;253m▀\x1b[49;38;2;151;77;250m▀\x1b[49;38;2;149;69;252m▀\x1b[49;38;2;140;67;247m▀\x1b[49m \x1b[m",
]

export function printSplash(version: string, serverUrl?: string): void {
  const host = serverUrl ? (() => { try { return new URL(serverUrl).hostname } catch { return serverUrl } })() : null
  const textLines = [
    `  ${BOLD}${PURPLE}PLEXICUS${RESET}  ${DIM}v${version}${RESET}`,
    host ? `  ${DIM}${host}${RESET}` : "",
    "",
    "",
  ]

  for (let i = 0; i < FAVICON_LINES.length; i++) {
    process.stdout.write(FAVICON_LINES[i] + (textLines[i] ?? "") + "\n")
  }
  process.stdout.write("\n")
}
