import { darkTheme, defaultTheme, type WaveformPlaylistTheme } from '@waveform-playlist/ui-components';
import type { Theme, ThemeName } from '../types';

/**
 * Map V2 `Theme` tokens onto waveform-playlist's theme interface so the lane
 * recolors live with V2's warm / light / dark palettes. Only override fields
 * that visibly differ from the base theme; everything else stays default.
 */
export function buildGroovyWaveformTheme(theme: Theme, themeName: ThemeName): Partial<WaveformPlaylistTheme> {
  const isDark = themeName === 'dark';
  const base = isDark ? darkTheme : defaultTheme;

  const accent = theme.accent;
  const playhead = theme.playhead;
  const warmBars = isDark ? '#E8C090' : '#2B241C';
  const warmFill = theme.trackBg;

  return {
    ...base,

    waveformDrawMode: 'inverted',
    waveOutlineColor: warmFill,
    waveFillColor: warmBars,
    waveProgressColor: isDark ? 'rgba(245,239,228,0.18)' : 'rgba(40,28,18,0.18)',

    selectedWaveOutlineColor: theme.trackSelBg,
    selectedWaveFillColor: warmBars,
    selectedTrackControlsBackground: theme.trackSelBg,
    selectedTrackBackground: theme.trackSelBg,

    timeColor: theme.rulerText,
    timescaleBackgroundColor: theme.trackHeadBg,

    playheadColor: playhead,
    selectionColor: isDark ? 'rgba(107,130,255,0.25)' : 'rgba(35,64,232,0.18)',
    loopRegionColor: isDark ? 'rgba(107,130,255,0.2)' : 'rgba(35,64,232,0.14)',
    loopMarkerColor: accent,

    clipHeaderBackgroundColor: theme.clipLabelBg,
    clipHeaderBorderColor: theme.clipBorder,
    clipHeaderTextColor: theme.clipLabel,
    clipHeaderFontFamily: 'var(--mono)',
    selectedClipHeaderBackgroundColor: theme.trackSelBg,

    fadeOverlayColor: isDark ? 'rgba(20,18,16,0.55)' : 'rgba(40,28,18,0.35)',

    backgroundColor: theme.trackBg,
    surfaceColor: theme.trackHeadBg,
    borderColor: theme.rule,
    textColor: theme.trackName,
    textColorMuted: theme.trackSub,

    playlistBackgroundColor: theme.trackBg,

    borderRadius: '3px',
    fontFamily: 'var(--sans)',
    fontSize: '12px',
    fontSizeSmall: '10px',
  };
}
