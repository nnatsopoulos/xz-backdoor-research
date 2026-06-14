/*
  CVE-2024-3094 Research Toolkit — Application Logic
  Copyright (c) 2026 Nikolaos Natsopoulos
  MIT License
*/

// ── Colour constants (used in SVG) ────────────────────────────────────────────
const C = {
  bg:'#0D1117', surface:'#161B22', border:'#21262D',
  border2:'#30363D', text:'#C9D1D9', muted:'#8B949E',
  blue:'#58A6FF', red:'#F85149', green:'#3FB950', yellow:'#E3B341',
};

// ── Attack phase data ─────────────────────────────────────────────────────────
const phases = [
  { color:'blue', eyebrow:'Phase 0 · Jan 2021', heading:'Account Creation & Dormancy',
    body:'The GitHub account JiaT75 (Jia Tan) is registered on 26 January 2021. No activity follows for months.\n\nThis dormancy period is consistent with operational preparation — establishing a persistent identity with an aged creation date to reduce suspicion on future contributions.',
    code:null, tags:[['blue','T1078 — Valid Accounts'],['blue','Identity Fabrication']], iam:null, chainState:'clean' },

  { color:'blue', eyebrow:'Phase 1 · Jan–Nov 2022', heading:'Legitimate Contribution Phase',
    body:'JiaT75 begins submitting technically sound, genuinely helpful patches to XZ Utils and other projects including libarchive. Over 450 commits across 2+ years.\n\nOne early libarchive PR subtly replaced safe_fprintf() with the unsafe fprintf(). Otherwise, work is entirely legitimate.\n\nThis phase builds the reputation capital that will later be spent.',
    code:[{t:'c',v:'# libarchive PR — ostensibly innocuous'},{t:'r',v:'- safe_fprint(f, ...);'},{t:'g',v:'+ fprintf(f, ...);'},{t:'c',v:'# Replaces safe variant with unsafe one'}],
    tags:[['yellow','Supply Chain Prep'],['blue','T1195.001 — Software Dependencies']], iam:null, chainState:'clean' },

  { color:'yellow', eyebrow:'Phase 2 · Apr–Jun 2022', heading:'Sockpuppet Pressure Campaign',
    body:'Coordinated fake identities — Jigar Kumar, Dennis Ens, krygorin4545, misoeater91 — appear on the xz-devel mailing list.\n\nAll accounts created post-2021. All pressure Lasse Collin (sole XZ maintainer) to delegate maintenance, citing slow releases and burnout.\n\nCollin — a single volunteer maintaining infrastructure used by millions — responds to what appears to be legitimate community concern.',
    code:[{t:'c',v:'# xz-devel mailing list, ~Apr 2022'},{t:'y',v:'"Jia Tan seems very capable. Why not'},{t:'y',v:' give him commit access?"'},{t:'c',v:'                — Jigar Kumar (fake)'}],
    tags:[['yellow','Social Engineering'],['yellow','T1585 — Establish Accounts'],['red','Insider Threat Pattern']], iam:null, chainState:'clean' },

  { color:'yellow', eyebrow:'Phase 3 · Dec 2022 – Mar 2023', heading:'Maintainer Role Acquired',
    body:'JiaT75 gains co-maintainer status. The XZ project migrates from SourceForge to GitHub — with JiaT75 creating the organisation and setting their email as the default project contact.\n\nJia Tan makes their first solo release (v5.4.2) on 18 March 2023, after Lasse Collin\'s final release (v5.4.1) on 11 January 2023.\n\nFor the IAM analyst: this is privilege escalation via social trust — no technical exploit was needed to gain release authority.',
    code:[{t:'c',v:'# Dec 2022 — GitHub org created by JiaT75'},{t:'n',v:'github.com/tukaani-project/xz'},{t:'y',v:'Owner:   JiaT75 (attacker)'},{t:'c',v:'Contact: xz@tukaani.org -> attacker email'},{t:'g',v:'Collin:  contributor (no longer sole owner)'}],
    tags:[['red','Privilege Escalation'],['yellow','T1098 — Account Manipulation'],['red','No Dual Control']],
    iam:{ control:'Maintainer Role Grant', failure:'Single-person approval for privileged role. No background verification. No formal offboarding process defined.' },
    chainState:'clean' },

  { color:'yellow', eyebrow:'Phase 4 · Jul 2023', heading:'oss-fuzz IFUNC Disabled',
    body:'JiaT75 submits a PR to google/oss-fuzz disabling IFUNC (Indirect Function) fuzzing for XZ Utils.\n\nIFUNC is the exact glibc mechanism the backdoor will later exploit. Disabling this ensures automated detection of the planned hook is prevented before the payload is inserted.\n\nThis is a preparatory countermeasure — arguably the clearest indicator of premeditation in the entire operation.',
    code:[{t:'c',v:'# oss-fuzz PR by JiaT75, Jul 2023'},{t:'r',v:'- CFLAGS += -DIFUNC_SUPPORT'},{t:'g',v:'+ # IFUNC fuzzing disabled'},{t:'c',v:'# Effect: oss-fuzz will no longer detect'},{t:'c',v:'# anomalies in IFUNC resolution paths'}],
    tags:[['red','Defense Evasion'],['red','T1562 — Disable Security Tools'],['yellow','IFUNC / glibc']], iam:null, chainState:'clean' },

  { color:'red', eyebrow:'Phase 5 · 23 Feb 2024', heading:'Malicious Payload Committed',
    body:'The first malicious commit is introduced. The payload is NOT in the source code — hidden inside binary files disguised as test data:\n\n- tests/files/bad-3-corrupt_lzma2.xz\n- tests/files/good-large_compressed.lzma\n\nThe build system modification in m4/build-to-host.m4 extracts and links a malicious object file during compilation — but only when building from the tarball, not the git repo.',
    code:[{t:'c',v:'# m4/build-to-host.m4 (tarball only)'},{t:'r',v:"am__test_x='sed s/a/x/g'"},{t:'r',v:'| tr "\\t -_" " \\t_-"'},{t:'r',v:'| xz -d | /bin/sh >&6 2>&1'},{t:'c',v:'# Extracts & executes hidden payload'},{t:'c',v:'# from binary test files at build time'}],
    tags:[['red','T1554 — Compromise Client Software'],['red','Build Injection'],['red','Binary Obfuscation']], iam:null, chainState:'injected' },

  { color:'red', eyebrow:'Phase 6 · 24 Feb 2024', heading:'XZ 5.6.0 Released (backdoored)',
    body:'XZ Utils 5.6.0 is released as an official tarball, signed by JiaT75\'s GPG key.\n\nLinux distributions begin pulling this version into testing and unstable branches. The backdoored liblzma begins being compiled into sshd on affected systems.\n\nCritically: the GitHub repository appears completely clean — the backdoor only exists in the distributed tarball.',
    code:[{t:'c',v:'# Tarball vs. Git repo divergence'},{t:'r',v:'tarball: xz-5.6.0.tar.gz'},{t:'r',v:'  build-to-host.m4  <- MALICIOUS'},{t:'r',v:'  tests/files/*.xz  <- PAYLOAD'},{t:'n',v:''},{t:'g',v:'git:    github.com/tukaani-project/xz'},{t:'g',v:'  build-to-host.m4  <- CLEAN'},{t:'g',v:'  tests/files/*.xz  <- CLEAN'}],
    tags:[['red','Supply Chain Delivery'],['red','Tarball vs Git Divergence'],['yellow','GPG-signed (attacker key)']], iam:null, chainState:'injected', showMatrix:true },

  { color:'red', eyebrow:'Phase 7 · 9 Mar 2024', heading:'XZ 5.6.1 Released (refined)',
    body:'XZ 5.6.1 is released quickly after 5.6.0 to fix reliability issues with the backdoor — some hook failures were causing detectable crashes.\n\nThis rapid follow-up release is a notable OPSEC mistake. On 25 March 2024, a fake account pressures Debian maintainers to fast-track the backdoored version into stable.',
    code:[{t:'c',v:'# Debian bug #1067708 — filed 25 Mar 2024'},{t:'y',v:'"Please update xz-utils to 5.6.1.'},{t:'y',v:' The new version fixes important bugs."'},{t:'c',v:'         — Hans Jansen (fake identity)'},{t:'n',v:''},{t:'g',v:'# Debian: under review (not fast-tracked)'}],
    tags:[['red','5.6.1 Backdoored'],['yellow','OPSEC Error — rapid re-release'],['red','Sockpuppet dist. pressure']], iam:null, chainState:'injected', showMatrix:true },

  { color:'red', eyebrow:'Phase 8 · Build Time', heading:'Build System Injection (3 Stages)',
    body:'When a distribution builds XZ from the backdoored tarball, injection occurs in three stages:\n\nStage 1 — Modified build-to-host.m4 triggers a sed/tr/xz pipeline, extracting a hidden shell script from the binary test files.\n\nStage 2 — The shell script decodes a prebuilt .o object file using RC4, linking it into the final liblzma at compile time.\n\nStage 3 — The object file registers IFUNC resolvers via glibc that override RSA_public_decrypt() at runtime.',
    code:[{t:'c',v:'# Stage 1: configure script injection'},{t:'r',v:"| sed 's/\\t/ /g' | tr ' \\t' '\\t '"},{t:'r',v:'| xz -d | /bin/sh'},{t:'n',v:''},{t:'c',v:'# Stage 2: RC4-decoded object file'},{t:'r',v:'eval $(echo "yolAbejyiejuvnup=" | ...)'},{t:'n',v:''},{t:'c',v:'# Stage 3: IFUNC hook registration'},{t:'r',v:'__attribute__((ifunc("resolve_RSA")))'}],
    tags:[['red','3-Stage Injection'],['red','IFUNC Override'],['red','RC4 Obfuscation']], iam:null, chainState:'injected' },

  { color:'red', eyebrow:'Phase 9 · Runtime', heading:'RSA_public_decrypt() Hook Active',
    body:'At runtime, any process loading the backdoored liblzma has RSA_public_decrypt() silently replaced via the IFUNC resolver.\n\nFor sshd — which links liblzma via libsystemd — every SSH auth attempt passes through the hooked function. The hook checks RSA public modulus N (bytes 0-15) for a command number:\n\n0x01 — SSH authentication bypass\n0x02 — Execute shell command\n0x03 — Execute with specified UID/GID\n\nOnly a client with a valid Ed448-signed payload triggers this. No log entries generated.',
    code:[{t:'c',v:'# Hook checks RSA struct N value'},{t:'r',v:'cmd = N[0..15] % 4;'},{t:'n',v:''},{t:'r',v:'if (verify_ed448_sig(N)) {'},{t:'r',v:'  switch(cmd) {'},{t:'r',v:'    case 0x01: bypass_auth();'},{t:'r',v:'    case 0x02: exec_cmd(payload);'},{t:'r',v:'    case 0x03: exec_uid(payload);'},{t:'r',v:'  }'},{t:'r',v:'} else {'},{t:'g',v:'  // normal auth -- no trace'},{t:'r',v:'}'}],
    tags:[['red','Auth Bypass'],['red','RCE as root'],['red','Ed448 key-gated'],['red','Zero log entries']],
    iam:{ control:'Authentication Stack Integrity', failure:'The authentication mechanism itself was compromised. MFA, PAM, RBAC — all operate above this layer. None would have been effective against this attack vector.' },
    chainState:'runtime', showAttacker:true },

  { color:'green', eyebrow:'Discovery · 27–29 Mar 2024', heading:'Freund Discovery — The 500ms Anomaly',
    body:'Andres Freund (Microsoft / PostgreSQL) notices SSH logins on a Debian Sid system taking ~500ms instead of ~100ms.\n\nHe runs top — sshd is consuming anomalous CPU during idle connections. He runs Valgrind — it flags unexpected syscalls in liblzma.\n\nTracing back, he finds the release tarball version of liblzma contains functions absent from GitHub source.\n\nDetection method: accidental human observation. No automated tool flagged it.',
    code:[{t:'c',v:"# Freund's initial observation"},{t:'y',v:'$ ssh user@host'},{t:'y',v:'... 500ms delay (expected: ~100ms)'},{t:'n',v:''},{t:'c',v:'# Valgrind reveals the anomaly'},{t:'g',v:'$ valgrind sshd -t'},{t:'r',v:'==PID== Invalid read in liblzma.so'},{t:'r',v:'==PID== Unexpected syscall in lzma_check'},{t:'n',v:''},{t:'c',v:'# Binary diff: tarball vs. git build'},{t:'r',v:'Only in tarball: _get_cpuid symbol'}],
    tags:[['green','Human Detection'],['green','Valgrind'],['yellow','No automated tool flagged'],['green','29 Mar 2024']], iam:null, chainState:'discovery' },

  { color:'green', eyebrow:'Response · 29 Mar 2024+', heading:'Coordinated Rollback & Patch',
    body:'Within hours of Freund\'s public disclosure:\n\n- Debian — rolled back XZ across all distributions\n- Red Hat — emergency advisory RHSA-2024:1618\n- CISA — public alert, recommending downgrade to XZ 5.4.6\n- Arch, Kali, openSUSE — advisories and rollbacks\n- GitHub — XZ repository suspended\n\nCritical: the backdoor had NOT reached any stable production distribution. Caught approximately 5 weeks before stable release.',
    code:[{t:'c',v:'# CISA recommendation'},{t:'g',v:'$ apt install xz-utils=5.4.6'},{t:'g',v:'$ dnf downgrade xz-5.4.6'},{t:'n',v:''},{t:'c',v:'# Verify installed version'},{t:'g',v:'$ xz --version'},{t:'g',v:'xz (XZ Utils) 5.4.6'},{t:'g',v:'liblzma 5.4.6  <- safe'}],
    tags:[['green','Coordinated Response'],['green','No stable distro affected'],['green','CISA advisory']], iam:null, chainState:'clean' },

  { color:'blue', eyebrow:'IAM Analysis', heading:'IAM Control Effectiveness Matrix',
    body:'The XZ attack represents a novel IAM failure mode: compromise of the authentication mechanism itself rather than credential theft or authorisation bypass.\n\nTraditional IAM frameworks assume the integrity of the layers below them. This attack invalidated that assumption by operating at the liblzma / IFUNC layer — below PAM, below RBAC, below MFA.\n\nThe table maps common IAM controls to their effectiveness against this specific attack vector.',
    code:null,
    tags:[['blue','IAM Analysis'],['red','Auth Stack Compromise'],['yellow','NIST 800-161'],['blue','ATT&CK T1195.001']],
    iam:null, chainState:'clean', showIAMTable:true },
];

