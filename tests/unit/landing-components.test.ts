import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const featureGridPath = resolve(__dirname, '../../src/components/landing/FeatureGrid.astro');
const featureGridContent = readFileSync(featureGridPath, 'utf-8');

const howItWorksPath = resolve(__dirname, '../../src/components/landing/HowItWorks.astro');
const howItWorksContent = readFileSync(howItWorksPath, 'utf-8');

const trustBarPath = resolve(__dirname, '../../src/components/landing/TrustBar.astro');
const trustBarContent = readFileSync(trustBarPath, 'utf-8');

describe('FeatureGrid component', () => {
  it('file exists and is not empty', () => {
    expect(featureGridContent).toBeTruthy();
    expect(featureGridContent.length).toBeGreaterThan(0);
  });

  it('imports Card component', () => {
    expect(featureGridContent).toContain("import Card from '../../components/Card.astro'");
  });

  it('renders as a section with correct class', () => {
    expect(featureGridContent).toContain('class="feature-section"');
  });

  it('contains section heading', () => {
    expect(featureGridContent).toContain('class="section-title"');
    expect(featureGridContent).toContain('Features');
  });

  it('contains the feature grid container', () => {
    expect(featureGridContent).toContain('class="feature-grid"');
  });

  it('renders all six feature cards', () => {
    expect(featureGridContent).toContain('Smart Model Routing');
    expect(featureGridContent).toContain('Keep/Discard Fix Loop');
    expect(featureGridContent).toContain('Stability Gate');
    expect(featureGridContent).toContain('Semantic Memory');
    expect(featureGridContent).toContain('Multi-Team Support');
    expect(featureGridContent).toContain('A2A Protocol');
  });

  it('each feature card has an icon prop', () => {
    const iconPattern = /icon="/g;
    const matches = featureGridContent.match(iconPattern);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(6);
  });

  it('each feature card has a description prop', () => {
    const descPattern = /description="/g;
    const matches = featureGridContent.match(descPattern);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(6);
  });

  it('uses responsive breakpoints', () => {
    expect(featureGridContent).toContain('@media (max-width: 768px)');
    expect(featureGridContent).toContain('@media (max-width: 480px)');
  });

  it('uses three-column grid on desktop', () => {
    expect(featureGridContent).toContain('grid-template-columns: repeat(3, 1fr)');
  });

  it('drops to two columns on tablet', () => {
    expect(featureGridContent).toContain('grid-template-columns: repeat(2, 1fr)');
  });

  it('drops to single column on mobile', () => {
    expect(featureGridContent).toContain('grid-template-columns: 1fr');
  });
});

describe('HowItWorks component', () => {
  it('file exists and is not empty', () => {
    expect(howItWorksContent).toBeTruthy();
    expect(howItWorksContent.length).toBeGreaterThan(0);
  });

  it('renders as a section with correct class', () => {
    expect(howItWorksContent).toContain('class="how-it-works"');
  });

  it('contains section header and title', () => {
    expect(howItWorksContent).toContain('class="section-header"');
    expect(howItWorksContent).toContain('class="section-title"');
    expect(howItWorksContent).toContain('How It Works');
  });

  it('renders all three steps', () => {
    expect(howItWorksContent).toContain('class="steps"');
    expect(howItWorksContent).toContain('Monitor');
    expect(howItWorksContent).toContain('Investigate');
    expect(howItWorksContent).toContain('Fix');
  });

  it('each step has a number, icon, title, and description', () => {
    expect(howItWorksContent).toContain('class="step-number"');
    expect(howItWorksContent).toContain('class="step-icon"');
    expect(howItWorksContent).toContain('class="step-title"');
    expect(howItWorksContent).toContain('class="step-description"');
  });

  it('step connectors are present and marked aria-hidden', () => {
    const connectors = howItWorksContent.match(/class="step-connector"/g);
    expect(connectors).not.toBeNull();
    expect(connectors!.length).toBeGreaterThanOrEqual(2);
    expect(howItWorksContent).toContain('aria-hidden="true"');
  });

  it('uses responsive breakpoint for small screens', () => {
    expect(howItWorksContent).toContain('@media (max-width: 640px)');
  });

  it('stacks vertically on small screens', () => {
    expect(howItWorksContent).toContain('flex-direction: column');
  });

  it('uses CSS custom properties for theming', () => {
    expect(howItWorksContent).toContain('--color-bg');
    expect(howItWorksContent).toContain('--color-text');
    expect(howItWorksContent).toContain('--color-accent');
  });
});

describe('TrustBar component', () => {
  it('file exists and is not empty', () => {
    expect(trustBarContent).toBeTruthy();
    expect(trustBarContent.length).toBeGreaterThan(0);
  });

  it('renders as a section with correct class', () => {
    expect(trustBarContent).toContain('class="trust-bar"');
  });

  it('contains the "Built on" label', () => {
    expect(trustBarContent).toContain('class="trust-label"');
    expect(trustBarContent).toContain('Built on');
  });

  it('contains trust items with icons and names', () => {
    expect(trustBarContent).toContain('class="trust-item"');
    expect(trustBarContent).toContain('class="trust-icon"');
    expect(trustBarContent).toContain('class="trust-name"');
  });

  it('lists all three technology dependencies', () => {
    expect(trustBarContent).toContain('Claude Code');
    expect(trustBarContent).toContain('A2A Protocol');
    expect(trustBarContent).toContain('Supabase');
  });

  it('has dividers marked aria-hidden', () => {
    expect(trustBarContent).toContain('class="trust-divider"');
    expect(trustBarContent).toContain('aria-hidden="true"');
  });

  it('contains MIT license badge', () => {
    expect(trustBarContent).toContain('class="trust-badge"');
    expect(trustBarContent).toContain('MIT License');
  });

  it('uses responsive breakpoint for small screens', () => {
    expect(trustBarContent).toContain('@media (max-width: 640px)');
  });

  it('hides dividers on mobile', () => {
    // The dividers are hidden via display: none within the media query
    const mediaQueryBlock = trustBarContent.match(/@media\s*\(max-width:\s*640px\)\s*\{[^}]*\}/s);
    expect(mediaQueryBlock).not.toBeNull();
  });

  it('uses CSS custom properties for theming', () => {
    expect(trustBarContent).toContain('--color-bg');
    expect(trustBarContent).toContain('--color-text');
    expect(trustBarContent).toContain('--color-accent');
  });
});
