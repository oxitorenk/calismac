import { useEffect, useRef } from 'react';

export function ExitConfirmation({ onContinue, onExit }: { onContinue: () => void; onExit: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return (
    <dialog ref={dialog} aria-labelledby="exit-title" aria-describedby="exit-description" onCancel={event => { event.preventDefault(); onContinue(); }}>
      <h2 id="exit-title">Testten çıkmak istediğine emin misin?</h2>
      <p id="exit-description">İlerlemen kaybolacak.</p>
      <button className="primary" autoFocus onClick={onContinue}>Devam Et</button>
      <button className="back" onClick={onExit}>Testten Çık</button>
    </dialog>
  );
}