const iamRows = [
  ['Multi-Factor Authentication (MFA)',        'none',    'Bypassed — hook fires before auth logic'],
  ['Linux PAM (Pluggable Authentication Modules)', 'none', 'Operates above the hooked layer'],
  ['SELinux / AppArmor',                       'partial', 'Restricts post-exploit movement, not injection'],
  ['SSH Key Management / Rotation',            'none',    'Key validity irrelevant — hook bypasses check'],
  ['Zero Trust Network Access',                'none',    'Authentication itself is compromised'],
  ['SBOM / Dependency Inventory',              'partial', 'Identifies component presence, not malicious content'],
  ['Code Signing (GPG)',                       'none',    'Attacker signed releases with their own trusted key'],
  ['Multi-party release approval',             'high',    'Would require second maintainer to verify tarball'],
  ['Tarball vs. Git diff check',               'high',    'Would detect build-to-host.m4 divergence'],
  ['Runtime binary integrity (IMA/dm-verity)', 'high',    'Would detect modified liblzma at load time'],
  ['Anomaly detection / perf monitoring',      'high',    '500ms SSH delay — how it was actually found'],
  ['Least Privilege on release role',          'high',    'No single maintainer should have sole release authority'],
];

const vulnMatrix = [
  { name:'Debian Sid / Unstable', vuln:true,  reason:'glibc + XZ 5.6.x + systemd OpenSSH' },
  { name:'Fedora Rawhide / F40b', vuln:true,  reason:'glibc + XZ 5.6.x + systemd OpenSSH' },
  { name:'Kali (Mar 26-28)',      vuln:true,  reason:'glibc + XZ 5.6.x + systemd OpenSSH' },
  { name:'Arch Linux',            vuln:false, reason:'No systemd sshd patch applied' },
  { name:'Debian Stable',         vuln:false, reason:'XZ version <= 5.4.x in stable repos' },
  { name:'Ubuntu LTS',            vuln:false, reason:'XZ version <= 5.4.x in stable repos' },
  { name:'RHEL / Amazon Linux',   vuln:false, reason:'Stable branch, XZ 5.4.x' },
  { name:'Gentoo / NixOS',        vuln:false, reason:'No systemd OpenSSH patch' },
];

