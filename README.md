# CVE-2024-3094 Research Toolkit

> By **Nikolaos Natsopoulos**, IAM Consultant

Interactive browser-based tool accompanying the research report:

**"CVE-2024-3094: Supply Chain Compromise via Social Engineering and Build System Manipulation in XZ Utils"**

---

## What is this

In March 2024, a backdoor was discovered in XZ Utils (CVE-2024-3094) moments before it could reach stable Linux distributions worldwide. It received the maximum CVSS score of 10.0. The attack involved a fictitious contributor spending nearly three years infiltrating the project before inserting code that would have enabled unauthenticated remote code execution on millions of Linux servers.

This tool provides two things:

- **Attack Visualiser** - an interactive dependency chain diagram stepping through all 13 phases of the attack, from account creation through coordinated response
- **System Checker** - paste output from three Linux commands to evaluate whether a specific system would have been vulnerable, with results linked back to the dependency chain visualiser

---

## How to use

Open `index.html` in any browser. No installation, no dependencies, no internet connection required.

**Attack Visualiser tab** - click any phase in the left panel to step through the attack timeline. The dependency chain updates to show exactly where the attack path exists at each stage.

**System Checker tab** - run these three commands on the system you want to check:

```
xz --version
ldd /usr/sbin/sshd
systemctl is-active ssh
```

Paste the output into the three fields and click Analyse System. The tool evaluates the five conditions required for exploitation and gives a verdict with per-condition breakdown. Click "Visualise this system's dependency chain" to see your actual library profile rendered in the chain diagram.

---

## Demo inputs

**Fully vulnerable (Debian Sid, XZ 5.6.1):**

XZ version field:
```
xz (XZ Utils) 5.6.1
liblzma 5.6.1
```

sshd dependencies field:
```
libsystemd.so.0 => /lib/x86_64-linux-gnu/libsystemd.so.0
liblzma.so.5 => /lib/x86_64-linux-gnu/liblzma.so.5
libcrypto.so.3 => /lib/x86_64-linux-gnu/libcrypto.so.3
libc.so.6 => /lib/x86_64-linux-gnu/libc.so.6
```

SSH status field:
```
active (running) since Fri 2024-03-29 11:42:01 UTC
```

**Not vulnerable (Arch Linux, XZ 5.6.0 but no sd_notify patch):**

XZ version field:
```
xz (XZ Utils) 5.6.0
liblzma 5.6.0
```

sshd dependencies field:
```
libcrypto.so.3 => /usr/lib/libcrypto.so.3
libpam.so.0 => /usr/lib/libpam.so.0
libc.so.6 => /usr/lib/libc.so.6
```

SSH status field:
```
active (running) since Sat 2024-03-30 08:22:11 UTC
```

This second profile is the most instructive - XZ 5.6.0 is the backdoored version but the system is not exploitable because Arch Linux does not apply the sd_notify patch to OpenSSH, meaning liblzma is never linked into sshd.

---

## The five exploitation conditions

All five must be satisfied simultaneously for a system to be vulnerable:

1. Linux x86-64 architecture
2. glibc (not musl) - required for IFUNC resolver support
3. XZ Utils 5.6.0 or 5.6.1
4. OpenSSH linked against libsystemd (distro-specific sd_notify patch)
5. SSH daemon running and accessible

---

## References

- Original disclosure: https://www.openwall.com/lists/oss-security/2024/03/29/4
- NIST NVD: https://nvd.nist.gov/vuln/detail/CVE-2024-3094
- Timeline (Russ Cox): https://research.swtch.com/xz-timeline
- CISA advisory: https://www.cisa.gov/news-events/news/lessons-xz-utils-achieving-more-sustainable-open-source-ecosystem

---

## License

Copyright (c) 2026 Nikolaos Natsopoulos. MIT License - see LICENSE file.
