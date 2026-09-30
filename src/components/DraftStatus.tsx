import { DraftNotice } from '../drafts';

export function DraftStatus({ notice }: { notice: DraftNotice }) {
  if (notice.error) return <p role="alert" className="text-xs text-amber-600">{notice.error}</p>;
  if (!notice.savedAt) return null;
  return <p role="status" className="text-xs opacity-75">{notice.restored ? 'Draft restored. ' : ''}Saved in this browser at {new Date(notice.savedAt).toLocaleTimeString()}.</p>;
}
