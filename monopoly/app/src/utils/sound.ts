class SoundManager {
  private ctx: AudioContext | null = null;
  public muted = false;

  private getCtx(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.08,
    delay = 0
  ) {
    const ctx = this.getCtx();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  diceRoll() {
    [220, 280, 340, 260, 410].forEach((freq, idx) => {
      this.playTone(freq, 0.06, 'triangle', 0.06, idx * 0.055);
    });
  }

  step() {
    this.playTone(540, 0.06, 'sine', 0.05);
  }

  buy() {
    this.playTone(523.25, 0.12, 'triangle', 0.08, 0);
    this.playTone(659.25, 0.16, 'triangle', 0.08, 0.07);
    this.playTone(783.99, 0.22, 'triangle', 0.09, 0.14);
  }

  cashIn() {
    this.playTone(880, 0.09, 'sine', 0.07, 0);
    this.playTone(1174.66, 0.18, 'sine', 0.08, 0.07);
  }

  pay() {
    this.playTone(392, 0.12, 'sawtooth', 0.04, 0);
    this.playTone(293.66, 0.2, 'sawtooth', 0.04, 0.09);
  }

  alert() {
    this.playTone(260, 0.16, 'square', 0.05, 0);
    this.playTone(196, 0.28, 'square', 0.05, 0.14);
  }

  victory() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, i) => this.playTone(n, 0.25, 'triangle', 0.1, i * 0.11));
  }
}

export const sfx = new SoundManager();
