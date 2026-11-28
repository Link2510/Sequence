class SoundManager {
  private ctx: AudioContext | null = null;
  public enabled = true;

  private getContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'sine', gainVal = 0.06, delay = 0) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(gainVal, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playCard() {
    this.playTone(320, 0.08, 'triangle', 0.05);
    this.playTone(480, 0.06, 'sine', 0.03, 0.02);
  }

  playRing() {
    this.playTone(523.25, 0.25, 'sine', 0.05);
    this.playTone(659.25, 0.3, 'sine', 0.04, 0.06);
    this.playTone(783.99, 0.4, 'triangle', 0.04, 0.12);
  }

  playTrickWin() {
    this.playTone(392, 0.14, 'triangle', 0.05);
    this.playTone(523.25, 0.22, 'sine', 0.05, 0.08);
  }

  playVictory() {
    const notes = [392, 493.88, 587.33, 783.99];
    notes.forEach((n, i) => this.playTone(n, 0.35, 'triangle', 0.05, i * 0.1));
  }

  playDefeat() {
    this.playTone(311.13, 0.28, 'sawtooth', 0.03);
    this.playTone(261.63, 0.45, 'triangle', 0.04, 0.18);
  }
}

export const soundFx = new SoundManager();
