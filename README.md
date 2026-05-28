Audience: adopter

# Edgekit Docs Q&A Demo

External demo for Knowledge Access and cited documentation answers.

Live URL:

- Cloudflare Pages: https://edgekit-demo-docs.pages.dev/

This repo installs Edgekit v0.3.0 from vendored packed tarballs until the packages are published to npm. After publication, replace the `file:vendor/*.tgz` dependencies with normal semver ranges.

## Quickstart

```bash
npm install
npm run dev
```

Try:

```text
how does Edgekit handle model fallback and host state?
```

## Verification

```bash
npm install
npm run typecheck
npm run build
npm run deploy:cloudflare
```
