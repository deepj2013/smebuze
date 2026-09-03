/** Short beep after a barcode scan. Silent if AudioContext is blocked. */
export function playScanBeep(ok: boolean) {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = ok ? 880 : 240;
    gain.gain.value = 0.07;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    window.setTimeout(() => {
      osc.stop();
      ctx.close().catch(() => undefined);
    }, ok ? 90 : 220);
  } catch {
    /* ignore */
  }
}