const phaseGroups = [
  { label:'Attack Phases',        indices:[0,1,2,3,4] },
  { label:'Injection',            indices:[5,6,7,8,9] },
  { label:'Discovery & Response', indices:[10,11] },
  { label:'IAM Perspective',      indices:[12] },
];

// ── Checker logic ─────────────────────────────────────────────────────────────
function parseXZVersion(raw) {
  const m = raw.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  return { major:parseInt(m[1]), minor:parseInt(m[2]), patch:parseInt(m[3]), str:m[0] };
}

function checkVulnerability(xzRaw, lddRaw, sshdRaw) {
  const checks = [];
  let vulnerable = true;

  const ver = parseXZVersion(xzRaw);
  if (!ver) {
    checks.push({ key:'xz', label:'XZ Utils version', status:'unknown', detail:'Could not parse version. Expected: xz (XZ Utils) 5.x.x' });
    vulnerable = false;
  } else {
    const bad = ver.major===5 && ver.minor===6 && (ver.patch===0 || ver.patch===1);
    checks.push({ key:'xz', label:'XZ Utils version', status:bad?'fail':'pass',
      detail:bad ? `Version ${ver.str} is backdoored (5.6.0 and 5.6.1 contain the malicious payload).`
                 : `Version ${ver.str} is not affected. Only 5.6.0 and 5.6.1 contain the backdoor.` });
    if (!bad) vulnerable = false;
  }

  const hasLzma = /liblzma/i.test(lddRaw);
  checks.push({ key:'lzma', label:'liblzma linked into sshd', status:hasLzma?'fail':'pass',
    detail:hasLzma ? 'liblzma is present in sshd\'s dynamic library chain — the backdoor injection path exists.'
                   : 'liblzma is NOT linked into sshd. The hook has no injection path on this system.' });
  if (!hasLzma) vulnerable = false;

  const hasSystemd = /libsystemd/i.test(lddRaw);
  checks.push({ key:'systemd', label:'libsystemd linked into sshd', status:hasSystemd?'fail':'pass',
    detail:hasSystemd ? 'libsystemd present. This distro applies the sd_notify patch, creating the liblzma dependency.'
                      : 'libsystemd NOT found. This distro does not apply the sd_notify patch — liblzma linkage is absent.' });
  if (!hasSystemd) vulnerable = false;

  const hasGlibc = /libc\.so|libc-\d/i.test(lddRaw);
  checks.push({ key:'glibc', label:'glibc present (IFUNC support)', status:hasGlibc?'fail':'pass',
    detail:hasGlibc ? 'glibc detected. IFUNC resolver mechanism available — required for the backdoor\'s function hook.'
                    : 'glibc NOT detected (possibly musl). IFUNC is not supported — backdoor cannot execute.' });
  if (!hasGlibc) vulnerable = false;

  const sshdActive = /^active/im.test(sshdRaw);
  checks.push({ key:'sshd', label:'SSH daemon running', status:sshdActive?'fail':'pass',
    detail:sshdActive ? 'sshd is active. A running SSH daemon with the backdoored liblzma loaded is the final exploitation condition.'
                      : 'sshd is not active. Even with the backdoored library present, there is no active attack surface.' });
  if (!sshdActive) vulnerable = false;

  const xzVer = parseXZVersion(xzRaw);
  return {
    checks, vulnerable,
    systemProfile: {
      hasLzma, hasSystemd, hasGlibc, sshdActive,
      xzVersion: xzVer?.str || 'unknown',
      xzBad: xzVer ? (xzVer.major===5 && xzVer.minor===6 && (xzVer.patch===0||xzVer.patch===1)) : false
    }
  };
}

