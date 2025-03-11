/**
 * Sound Manager
 * Handles sound triggering with improved stability
 */

const SoundManager = (function () {
  // Private variables
  let synth;
  let activeNote = null;
  let sustainMode = false;
  let currentNoteName = null;
  let noteChangeCallback = null;
  let noteStartTime = 0;

  // Minimum time between note changes in ms
  const minNoteHoldTime = 300;

  // Initialize the synth
  function init(callback) {
    // Create synth with better settings for stable sound
    synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: "triangle",
      },
      envelope: {
        attack: 0.03,
        decay: 0.1,
        sustain: 0.8,
        release: 0.8,
      },
    }).toDestination();

    // Set callback for note changes
    noteChangeCallback = callback;

    // Return if successful
    return true;
  }

  // Set sustain mode (hold notes until explicitly released)
  function setSustainMode(mode) {
    sustainMode = mode;
  }

  // Play a note
  function playNote(noteName) {
    if (!noteName) return;

    const now = Date.now();

    // Make sure we've held the current note long enough
    if (currentNoteName && now - noteStartTime < minNoteHoldTime) {
      return;
    }

    // Stop current note if one is playing
    if (activeNote) {
      stopNote();
    }

    // Start Tone.js if needed
    if (Tone.context.state !== "running") {
      Tone.start();
    }

    // Play the note
    if (sustainMode) {
      synth.triggerAttack(noteName);
    } else {
      synth.triggerAttackRelease(noteName, "8n");
    }

    // Update state
    activeNote = noteName;
    currentNoteName = noteName;
    noteStartTime = now;

    // Notify callback
    if (noteChangeCallback) {
      noteChangeCallback(currentNoteName);
    }

    return true;
  }

  // Stop the current note
  function stopNote() {
    if (activeNote) {
      synth.triggerRelease(activeNote);
      activeNote = null;
    }
    return true;
  }

  // Get current note name
  function getCurrentNote() {
    return currentNoteName;
  }

  // Public interface
  return {
    init,
    playNote,
    stopNote,
    setSustainMode,
    getCurrentNote,
  };
})();
