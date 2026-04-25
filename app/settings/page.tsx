'use client';

import Link from 'next/link';
import { CredentialsColumn } from '@/components/settings/CredentialsColumn';
import { BrainTrustColumn } from '@/components/settings/BrainTrustColumn';
import { ToolsColumn } from '@/components/settings/ToolsColumn';
import { Icon } from '@/components/primitives/Icon';

export default function SettingsPage() {
  return (
    <div className="settings-page">
      <div className="settings-page-header">
        <Link href="/" className="settings-back-btn">
          <span style={{ display: 'inline-block', transform: 'rotate(180deg)' }}><Icon.Arrow /></span>
          <span>Back</span>
        </Link>
        <h1 className="settings-page-title">Settings</h1>
      </div>

      <div className="settings-page-columns">
        <div className="settings-col settings-col--credentials">
          <div className="settings-col-header">
            <span className="settings-col-icon">⚙</span>
            <h2 className="settings-col-title">Configuration</h2>
          </div>
          <CredentialsColumn />
        </div>

        <div className="settings-col settings-col--braintrust">
          <div className="settings-col-header">
            <span className="settings-col-icon">◎</span>
            <h2 className="settings-col-title">AI Observability</h2>
            <span className="settings-col-badge">BrainTrust</span>
          </div>
          <BrainTrustColumn />
        </div>

        <div className="settings-col settings-col--tools">
          <div className="settings-col-header">
            <span className="settings-col-icon">⬡</span>
            <h2 className="settings-col-title">Prompts &amp; Tools</h2>
          </div>
          <ToolsColumn />
        </div>
      </div>
    </div>
  );
}