// ── State ─────────────────────────────────────────────────────────────────────
let currentTab = 'visualiser';
let activePhase = 0;
let systemProfile = null;

// ── Render helpers ────────────────────────────────────────────────────────────
function accentColor(phase) {
  return phase.color==='red'?C.red : phase.color==='yellow'?C.yellow : phase.color==='green'?C.green : C.blue;
}

function codeColor(t) {
  return { c:C.muted, r:C.red, g:C.green, y:C.yellow, n:'transparent', b:C.blue }[t] || C.text;
}

// ── Build SVG chain ───────────────────────────────────────────────────────────
function buildChainSVG(phase, sp) {
  const cs = phase ? phase.chainState : (sp&&sp.xzBad&&sp.hasLzma&&sp.hasSystemd ? 'injected' : 'clean');
  const isInjected  = cs==='injected' || cs==='runtime';
  const isRuntime   = cs==='runtime'  || (phase&&phase.showAttacker);
  const isDiscovery = cs==='discovery';
  const no = (p) => sp ? (p ? 1 : 0.25) : 1;
  const lzmaPresent  = sp ? sp.hasLzma    : true;
  const sysPresent   = sp ? sp.hasSystemd : true;
  const glibcPresent = sp ? sp.hasGlibc   : true;
  const sshdPresent  = sp ? sp.sshdActive : true;
  const xzBad        = sp ? sp.xzBad      : (isInjected||isDiscovery);
  const lzmaStroke   = xzBad&&lzmaPresent ? C.red    : lzmaPresent ? C.green  : C.border2;
  const lzmaBg       = xzBad&&lzmaPresent ? '#1A0E0E': '#161B22';
  const lzmaColor    = xzBad&&lzmaPresent ? C.red    : lzmaPresent ? C.green  : C.muted;
  const lzmaVer      = sp ? sp.xzVersion  : (isInjected||isDiscovery ? 'XZ Utils 5.6.0/5.6.1' : 'XZ Utils 5.4.6');
  const sshdStroke   = isRuntime ? C.red : isDiscovery ? C.yellow : C.border2;
  const sshdBg       = isRuntime ? '#1A0E0E' : isDiscovery ? '#1A1A0E' : '#161B22';
  const buildStroke  = isInjected ? C.yellow : C.border2;
  const buildColor   = isInjected ? C.yellow : C.text;
  const buildSub     = isInjected ? 'build-to-host.m4 MODIFIED' : 'Autotools configure script';
  const tarStroke    = isInjected ? C.red : C.border2;
  const tarBg        = isInjected ? '#1A0E0E' : '#161B22';
  const tarColor     = isInjected ? C.red : C.text;
  const tarSub       = isInjected ? 'backdoored tarball' : 'GitHub distribution';
  const arrN         = isRuntime ? C.red : C.border2;

  const nodeBadge = (present, bad, x, y) => {
    if (!sp) return '';
    const col = bad ? C.red : present ? C.green : C.muted;
    const lbl = bad ? 'BACKDOORED' : present ? 'PRESENT' : 'ABSENT';
    const w   = bad ? 80 : 58;
    return `<rect x="${x-28}" y="${y}" width="${w}" height="13" rx="3"
      fill="${bad?'#2A0E0E':present?'#1C3A27':'#1A1A1A'}" stroke="${col}" stroke-width="1"/>
      <text x="${x}" y="${y+7}" text-anchor="middle" font-family="monospace" font-size="8"
        font-weight="700" fill="${col}" letter-spacing=".05em">${lbl}</text>`;
  };

  return `<svg viewBox="0 0 500 560" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;overflow:visible">
  <defs>
    <marker id="aN" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="${arrN}"/></marker>
    <marker id="aR" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="${C.red}"/></marker>
    <marker id="aG" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="${C.green}"/></marker>
  </defs>

  <!-- SSH Client -->
  <g opacity="${no(sshdPresent)}">
    <rect x="160" y="12" width="180" height="48" rx="8" fill="#161B22" stroke="${isRuntime?C.red:C.border2}" stroke-width="1.5"/>
    <text x="250" y="33" text-anchor="middle" font-family="monospace" font-size="12" font-weight="600" fill="${isRuntime?C.red:C.muted}">SSH Client</text>
    <text x="250" y="50" text-anchor="middle" font-family="monospace" font-size="9" fill="${C.muted}" opacity=".7">remote user / attacker</text>
    ${isRuntime ? `<text x="250" y="7" text-anchor="middle" font-family="monospace" font-size="8" font-weight="700" fill="${C.red}">ATTACKER — Ed448 key required</text>` : ''}
  </g>
  <line x1="250" y1="60" x2="250" y2="107" stroke="${arrN}" stroke-width="1.5" marker-end="url(#aN)"/>

  <!-- sshd -->
  <g opacity="${no(sshdPresent)}">
    <rect x="140" y="108" width="220" height="52" rx="8" fill="${sshdBg}" stroke="${sshdStroke}" stroke-width="1.5"/>
    <text x="250" y="129" text-anchor="middle" font-family="monospace" font-size="12" font-weight="600" fill="${C.text}">OpenSSH sshd</text>
    <text x="250" y="147" text-anchor="middle" font-family="monospace" font-size="9" fill="${C.muted}" opacity=".7">v9.7p1 — port 22</text>
    ${isDiscovery ? `<text x="250" y="104" text-anchor="middle" font-family="monospace" font-size="8" font-weight="700" fill="${C.green}">ANOMALY DETECTED — +500ms SSH delay</text>` : ''}
    ${nodeBadge(sshdPresent, false, 250, 98)}
  </g>

  <!-- sshd -> systemd -->
  <path d="M340,160 Q390,187 380,213" stroke="${C.border2}" stroke-width="1.5" fill="none" marker-end="url(#aR)" opacity="${no(sysPresent)}"/>
  <text x="375" y="185" text-anchor="middle" font-family="monospace" font-size="8" fill="${C.muted}" opacity="${no(sysPresent)}">sd_notify patch</text>
  <!-- sshd -> lzma -->
  <path d="M220,160 Q210,187 210,213" stroke="${C.border2}" stroke-width="1.5" fill="none" marker-end="url(#aR)" opacity="${no(lzmaPresent)}"/>

  <!-- libsystemd -->
  <g opacity="${no(sysPresent)}">
    <rect x="285" y="214" width="185" height="48" rx="8" fill="#161B22" stroke="${sysPresent?(sp?C.green:C.border2):C.border2}" stroke-width="1.5"/>
    <text x="377" y="234" text-anchor="middle" font-family="monospace" font-size="12" font-weight="600" fill="${C.text}">libsystemd</text>
    <text x="377" y="251" text-anchor="middle" font-family="monospace" font-size="9" fill="${C.muted}" opacity=".7">distro-specific patch</text>
    ${nodeBadge(sysPresent, false, 377, 206)}
  </g>
  <path d="M295,238 L262,238" stroke="${C.border2}" stroke-width="1.5" fill="none" marker-end="url(#aR)" opacity="${no(sysPresent&&lzmaPresent)}"/>

  <!-- liblzma -->
  <g opacity="${no(lzmaPresent)}">
    <rect x="128" y="214" width="132" height="48" rx="8" fill="${lzmaBg}" stroke="${lzmaStroke}" stroke-width="1.5"/>
    <text x="194" y="234" text-anchor="middle" font-family="monospace" font-size="12" font-weight="600" fill="${lzmaColor}">liblzma</text>
    <text x="194" y="251" text-anchor="middle" font-family="monospace" font-size="9" fill="${lzmaColor}" opacity=".7">${lzmaVer}</text>
    ${!sp ? ((xzBad||isDiscovery)
      ? `<rect x="150" y="206" width="88" height="13" rx="3" fill="${C.red}"/>
         <text x="194" y="213" text-anchor="middle" font-family="monospace" font-size="8" font-weight="700" fill="white">BACKDOORED</text>`
      : `<rect x="158" y="206" width="60" height="13" rx="3" fill="#1C3A27" stroke="${C.green}" stroke-width="1"/>
         <text x="188" y="213" text-anchor="middle" font-family="monospace" font-size="8" font-weight="700" fill="${C.green}">CLEAN</text>`)
      : nodeBadge(lzmaPresent, lzmaPresent&&xzBad, 194, 206)}
  </g>
  <path d="M165,262 L165,317" stroke="${C.border2}" stroke-width="1.5" fill="none" marker-end="url(#aR)" opacity="${no(lzmaPresent)}"/>

  <!-- Build System -->
  <rect x="48" y="318" width="204" height="52" rx="8" fill="#161B22" stroke="${buildStroke}" stroke-width="1.5"/>
  <text x="150" y="338" text-anchor="middle" font-family="monospace" font-size="12" font-weight="600" fill="${buildColor}">Build System</text>
  <text x="150" y="356" text-anchor="middle" font-family="monospace" font-size="9" fill="${buildColor}" opacity=".7">${buildSub}</text>

  <!-- Release Tarball -->
  <rect x="288" y="318" width="172" height="52" rx="8" fill="${tarBg}" stroke="${tarStroke}" stroke-width="1.5"/>
  <text x="374" y="338" text-anchor="middle" font-family="monospace" font-size="12" font-weight="600" fill="${tarColor}">Release Tarball</text>
  <text x="374" y="356" text-anchor="middle" font-family="monospace" font-size="9" fill="${tarColor}" opacity=".7">${tarSub}</text>
  <path d="M298,344 L254,344" stroke="${isInjected?C.red:C.border2}" stroke-width="1.5" fill="none"
    stroke-dasharray="${isInjected?'5 3':'0'}" marker-end="url(#aR)"/>
  <text x="275" y="337" text-anchor="middle" font-family="monospace" font-size="8" fill="${C.muted}">compile-time</text>

  <!-- glibc -->
  <g opacity="${no(glibcPresent)}">
    <rect x="328" y="424" width="144" height="48" rx="8" fill="#161B22" stroke="${glibcPresent?(sp?C.green:C.border2):C.border2}" stroke-width="1.5"/>
    <text x="400" y="444" text-anchor="middle" font-family="monospace" font-size="12" font-weight="600" fill="${C.text}">glibc</text>
    <text x="400" y="461" text-anchor="middle" font-family="monospace" font-size="9" fill="${C.muted}" opacity=".7">IFUNC resolver</text>
    ${nodeBadge(glibcPresent, false, 400, 416)}
  </g>

  ${isInjected ? `
  <path d="M170,370 L185,423" stroke="${C.red}" stroke-width="1.5" fill="none" stroke-dasharray="5 3" marker-end="url(#aR)"/>
  <rect x="98" y="424" width="204" height="52" rx="8" fill="#1A0E0E" stroke="${C.red}" stroke-width="1.5"/>
  <text x="200" y="444" text-anchor="middle" font-family="monospace" font-size="12" font-weight="600" fill="${C.red}">Malicious Object</text>
  <text x="200" y="461" text-anchor="middle" font-family="monospace" font-size="9" fill="${C.red}" opacity=".7">injected .o file — IFUNC hook</text>
  <path d="M128,430 Q95,340 163,263" stroke="${C.red}" stroke-width="1.5" fill="none" stroke-dasharray="4 3" marker-end="url(#aR)"/>` : ''}

  ${isRuntime ? `
  <path d="M378,472 Q328,490 283,508" stroke="${C.red}" stroke-width="1.5" fill="none" stroke-dasharray="5 3" marker-end="url(#aR)"/>
  <path d="M193,262 Q183,430 223,507" stroke="${C.red}" stroke-width="1.5" fill="none" stroke-dasharray="4 3" marker-end="url(#aR)"/>
  <rect x="128" y="508" width="244" height="44" rx="8" fill="#1A0E0E" stroke="${C.red}" stroke-width="1.5"/>
  <text x="250" y="526" text-anchor="middle" font-family="monospace" font-size="12" font-weight="600" fill="${C.red}">RSA_public_decrypt()</text>
  <text x="250" y="543" text-anchor="middle" font-family="monospace" font-size="9" fill="${C.red}" opacity=".7">hooked — auth bypass active</text>` : ''}

  ${sp ? `<text x="250" y="555" text-anchor="middle" font-family="monospace" font-size="9"
    fill="${sp.xzBad&&sp.hasLzma&&sp.hasSystemd&&sp.hasGlibc&&sp.sshdActive?C.red:C.green}">
    ${sp.xzBad&&sp.hasLzma&&sp.hasSystemd&&sp.hasGlibc&&sp.sshdActive
      ? '⚠  Full attack chain present on this system'
      : '✓  Attack chain incomplete — system not fully exploitable'}</text>` : ''}
</svg>`;
}

