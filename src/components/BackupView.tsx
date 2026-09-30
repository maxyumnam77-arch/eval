import { useState } from 'react';
import { requestBlob } from '../api';
import { downloadBlob } from '../reports';

export function BackupView({ theme }: { theme: 'light' | 'dark' }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [downloaded, setDownloaded] = useState(false);
  const card = `alpine-card ${theme === 'light' ? 'light-theme text-slate-900' : 'text-slate-100'} p-5`;
  const download = async () => {
    setBusy(true); setError(''); setDownloaded(false);
    try {
      const archive = await requestBlob('/backup');
      downloadBlob(`smart-exam-backup-${new Date().toISOString().replaceAll(':', '-')}.zip`, archive);
      setDownloaded(true);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  return <div className="space-y-5">
    <header className={card}><h2 className="font-bold text-lg">Backups</h2><p className="text-sm opacity-75 mt-1">Download a copy of your saved project records and answer images.</p></header>
    <section className={`${card} space-y-4`}>
      <h3 className="font-bold">Save a backup ZIP</h3>
      <p className="text-sm">Includes questions, rubrics, student answers, grades, teacher corrections, exam attempts, accounts, and uploaded pages. A restore guide and record counts are included.</p>
      <p className="text-xs opacity-75">Unsubmitted drafts stay in their original browser. Local model files and settings are separate. The ZIP contains private student records, so store it safely.</p>
      <button disabled={busy} onClick={() => void download()} className="alpine-btn-blue text-white px-4 py-3 font-bold text-sm disabled:opacity-50">{busy ? 'Preparing backup…' : 'Download backup ZIP'}</button>
      {busy && <p role="status" className="text-sm">Copying saved records and images. Large backups can take longer.</p>}
      {downloaded && <p role="status" className="text-sm text-emerald-600">Backup download started. Keep the ZIP somewhere you can find it later.</p>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </section>
    <section className={`${card} space-y-3`}><h3 className="font-bold">Restore on your Mac</h3>
      <ol className="list-decimal pl-5 space-y-2 text-sm"><li>Stop the app and make a separate copy of your current data folder.</li>
        <li>Extract the ZIP and follow its RESTORE.txt guide to replace the data folder.</li>
        <li>Restart the app, sign in again, and check your records and answer pages.</li></ol>
    </section>
  </div>;
}
