import { useEffect, useRef } from 'react';

export function ExitConfirmation({ onContinue, onExit, study = false }: { onContinue: () => void; onExit: () => void; study?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return (
    <dialog ref={dialog} aria-labelledby="exit-title" aria-describedby="exit-description" onCancel={event => { event.preventDefault(); onContinue(); }}>
      <h2 id="exit-title">{study ? 'Çalışmadan çıkmak istediğine emin misin?' : 'Testten çıkmak istediğine emin misin?'}</h2>
      <p id="exit-description">{study ? 'Bu çalışmadaki tüm ilerlemen ve tamamladığın derslerin sonuçları kaybolacak.' : 'İlerlemen kaybolacak.'}</p>
      <div className="dialog-actions">
        <button className="primary" autoFocus onClick={onContinue}>Devam Et</button>
        <button className="secondary destructive" onClick={onExit}>{study ? 'Çalışmadan Çık' : 'Testten Çık'}</button>
      </div>
    </dialog>
  );
}