// ── Render functions ──────────────────────────────────────────────────────────
function renderLeftPanel() {
  const panel = document.getElementById('left-panel');
  let html = '';

  if (currentTab === 'visualiser' && systemProfile) {
    html += `<div class="live-box">
      <div class="live-label">Live System View</div>
      <div class="live-desc">Chain reflects your actual system's library profile from the checker.</div>
      <button class="clear-btn" onclick="clearProfile()">CLEAR — SHOW GENERIC CHAIN</button>
    </div>`;
  }

  phaseGroups.forEach((g, gi) => {
    html += `<div class="group-label${gi>0?' mt':''}">${g.label}</div>`;
    g.indices.forEach(i => {
      const p = phases[i];
      const ac = accentColor(p);
      const isActive = currentTab==='visualiser' && activePhase===i && !systemProfile;
      const cls = isActive ? `active-${p.color}` : '';
      html += `<div class="phase-item ${cls}" onclick="selectPhase(${i})">
        <div class="phase-dot"></div>
        <div>
          <div class="phase-date">${p.eyebrow.split('·')[0].trim()}</div>
          <div class="phase-title">${p.heading}</div>
        </div>
      </div>`;
    });
    if (gi < phaseGroups.length - 1) html += `<div class="panel-divider"></div>`;
  });

  panel.innerHTML = html;
}

