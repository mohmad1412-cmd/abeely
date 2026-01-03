/**
 * Notification Sound Service
 * Uses Web Audio API to generate pleasant notification sounds
 */

class NotificationSoundService {
  private audioContext: AudioContext | null = null;
  private isInitialized = false;

  /**
   * Initialize the audio context
   * Must be called after user interaction (click/tap)
   */
  init() {
    if (this.isInitialized) return;
    
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.isInitialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
    }
  }

  /**
   * Play a pleasant notification sound for new interest matching request
   * Creates a gentle "ding" sound
   */
  playNewInterestSound() {
    if (!this.audioContext) {
      this.init();
    }
    
    if (!this.audioContext) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    // Create oscillator for the main tone
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    
    // Create gain nodes for envelope
    const gain1 = ctx.createGain();
    const gain2 = ctx.createGain();
    const masterGain = ctx.createGain();

    // Connect nodes
    osc1.connect(gain1);
    osc2.connect(gain2);
    gain1.connect(masterGain);
    gain2.connect(masterGain);
    masterGain.connect(ctx.destination);

    // First note - higher pitch (like a notification "ding")
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now); // A5
    osc1.frequency.exponentialRampToValueAtTime(1318.51, now + 0.1); // E6

    // Second note - harmony
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now + 0.05); // E5
    osc2.frequency.exponentialRampToValueAtTime(987.77, now + 0.15); // B5

    // Envelope for first oscillator
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.3, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    // Envelope for second oscillator
    gain2.gain.setValueAtTime(0, now + 0.05);
    gain2.gain.linearRampToValueAtTime(0.2, now + 0.07);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    // Master volume
    masterGain.gain.setValueAtTime(0.6, now);

    // Start and stop oscillators
    osc1.start(now);
    osc2.start(now + 0.05);
    osc1.stop(now + 0.4);
    osc2.stop(now + 0.45);
  }

  /**
   * Play a subtle notification sound (for when user is on interests page)
   * Softer and shorter than the main notification
   */
  playSubtleSound() {
    if (!this.audioContext) {
      this.init();
    }
    
    if (!this.audioContext) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046.5, now); // C6
    osc.frequency.exponentialRampToValueAtTime(1318.51, now + 0.08); // E6

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  /**
   * Play vibration pattern for mobile devices
   */
  vibrate() {
    if (navigator.vibrate) {
      navigator.vibrate([50, 30, 50]);
    }
  }

  /**
   * Combined notification: sound + vibration
   * @param isSubtle - If true, plays a softer sound (for interests page)
   */
  notify(isSubtle = false) {
    if (isSubtle) {
      this.playSubtleSound();
    } else {
      this.playNewInterestSound();
    }
    this.vibrate();
  }
}

// Export singleton instance
export const notificationSound = new NotificationSoundService();

