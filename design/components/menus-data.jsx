// Constants shared across menus / pickers
const INPUT_DEVICES = [
  { id: 'mbp-mic',   label: 'MacBook Pro Microphone',  sub: 'Built-in · mono' },
  { id: 'scarlett',  label: 'Scarlett 2i2 · Input 1',  sub: 'USB · mono' },
  { id: 'scarlett2', label: 'Scarlett 2i2 · Input 2',  sub: 'USB · mono' },
  { id: 'scarlett-s',label: 'Scarlett 2i2 · Stereo',   sub: 'USB · stereo' },
  { id: 'airpods',   label: 'AirPods Pro',             sub: 'Bluetooth · mono' },
  { id: 'loopback',  label: 'Loopback · System Audio', sub: 'Virtual · stereo' },
  { id: 'none',      label: 'No Input',                sub: '—' },
];

const OUTPUT_DEVICES = [
  { id: 'mbp-out',   label: 'MacBook Pro Speakers',    sub: 'Built-in · stereo' },
  { id: 'scarlett-o',label: 'Scarlett 2i2 · Outputs',  sub: 'USB · stereo' },
  { id: 'airpods-o', label: 'AirPods Pro',             sub: 'Bluetooth · stereo' },
  { id: 'hdmi',      label: 'Studio Monitor (HDMI)',   sub: 'Display · stereo' },
];

const KEYS = [
  'C major', 'G major', 'D major', 'A major', 'E major', 'B major', 'F♯ major',
  'F major', 'B♭ major', 'E♭ major', 'A♭ major', 'D♭ major', 'G♭ major',
  'A minor', 'E minor', 'B minor', 'F♯ minor', 'C♯ minor', 'G♯ minor', 'D♯ minor',
  'D minor', 'G minor', 'C minor', 'F minor', 'B♭ minor', 'E♭ minor', 'A♭ minor',
];

const TIME_SIGS = ['4/4','3/4','6/8','12/8','7/8','5/4','2/4'];

const FILE_MENU = [
  { label: 'New Project',              kb: '⌘N' },
  { label: 'Open Project…',            kb: '⌘O' },
  { label: 'Open Recent', submenu: ['night drive · idea 02', 'saturn bounce v3', 'untitled 47'] },
  { sep: true },
  { label: 'Save',                     kb: '⌘S' },
  { label: 'Save As…',                 kb: '⇧⌘S' },
  { label: 'Revert to Autosave' },
  { sep: true },
  { label: 'Import Audio…',            kb: '⌘I' },
  { label: 'Export', submenu: ['Mixdown (WAV)…', 'Mixdown (MP3)…', 'Stems…', 'Project Archive (.groov2e)…'] },
  { sep: true },
  { label: 'Project Settings…' },
  { label: 'Close Project',            kb: '⌘W' },
];

const EDIT_MENU = [
  { label: 'Undo',                     kb: '⌘Z' },
  { label: 'Redo',                     kb: '⇧⌘Z' },
  { sep: true },
  { label: 'Cut',                      kb: '⌘X' },
  { label: 'Copy',                     kb: '⌘C' },
  { label: 'Paste',                    kb: '⌘V' },
  { label: 'Duplicate',                kb: '⌘D' },
  { label: 'Delete',                   kb: '⌫' },
  { sep: true },
  { label: 'Select All',               kb: '⌘A' },
  { label: 'Deselect',                 kb: '⇧⌘A' },
  { sep: true },
  { label: 'Split at Playhead',        kb: '⌘E', action: 'split' },
  { label: 'Join Clips',               kb: '⌘J' },
  { label: 'Snap to Grid' },
  { sep: true },
  { label: 'Preferences…',             kb: '⌘,' },
];

const TRACK_MENU = [
  { label: 'Add Audio Track',          kb: '⌘T', action: 'addAudio' },
  { label: 'Add Instrument Track',     kb: '⇧⌘T', action: 'addInstrument' },
  { label: 'Add Bus Track' },
  { sep: true },
  { label: 'Duplicate Selected',       kb: '⌘D' },
  { label: 'Delete Selected',          kb: '⌫', action: 'deleteSelected' },
  { sep: true },
  { label: 'Arm for Recording',        kb: 'R', action: 'armSelected' },
  { label: 'Solo',                     kb: 'S', action: 'soloSelected' },
  { label: 'Mute',                     kb: 'M', action: 'muteSelected' },
  { sep: true },
  { label: 'Rename…',                  kb: 'F2' },
  { label: 'Track Color', submenu: ['Amber', 'Espresso', 'Signal Blue', 'Forest', 'Clay'] },
  { label: 'Freeze Track' },
  { sep: true },
  { label: 'Input Routing…' },
  { label: 'Output Routing…' },
];

window.INPUT_DEVICES = INPUT_DEVICES;
window.OUTPUT_DEVICES = OUTPUT_DEVICES;
window.KEYS = KEYS;
window.TIME_SIGS = TIME_SIGS;
window.FILE_MENU = FILE_MENU;
window.EDIT_MENU = EDIT_MENU;
window.TRACK_MENU = TRACK_MENU;