function renderCanvas() {
  const canvas = document.getElementById('canvas');
  const phase  = phases[activePhase];
  const effectivePhase = (currentTab==='visualiser' && systemProfile) ? null : phase;
  const title  = systemProfile ? `Live System — XZ ${systemProfile.xzVersion}` : phase.heading;

  let matrixHtml = '';
  if (!systemProfile && phase.showMatrix) {
    matrixHtml = `<div style="width:100%">
      <div class="matrix-title">Configuration Vulnerability Matrix</div>
      <div class="matrix-grid">
        ${vulnMatrix.map(m => `
          <div class="matrix-cell ${m.vuln?'vuln':'safe'}">
            <div class="matrix-name ${m.vuln?'vuln':'safe'}">${m.name}</div>
            <div class="matrix-reason">${m.reason}</div>
            <div class="matrix-status ${m.vuln?'vuln':'safe'}">${m.vuln?'● VULNERABLE':'● NOT AFFECTED'}</div>
          </div>`).join('')}
      </div>
    </div>`;
  }

  canvas.innerHTML = `
    <div class="canvas-title">${title}</div>
    <div class="chain-wrap">${buildChainSVG(effectivePhase, systemProfile)}</div>
    ${matrixHtml}`;
}

function renderInfoPanel() {
  const panel = document.getElementById('info-panel');
  const phase = phases[activePhase];

  if (currentTab==='visualiser' && systemProfile) {
    const sp = systemProfile;
    const rows = [
      { label:'XZ Version',     value:sp.xzVersion,          bad:sp.xzBad },
      { label:'liblzma linked', value:sp.hasLzma?'YES':'NO', bad:sp.hasLzma },
      { label:'libsystemd',     value:sp.hasSystemd?'YES':'NO', bad:sp.hasSystemd },
      { label:'glibc (IFUNC)',  value:sp.hasGlibc?'YES':'NO', bad:sp.hasGlibc },
      { label:'sshd active',    value:sp.sshdActive?'YES':'NO', bad:sp.sshdActive },
    ];
    panel.innerHTML = `
      <div>
        <div class="eyebrow blue">Live System Profile</div>
        <div class="info-title">Your System's Dependency Chain</div>
        <div class="info-body">The chain reflects the actual libraries present on your system as reported by ldd. Dimmed nodes are absent. Highlighted nodes are active.</div>
      </div>
      <div class="info-divider"></div>
      ${rows.map(r => `<div class="profile-row">
        <span class="profile-label">${r.label}</span>
        <span class="profile-val ${r.bad?'bad':'good'}">${r.value}</span>
      </div>`).join('')}
      <div class="info-divider"></div>
      <div class="info-body">Click any phase in the left panel to switch back to the generic attack visualiser.</div>`;
    return;
  }

  const codeHtml = phase.code ? `<div class="code-block">${
    phase.code.map(l => `<div style="color:${codeColor(l.t)}">${l.v||'\u00a0'}</div>`).join('')
  }</div>` : '';

  const tagsHtml = phase.tags ? `<div class="tag-row">
    ${phase.tags.map(([c,l]) => `<span class="tag tag-${c}">${l}</span>`).join('')}
  </div>` : '';

  const iamHtml = phase.iam ? `
    <div class="info-divider"></div>
    <div>
      <div class="iam-note-label">IAM Note</div>
      <div class="info-body"><strong style="color:#C9D1D9">${phase.iam.control}</strong><br><br>${phase.iam.failure}</div>
    </div>` : '';

  const iamTableHtml = phase.showIAMTable ? `
    <div class="info-divider"></div>
    <div class="iam-note-label">Control Effectiveness</div>
    <table class="iam-table">
      <thead><tr><th>Control</th><th style="width:65px">Effect</th></tr></thead>
      <tbody>${iamRows.map(([ctrl,eff,note]) => `
        <tr>
          <td>${ctrl}<br><span class="note">${note}</span></td>
          <td class="eff"><span class="eff-${eff}">${eff.toUpperCase()}</span></td>
        </tr>`).join('')}
      </tbody>
    </table>` : '';

  panel.innerHTML = `
    <div>
      <div class="eyebrow">${phase.eyebrow}</div>
      <div class="info-title">${phase.heading}</div>
      <div class="info-body">${phase.body.split('\n').map((l,i,a) => l + (i<a.length-1?'<br>':'')).join('')}</div>
    </div>
    ${codeHtml}${tagsHtml}${iamHtml}${iamTableHtml}`;
}

