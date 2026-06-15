type StopFn = () => void;

let activeStop: StopFn | null = null;

export function claimAudioPlayback(stop: StopFn): void {
  if (activeStop && activeStop !== stop) {
    activeStop();
  }
  activeStop = stop;
}

export function releaseAudioPlayback(stop: StopFn): void {
  if (activeStop === stop) {
    activeStop = null;
  }
}

export function stopAllAudioPlayback(): void {
  if (activeStop) {
    activeStop();
    activeStop = null;
  }
}
