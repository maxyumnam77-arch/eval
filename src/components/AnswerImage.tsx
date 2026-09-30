import { useEffect, useState } from 'react';
import { getAuthToken } from '../api';

export function AnswerImage({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  const [image, setImage] = useState<{ src: string; url: string } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!src) return;
    const controller = new AbortController();
    let disposed = false;
    let url = '';
    setFailed(false);
    fetch(src, { headers: { Authorization: `Bearer ${getAuthToken() || ''}` }, signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Page unavailable'); return response.blob(); })
      .then(blob => {
        if (disposed) return;
        url = URL.createObjectURL(blob);
        setImage({ src, url });
      }).catch(() => { if (!disposed) setFailed(true); });
    return () => { disposed = true; controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [src]);
  if (!src) return null;
  if (failed) return <p role="alert" className="text-xs text-red-600">Could not load this answer page. Reopen the submission to retry.</p>;
  return image?.src === src ? <img src={image.url} alt={alt} className={className} /> : <p className="text-xs opacity-70">Loading answer page…</p>;
}