function renderChecker() {
  document.getElementById('app-body').innerHTML = `
    <div class="checker-grid">
      <div class="checker-left">
        <div>
          <div class="checker-title">System Vulnerability Checker</div>
          <div class="checker-desc">Run the three commands on your target system and paste the output. The checker evaluates whether that system satisfies all five conditions for CVE-2024-3094 exploitation.</div>
        </div>
        <div class="cmd-box">
          <div class="cmd-box-label">Commands to run</div>
          <div class="cmd-row"><span class="cmd-name">XZ version</span><span class="cmd-val">xz --version</span></div>
          <div class="cmd-row"><span class="cmd-name">sshd dependencies</span><span class="cmd-val">ldd /usr/sbin/sshd</span></div>
          <div class="cmd-row"><span class="cmd-name">SSH daemon status</span><span class="cmd-val">systemctl is-active ssh</span></div>
        </div>
        <div class="field-wrap">
          <div class="field-top"><span class="field-name">1. XZ Version</span><span class="field-cmd">xz --version</span></div>
          <textarea id="chk-xz" rows="2" placeholder="xz (XZ Utils) 5.6.1&#10;liblzma 5.6.1"></textarea>
        </div>
        <div class="field-wrap">
          <div class="field-top"><span class="field-name">2. sshd ldd output</span><span class="field-cmd">ldd /usr/sbin/sshd</span></div>
          <textarea id="chk-ldd" rows="5" placeholder="linux-vdso.so.1&#10;libsystemd.so.0 => ...&#10;liblzma.so.5 => ...&#10;libc.so.6 => ..."></textarea>
        </div>
        <div class="field-wrap">
          <div class="field-top"><span class="field-name">3. SSH status</span><span class="field-cmd">systemctl is-active ssh</span></div>
          <textarea id="chk-ssh" rows="2" placeholder="active (running) since ..."></textarea>
        </div>
        <div class="btn-row">
          <button class="btn-primary" onclick="runChecker()">ANALYSE SYSTEM</button>
          <button class="btn-secondary" onclick="resetChecker()">RESET</button>
        </div>
      </div>
      <div class="checker-right" id="checker-results">
        <div class="empty-state">
          <div class="empty-icon">⌕</div>
          <div class="empty-text">Paste command output on the left<br>and click Analyse System</div>
        </div>
      </div>
    </div>`;
}

