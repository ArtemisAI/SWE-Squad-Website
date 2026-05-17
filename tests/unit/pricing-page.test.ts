import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pagePath = resolve(__dirname, '../../src/pages/pricing.astro');
const pageContent = readFileSync(pagePath, 'utf-8');

describe('Pricing page', () => {
  it('file exists and is not empty', () => {
    expect(pageContent).toBeTruthy();
    expect(pageContent.length).toBeGreaterThan(0);
  });

  it('imports BaseLayout and Callout components', () => {
    expect(pageContent).toContain("import BaseLayout from '@layouts/BaseLayout.astro'");
    expect(pageContent).toContain("import Callout from '@components/Callout.astro'");
  });

  it('uses BaseLayout with correct title', () => {
    expect(pageContent).toContain('<BaseLayout title="Pricing &amp; Support — SWE-Squad">');
  });

  it('contains back link and page header', () => {
    expect(pageContent).toContain('class="back-link"');
    expect(pageContent).toContain('class="page-title"');
    expect(pageContent).toContain('Pricing &amp; Support');
    expect(pageContent).toContain('class="page-intro"');
  });

  it('contains Open Source tier with pricing and features', () => {
    expect(pageContent).toContain('Free forever');
    expect(pageContent).toContain('Full MIT-licensed codebase');
    expect(pageContent).toContain('All features included — no feature gating');
    expect(pageContent).toContain('Community support via GitHub Discussions');
    expect(pageContent).toContain('Self-hosted deployment');
    expect(pageContent).toContain('Access to all providers and integrations');
    expect(pageContent).toContain('Regular updates and patches');
  });

  it('contains Enterprise tier with pricing and features', () => {
    expect(pageContent).toContain('Contact us');
    expect(pageContent).toContain('Priority support with guaranteed response times');
    expect(pageContent).toContain('Deployment assistance and architecture review');
    expect(pageContent).toContain('Custom provider development');
    expect(pageContent).toContain('SLA-backed uptime guarantees');
    expect(pageContent).toContain('Dedicated Slack channel');
  });

  it('has GitHub CTA link for open source tier', () => {
    expect(pageContent).toContain('href="https://github.com/swe-squad/swe-squad"');
    expect(pageContent).toContain('Get Started on GitHub');
  });

  it('has contact email for enterprise tier', () => {
    expect(pageContent).toContain('href="mailto:enterprise@swe-squad.dev"');
    expect(pageContent).toContain('Contact Sales');
  });

  it('has no-feature-gating callout with success type', () => {
    expect(pageContent).toContain('<Callout type="success"');
    expect(pageContent).toContain('No Feature Gating');
    expect(pageContent).toContain('paywall');
  });

  it('has FAQ section with questions', () => {
    expect(pageContent).toContain('Frequently Asked Questions');
    expect(pageContent).toContain('Is the open source version really the complete product?');
    expect(pageContent).toContain('How do I get started with self-hosted deployment?');
    expect(pageContent).toContain('What does enterprise support include?');
  });

  it('has bottom CTA section with info callout', () => {
    expect(pageContent).toContain('<Callout type="info"');
    expect(pageContent).toContain('Ready to get started?');
    expect(pageContent).toContain('href="/docs"');
  });

  it('uses design system CSS custom properties via var() references', () => {
    expect(pageContent).toContain('var(--color-bg)');
    expect(pageContent).toContain('var(--color-bg-sidebar)');
    expect(pageContent).toContain('var(--color-text-primary)');
    expect(pageContent).toContain('var(--color-text-secondary)');
    expect(pageContent).toContain('var(--color-accent)');
    expect(pageContent).toContain('var(--color-border)');
  });

  it('uses responsive breakpoint at 768px', () => {
    expect(pageContent).toContain('@media (max-width: 768px)');
  });

  it('uses two-column pricing grid layout', () => {
    expect(pageContent).toContain('grid-template-columns: 1fr 1fr');
    expect(pageContent).toContain('class="pricing-grid"');
  });
});
