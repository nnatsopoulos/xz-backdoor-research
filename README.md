# CVE-2024-3094 — XZ Utils Backdoor Research

> Independent security research by **Nikolaos Natsopoulos**, IAM Consultant

This repository accompanies the research report:

**"CVE-2024-3094: Supply Chain Compromise via Social Engineering and Build System Manipulation in XZ Utils — A Technical Analysis with Emphasis on Identity and Access Management Implications"**

---

## Overview

In March 2024, a sophisticated supply chain attack targeting XZ Utils (CVE-2024-3094) was discovered moments before it could propagate to stable Linux distributions worldwide. The attack received the maximum CVSS score of 10.0 and involved a fictitious contributor identity spending nearly three years infiltrating the project before inserting a backdoor that would have enabled unauthenticated remote code execution on millions of Linux servers.

This report provides a comprehensive technical analysis organised around four research questions:

- **What** did the threat actor do?
- **How** was the attack technically executed?
- **Why** was it carried out?
- **What would have happened** had it succeeded?

A dedicated section analyses the attack from an **Identity and Access Management (IAM)** perspective — the first published analysis to do so systematically.

---

## Tools

Two interactive browser-based tools were developed as part of this research. Both run entirely offline — no data is transmitted.

### 1. CVE-2024-3094 Research Toolkit

**`tools/xz-toolkit/index.html`**

An XZ-specific tool with two tabs:

- **Attack Visualiser** — interactive dependency chain diagram showing all 13 attack phases from account creation through coordinated response. Click any phase to see the chain update, code excerpts, and ATT&CK tags.
- **System Checker** — paste output from three commands to evaluate whether a specific system would have been vulnerable. Results link back to the visualiser showing your system's actual dependency chain.

**To use:** open `tools/xz-toolkit/index.html` in any browser (requires a local server or GitHub Pages — see below).

**Demo inputs:** see `tools/xz-toolkit/DEMO_INPUTS.md`

---

### 2. Linux Vulnerability Assessment Tool

**`tools/linux-vuln-tool/index.html`**

A general-purpose Linux vulnerability assessment tool covering 7 high-severity CVEs:

| CVE | Name | CVSS |
|-----|------|------|
| CVE-2024-3094 | XZ Utils Backdoor | 10.0 |
| CVE-2024-6387 | regreSSHion — OpenSSH RCE | 8.1 |
| CVE-2021-44228 | Log4Shell — Apache Log4j RCE | 10.0 |
| CVE-2022-0847 | Dirty Pipe — Kernel Privilege Escalation | 7.8 |
| CVE-2021-4034 | PwnKit — Polkit pkexec Privilege Escalation | 7.8 |
| CVE-2023-4911 | Looney Tunables — glibc Buffer Overflow | 7.8 |
| CVE-2021-3156 | Baron Samedit — sudo Heap Overflow | 7.8 |

Paste output from up to 5 standard Linux commands. The tool evaluates your system profile against all CVEs simultaneously and produces a prioritised findings report.

**To use:** open `tools/linux-vuln-tool/index.html` in any browser (requires a local server or GitHub Pages).

**Adding new CVEs:** edit `tools/cve-library.json` — no code changes needed. Each CVE entry defines the conditions to check, the input field to read, the regex pattern to match, and the explanations. See the existing entries for the template.

---

## Running Locally

Because the Linux Vulnerability Assessment Tool loads `cve-library.json` via `fetch()`, it requires a local HTTP server rather than opening the file directly:

```bash
# Python 3
cd tools
python3 -m http.server 8000

# Then open:
# http://localhost:8000/xz-toolkit/
# http://localhost:8000/linux-vuln-tool/
```

The XZ toolkit (`xz-toolkit/`) has no external dependencies and works by opening `index.html` directly in most browsers.

---

## Repository Structure

```
├── README.md
├── LICENSE
├── report/
│   └── XZ_Backdoor_Report.pdf
└── tools/
    ├── cve-library.json          ← CVE data (edit here to add new CVEs)
    ├── xz-toolkit/
    │   ├── index.html
    │   ├── style.css
    │   └── app.js
    └── linux-vuln-tool/
        ├── index.html
        ├── style.css
        └── app.js
```

---

## Key Findings

**Technical:**
- The backdoor was introduced via release tarballs only — the GitHub repository appeared completely clean, making standard code review blind to it
- Vulnerability was both version-specific (XZ 5.6.0/5.6.1) and architecture-specific (glibc + systemd OpenSSH patch required)
- A system running the backdoored XZ version on Arch Linux was not exploitable due to the absence of the sd_notify patch — a packaging decision, not a version decision

**IAM:**
- The attack compromised the authentication mechanism itself — operating below PAM, RBAC, MFA, and Zero Trust
- No conventional IAM control would have prevented exploitation
- Controls that would have helped: multi-party release approval, tarball/git diff checking, runtime binary integrity monitoring, and anomaly detection on SSH latency

---

## References

- Freund, A. (2024). Original disclosure. https://www.openwall.com/lists/oss-security/2024/03/29/4
- NIST NVD. CVE-2024-3094. https://nvd.nist.gov/vuln/detail/CVE-2024-3094
- Cox, R. (2024). XZ Utils Backdoor Timeline. https://research.swtch.com/xz-timeline
- CISA. (2024). Lessons from XZ Utils. https://www.cisa.gov/news-events/news/lessons-xz-utils-achieving-more-sustainable-open-source-ecosystem

Full reference list in the research report.

---

## License

Copyright (c) 2026 Nikolaos Natsopoulos. Licensed under the MIT License — see [LICENSE](LICENSE).

The CVE data in `cve-library.json` is derived from public sources including NIST NVD and vendor advisories. CVE identifiers are public information and not subject to copyright.
