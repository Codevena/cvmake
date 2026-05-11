# Security Policy

Thanks for helping keep cvmake and its users safe.

## Supported Versions

cvmake is currently pre-1.0 and ships from the `main` branch. Only the
latest commit on `main` receives security fixes. Tagged releases will
get an explicit support window once 1.0 ships.

## Reporting a Vulnerability

**Please do not open a public issue for security reports.**

Email **<hello@codevena.dev>** with:

- A description of the issue
- Steps to reproduce (a minimal example helps a lot)
- The version or commit SHA you tested against
- Optional: your suggested fix

We aim to acknowledge reports within **3 working days** and to ship a
fix or mitigation within **30 days** for high-severity issues. We will
keep you informed throughout the process and credit you in the release
notes unless you prefer to remain anonymous.

## Scope

In scope:

- The cvmake CLI, web app, and core packages in this repository
- The build pipeline that turns YAML into PDF
- Dependencies declared directly in the `package.json` files
- The GitHub Actions workflows in `.github/workflows/`

Out of scope:

- Vulnerabilities that require physical access to the user's machine
- Issues in third-party templates contributed by users (please report
  those directly to the template author)
- Social engineering of cvmake maintainers

## Coordinated Disclosure

We follow standard coordinated disclosure. Please give us reasonable
time to fix the issue before publishing details. We will agree on a
public disclosure date with you once a fix is ready.