function renderCheckerResults(result) {
  const { checks, vulnerable, systemProfile: sp } = result;
  const sc = (s) => s==='fail'?'fail' : s==='pass'?'pass' : 'unknown';
  const sl = (s) => s==='fail'?'FAIL' : s==='pass'?'PASS' : 'UNKNOWN';

  const remLines = [
    { t:'c', v:'# Debian / Ubuntu' },
    { t:'g', v:'$ sudo apt install xz-utils=5.4.6-0.2' },
    { t:'n', v:'' },
    { t:'c', v:'# Fedora / RHEL' },
    { t:'g', v:'$ sudo dnf downgrade xz-5.4.6' },
    { t:'n', v:'' },
    { t:'c', v:'# Verify' },
    { t:'g', v:'$ xz --version   # must show 5.4.x' },
  ];

  document.getElementById('checker-results').innerHTML = `
    <div class="verdict-box ${vulnerable?'vuln':'safe'}">
      <div class="eyebrow">Verdict</div>
      <div class="verdict-title ${vulnerable?'vuln':'safe'}">${vulnerable?'VULNERABLE':'NOT VULNERABLE'}</div>
      <div class="verdict-body">${vulnerable
        ? 'This system satisfies all conditions for exploitation of CVE-2024-3094. The backdoored liblzma is loaded into sshd and the IFUNC hook path is complete. Immediate downgrade to XZ 5.4.6 required.'
        : 'This system does not satisfy all conditions for exploitation. At least one critical dependency in the attack chain is absent.'}</div>
    </div>
    <button class="visualise-btn" onclick="visualiseSystem(${JSON.stringify(sp).replace(/"/g,'&quot;')})">
      ⬡ VISUALISE THIS SYSTEM'S DEPENDENCY CHAIN
    </button>
    <div class="breakdown-label">Condition Breakdown</div>
    ${checks.map(c => `
      <div class="check-card">
        <div class="check-top">
          <span class="check-name">${c.label}</span>
          <span class="check-badge ${sc(c.status)}">${sl(c.status)}</span>
        </div>
        <div class="check-detail">${c.detail}</div>
      </div>`).join('')}
    ${vulnerable ? `
      <div class="remediation-box">
        <div class="remediation-label">Remediation</div>
        <div class="remediation-code">${remLines.map(l =>
          `<div style="color:${l.t==='c'?C.muted:l.t==='g'?C.green:C.text}">${l.v||'\u00a0'}</div>`
        ).join('')}</div>
      </div>` : ''}`;
}

// ── Actions ───────────────────────────────────────────────────────────────────
function setTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.className = 'tab-btn ' + (b.dataset.tab===tab ? 'active' : 'inactive');
  });
  if (tab === 'visualiser') {
    document.getElementById('app-body').innerHTML = `
      <div class="app" id="visualiser-body">
        <div class="left-panel" id="left-panel"></div>
        <div class="canvas" id="canvas"></div>
        <div class="info-panel" id="info-panel"></div>
      </div>`;
    renderLeftPanel();
    renderCanvas();
    renderInfoPanel();
  } else {
    renderChecker();
  }
}

function selectPhase(i) {
  activePhase = i;
  if (systemProfile) clearProfile();
  renderLeftPanel();
  renderCanvas();
  renderInfoPanel();
}

function clearProfile() {
  systemProfile = null;
  renderLeftPanel();
  renderCanvas();
  renderInfoPanel();
}

function visualiseSystem(sp) {
  systemProfile = sp;
  setTab('visualiser');
}

function runChecker() {
  const xz  = document.getElementById('chk-xz').value.trim();
  const ldd = document.getElementById('chk-ldd').value.trim();
  const ssh = document.getElementById('chk-ssh').value.trim();
  if (!xz && !ldd && !ssh) return;
  const result = checkVulnerability(xz, ldd, ssh);
  renderCheckerResults(result);
}

function resetChecker() {
  document.getElementById('chk-xz').value  = '';
  document.getElementById('chk-ldd').value = '';
  document.getElementById('chk-ssh').value = '';
  document.getElementById('checker-results').innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">⌕</div>
      <div class="empty-text">Paste command output on the left<br>and click Analyse System</div>
    </div>`;
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => setTab('visualiser'));
