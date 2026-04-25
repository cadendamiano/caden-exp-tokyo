'use client';

import Link from 'next/link';
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

      <div className="settings-placeholder">
        <p className="settings-placeholder-text">
          User settings will live here.
        </p>
      </div>
    </div>
  );
}
