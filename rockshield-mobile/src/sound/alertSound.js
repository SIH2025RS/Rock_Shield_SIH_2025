// @ts-nocheck
// Shared helper to play a short buzzer sound when alerts are received.
// NOTE: You must add an audio file at assets/sounds/alert-buzzer.mp3
// and install expo-av: `npx expo install expo-av`.

import { Audio } from 'expo-av';

let soundInstance = null;
let stopTimeout = null;
let isPlaying = false;

export async function playAlertSound() {
  try {
    // Do not start a new buzzer if one is already playing.
    if (isPlaying) return;

    // Lazily load the sound once.
    if (!soundInstance) {
      const { sound } = await Audio.Sound.createAsync(
        // Place any buzzer/beep MP3 here
        require('@/assets/images/sounds/Buzzer.mp3'),
        { shouldPlay: false }
      );
      soundInstance = sound;
      // Ensure it doesn't loop by itself.
      try {
        await soundInstance.setIsLoopingAsync(false);
      } catch (e) {}
    }

    // Clear any previous stop timer.
    if (stopTimeout) {
      clearTimeout(stopTimeout);
      stopTimeout = null;
    }

    isPlaying = true;

    // Start from the beginning and play.
    await soundInstance.setPositionAsync(0);
    await soundInstance.playAsync();

    // Stop after ~3 seconds so the buzzer length is controlled.
    stopTimeout = setTimeout(() => {
      if (!soundInstance) {
        isPlaying = false;
        return;
      }
      soundInstance
        .stopAsync()
        .then(() => soundInstance.setPositionAsync(0))
        .then(() => soundInstance.unloadAsync())
        .catch(() => {})
        .finally(() => {
          soundInstance = null;
          isPlaying = false;
        });
    }, 3000);
  } catch (e) {
    console.warn('[alertSound] Failed to play alert sound', e);
    isPlaying = false;
  }
}

export async function stopAlertSound() {
  try {
    if (stopTimeout) {
      clearTimeout(stopTimeout);
      stopTimeout = null;
    }

    if (soundInstance) {
      await soundInstance.stopAsync().catch(() => {});
      await soundInstance.setPositionAsync(0).catch(() => {});
      await soundInstance.unloadAsync().catch(() => {});
      soundInstance = null;
    }
  } finally {
    isPlaying = false;
  }
}
