// Shared constants and pure helpers for the audio mixer feature.
// Kept separate from obs.js (connection concerns) and app-level components.

// Matches the value restrictions documented for SetInputVolume's
// `inputVolumeDb` field in the obs-websocket protocol (>= -100, <= 26).
export const MIN_VOLUME_DB = -100
export const MAX_VOLUME_DB = 26

// obs-websocket only exposes OBS_SOURCE_AUDIO-gated requests (GetInputMute,
// GetInputVolume, ...) - GetInputList/GetSceneItemList don't say which
// inputs actually carry audio. We detect audio capability by probing
// GetInputMute per scene item and treating a rejected call as "no audio".
export const AUDIO_SOURCE_TYPE = 'OBS_SOURCE_TYPE_INPUT'

export function mulToDb (mul) {
  if (!mul || mul <= 0) return MIN_VOLUME_DB
  return Math.max(MIN_VOLUME_DB, 20 * Math.log10(mul))
}

export function dbToMul (db) {
  return Math.pow(10, db / 20)
}

// VU meter scale + color-zone thresholds, matching OBS Studio's own mixer
// meter defaults (frontend/components/VolumeMeter.cpp: minimumLevel,
// warningLevel, errorLevel, clipLevel) - not the fader range above, which is
// a separate, wider scale.
export const METER_FLOOR_DB = -60 // meter shows nothing below this
export const METER_WARNING_DB = -20 // green -> yellow
export const METER_ERROR_DB = -9 // yellow -> red
export const METER_CLIP_DB = 0 // red -> clip

// OBS itself only flashes its clip indicator for 1s. This app's indicator
// latches instead (stays lit until tapped, per user request), but still
// clears itself after a while so it can't get stuck on forever unnoticed.
export const CLIP_AUTO_RESET_MS = 60000

export function meterDbToPercent (db) {
  const clamped = Math.min(METER_CLIP_DB, Math.max(METER_FLOOR_DB, db))
  return ((clamped - METER_FLOOR_DB) / (METER_CLIP_DB - METER_FLOOR_DB)) * 100
}

// Audio monitoring types, as obs-websocket's SetInputAudioMonitorType /
// GetInputAudioMonitorType / InputAudioMonitorTypeChanged represent them
// (string enum, not the OBS_SOURCE_AUDIO-style bitmask elsewhere in this
// file). OBS_MONITORING_TYPE_MONITOR_ONLY is deliberately not offered by
// this app's UI - it silently mutes the source out of the stream/recording
// while it keeps playing locally, with no other visual indicator that it's
// happened (unlike SetInputMute, which is mirrored by the mute button
// everywhere). This app only ever toggles between NONE and
// MONITOR_AND_OUTPUT, so a source can never go silent in the stream without
// the mute button itself showing it.
export const MONITOR_TYPE_NONE = 'OBS_MONITORING_TYPE_NONE'
export const MONITOR_TYPE_MONITOR_ONLY = 'OBS_MONITORING_TYPE_MONITOR_ONLY'
export const MONITOR_TYPE_MONITOR_AND_OUTPUT = 'OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT'

// Approximates a combined "master mix" meter from every currently known
// channel's live levels. There is no obs-websocket-exposed equivalent of a
// single "master bus" meter - OBS only reports levels per input
// (InputVolumeMeters), never a combined one - and we don't have access to
// the raw per-sample audio (only each source's already-reduced
// magnitude/peak scalars, refreshed every ~50ms), so an exact reconstruction
// of the true combined output is impossible from what obs-websocket exposes.
// This is the best available *statistical* estimate, not naive linear
// addition: real audio sources in a mix are, for basically every real
// streaming setup (mic + game + desktop + music, ...), uncorrelated signals,
// and the combined RMS level of independent uncorrelated signals is the
// root-sum-square (RSS) of their individual RMS levels - sqrt(sum(level_i^2))
// - not their linear sum (linear sum only holds if every source were
// perfectly in-phase with every other one, which never happens in practice).
// Summing linearly would substantially overstate the real combined level
// once there are more than a couple of simultaneous sources. The same RSS
// combination is applied to peak for consistency, on the same
// independence assumption - note this can't catch the rare case where two
// sources' true instantaneous peaks land on the exact same sample (that
// would require raw audio to detect and has no protocol-level fix either).
// A muted source's magnitude/peak are already zeroed by obs-websocket
// itself (confirmed in obs-websocket's Obs_VolumeMeter.cpp: `_muted ? 0.0f
// : volume` is applied before either value is computed), so no separate
// mute filtering is needed here. This also assumes every source feeds the
// same output track, true unless the user has customized per-source track
// routing in Advanced Audio Properties - not accounted for, since
// obs-websocket's GetInputAudioTracks/track-routing isn't wired into this
// app.
export function sumMasterLevels (channelNames, levelsByName) {
  let maxChannels = 1
  for (const name of channelNames) {
    const lv = levelsByName[name]
    if (lv && lv.length > maxChannels) maxChannels = lv.length
  }

  const sumsOfSquares = Array.from({ length: maxChannels }, () => [0, 0])
  for (const name of channelNames) {
    const lv = levelsByName[name]
    if (!lv || !lv.length) continue
    for (let i = 0; i < maxChannels; i++) {
      const [magnitude, peak] = lv[Math.min(i, lv.length - 1)]
      sumsOfSquares[i][0] += magnitude * magnitude
      sumsOfSquares[i][1] += peak * peak
    }
  }

  // VuMeter reads a channel's index 2 as a fader-independent "raw" peak for
  // clip detection. There's no separate fader on a master meter to be
  // independent of, so index 2 just duplicates the post-volume peak here -
  // "clip" fires exactly when the estimated combined mix would hit 0dBFS.
  return sumsOfSquares.map(([magnitudeSq, peakSq]) => {
    const peak = Math.sqrt(peakSq)
    return [Math.sqrt(magnitudeSq), peak, peak]
  })
}
