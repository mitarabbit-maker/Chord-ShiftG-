"use client";

import { useState, useCallback, useEffect } from “react”;

// ── Music Theory ───────────────────────────────────────────────
const NOTES_SHARP = [‘C’,‘C#’,‘D’,‘D#’,‘E’,‘F’,‘F#’,‘G’,‘G#’,‘A’,‘A#’,‘B’];
const NOTES_FLAT  = [‘C’,‘Db’,‘D’,‘Eb’,‘E’,‘F’,‘Gb’,‘G’,‘Ab’,‘A’,‘Bb’,‘B’];
const KEYS = [‘C’,‘C#’,‘D’,‘Eb’,‘E’,‘F’,‘F#’,‘G’,‘Ab’,‘A’,‘Bb’,‘B’];
const ENHARMONIC = {
‘C#’:‘Db’,‘Db’:‘C#’,‘D#’:‘Eb’,‘Eb’:‘D#’,
‘F#’:‘Gb’,‘Gb’:‘F#’,‘G#’:‘Ab’,‘Ab’:‘G#’,‘A#’:‘Bb’,‘Bb’:‘A#’,
};

function noteIndex(note) {
const i = NOTES_SHARP.indexOf(note);
return i !== -1 ? i : NOTES_FLAT.indexOf(note);
}
function transposeNote(note, semitones, useFlat = false) {
const idx = noteIndex(note);
if (idx === -1) return note;
const newIdx = ((idx + semitones) % 12 + 12) % 12;
return useFlat ? NOTES_FLAT[newIdx] : NOTES_SHARP[newIdx];
}
const CHORD_ROOT_RE = /\b([A-G][b#]?)((?:maj|min|m|M|dim|aug|sus|add|no)?[0-9]?(?:maj|min|m|M|dim|aug|sus|add|no)?[0-9]*)(?=\s|/|$||)/g;
function transposeChordText(text, semitones, useFlat) {
return text.replace(CHORD_ROOT_RE, (*, root, suffix) =>
transposeNote(root, semitones, useFlat) + suffix
);
}
function getCapoTable(targetKey) {
return Array.from({ length: 8 }, (*, fret) => ({
fret,
shape: NOTES_SHARP[((noteIndex(targetKey) - fret) % 12 + 12) % 12],
}));
}
function getSoundingRoot(shape, fret) {
return transposeNote(shape, fret, false);
}

// ── Chord qualities ────────────────────────────────────────────
const CHORD_QUALITIES = [
{ id: ‘’,      label: ‘Major’  },
{ id: ‘m’,     label: ‘minor’  },
{ id: ‘aug’,   label: ‘aug’    },
{ id: ‘dim’,   label: ‘dim’    },
{ id: ‘7’,     label: ‘7’      },
{ id: ‘m7’,    label: ‘m7’     },
{ id: ‘maj7’,  label: ‘maj7’   },
{ id: ‘sus2’,  label: ‘sus2’   },
{ id: ‘sus4’,  label: ‘sus4’   },
{ id: ‘dim7’,  label: ‘dim7’   },
];

// ── i18n ───────────────────────────────────────────────────────
const T = {
ja: {
toolLabel:‘Guitar Tool’, subtitle:‘カポ逆引き · カポ変換 · トランスポーズ’,
tabReverse:‘カポ逆引き’, tabCapo:‘カポ変換表’, tabTranspose:‘キー変換’,
revTitle:‘カポ逆引き’,
revDesc:‘カポ位置と押さえているフォームを選ぶと、実際に鳴っているコードがわかります。’,
revCapoPos:‘カポ位置’, revCapoNone:‘カポなし（開放）’,
revCapoFret:(n)=>`${n} フレット`,
revRoot:‘押さえているルート音’, revQuality:‘コードの種類’,
revPlayed:(chord,fret)=>`カポ ${fret>0?fret+'フレット':'なし'} ＋ ${chord} フォーム`,
revSounding:‘実際に鳴っているコード’,
revCalc:(chord,fret,result)=>[`${chord}（フォーム）`,`＋ ${fret} 半音（カポ分）`,`＝ ${result}`],
revDiagPlayed:‘押さえているフォーム’, revDiagSounding:‘実際に鳴っているコード’,
capoTitle:‘カポ変換表（順引き）’,
capoDesc:‘鳴らしたいキーを選ぶと、各カポ位置で押さえるべきコードフォームが一覧表示されます。’,
capoTarget:‘ターゲットキー’, capoNone:‘カポなし’, capoFret:(n)=>`カポ ${n} フレット`,
diagLabel:(key)=>`よく使うコード指板図 — ゴールド枠＝キー「${key}」で使うフォーム`,
transTitle:‘キー変換（トランスポーズ）’,
transDesc:‘コードを貼り付けて半音単位でキーを移動。歌いやすいキーに素早く変換できます。’,
transPlaceholder:‘コードを入力…\n例: Am  F  C  G’,
transSemi:‘半音移動’, transFlat:‘♭表記’, transResult:‘変換結果’,
},
en: {
toolLabel:‘Guitar Tool’, subtitle:‘Reverse Capo · Capo Chart · Transpose’,
tabReverse:‘Reverse Capo’, tabCapo:‘Capo Chart’, tabTranspose:‘Transpose’,
revTitle:‘Reverse Capo Lookup’,
revDesc:“Select capo position and the chord shape you’re fingering — see what key is actually sounding.”,
revCapoPos:‘Capo Position’, revCapoNone:‘No capo (open)’,
revCapoFret:(n)=>`Fret ${n}`,
revRoot:“Root note (shape you’re pressing)”, revQuality:‘Chord Quality’,
revPlayed:(chord,fret)=>`Capo ${fret>0?fret:'off'} + ${chord} shape`,
revSounding:‘Actual sounding chord’,
revCalc:(chord,fret,result)=>[`${chord} (shape)`,`+ ${fret} semitones (capo)`,`= ${result}`],
revDiagPlayed:“Shape you’re playing”, revDiagSounding:‘Actual sounding chord’,
capoTitle:‘Capo Conversion Chart’,
capoDesc:‘Pick a target key — see which chord shape to play at each capo position.’,
capoTarget:‘Target Key’, capoNone:‘No capo’, capoFret:(n)=>`Capo fret ${n}`,
diagLabel:(key)=>`Common diagrams — gold border = shapes used in key "${key}"`,
transTitle:‘Transpose’,
transDesc:‘Paste your chords and shift the key up or down by semitones.’,
transPlaceholder:‘Enter chords…\ne.g. Am  F  C  G’,
transSemi:‘Semitones’, transFlat:‘♭ notation’, transResult:‘Result’,
},
};

// ── Static chord shapes ────────────────────────────────────────
// frets: 6 strings, low-E to high-e. -1=mute, 0=open, n=fret number
const CHORD_SHAPES = {
// ── Major open ──
‘C’:     { frets:[-1,3,2,0,1,0], fingers:[’’,‘3’,‘2’,’’,‘1’,’’] },
‘D’:     { frets:[-1,-1,0,2,3,2], fingers:[’’,’’,’’,‘1’,‘3’,‘2’] },
‘E’:     { frets:[0,2,2,1,0,0],   fingers:[’’,‘2’,‘3’,‘1’,’’,’’] },
‘F’:     { frets:[1,1,2,3,3,1],   fingers:[‘1’,‘1’,‘2’,‘3’,‘4’,‘1’], barre:1 },
‘G’:     { frets:[3,2,0,0,0,3],   fingers:[‘3’,‘2’,’’,’’,’’,‘4’] },
‘A’:     { frets:[-1,0,2,2,2,0],  fingers:[’’,’’,‘1’,‘2’,‘3’,’’] },
‘B’:     { frets:[-1,2,4,4,4,2],  fingers:[’’,‘1’,‘2’,‘3’,‘4’,‘1’], barre:2 },
‘C#’:    { frets:[-1,4,3,1,2,1],  fingers:[’’,‘4’,‘3’,‘1’,‘2’,‘1’], barre:1 },
‘Db’:    { frets:[-1,4,3,1,2,1],  fingers:[’’,‘4’,‘3’,‘1’,‘2’,‘1’], barre:1 },
‘Eb’:    { frets:[-1,-1,1,3,4,3], fingers:[’’,’’,‘1’,‘2’,‘4’,‘3’] },
‘F#’:    { frets:[2,2,4,4,4,2],   fingers:[‘1’,‘1’,‘2’,‘3’,‘4’,‘1’], barre:2 },
‘Gb’:    { frets:[2,2,4,4,4,2],   fingers:[‘1’,‘1’,‘2’,‘3’,‘4’,‘1’], barre:2 },
‘Ab’:    { frets:[-1,0,2,1,1,4],  fingers:[’’,’’,‘3’,‘1’,‘1’,‘4’] },
‘Bb’:    { frets:[-1,1,3,3,3,1],  fingers:[’’,‘1’,‘2’,‘3’,‘4’,‘1’], barre:1 },
// ── minor open ──
‘Am’:    { frets:[-1,0,2,2,1,0],  fingers:[’’,’’,‘2’,‘3’,‘1’,’’] },
‘Em’:    { frets:[0,2,2,0,0,0],   fingers:[’’,‘2’,‘3’,’’,’’,’’] },
‘Dm’:    { frets:[-1,-1,0,2,3,1], fingers:[’’,’’,’’,‘2’,‘3’,‘1’] },
‘Bm’:    { frets:[-1,2,4,4,3,2],  fingers:[’’,‘1’,‘3’,‘4’,‘2’,‘1’], barre:2 },
‘Cm’:    { frets:[-1,3,5,5,4,3],  fingers:[’’,‘1’,‘3’,‘4’,‘2’,‘1’], barre:3 },
‘Fm’:    { frets:[1,3,3,1,1,1],   fingers:[‘1’,‘3’,‘4’,‘1’,‘1’,‘1’], barre:1 },
‘Gm’:    { frets:[3,5,5,3,3,3],   fingers:[‘1’,‘3’,‘4’,‘1’,‘1’,‘1’], barre:3 },
// ── aug ──
‘Caug’:  { frets:[-1,3,2,1,1,0],  fingers:[’’,‘4’,‘3’,‘1’,‘1’,’’] },
‘Eaug’:  { frets:[0,3,2,1,1,0],   fingers:[’’,‘4’,‘3’,‘1’,‘1’,’’] },
‘Aaug’:  { frets:[-1,0,3,2,2,1],  fingers:[’’,’’,‘4’,‘2’,‘3’,‘1’] },
‘Gaug’:  { frets:[3,2,1,0,0,3],   fingers:[‘3’,‘2’,‘1’,’’,’’,‘4’] },
// ── dim ──
‘Cdim’:  { frets:[-1,3,1,2,1,-1], fingers:[’’,‘4’,‘1’,‘3’,‘1’,’’] },
‘Ddim’:  { frets:[-1,-1,0,1,0,1], fingers:[’’,’’,’’,‘1’,’’,‘2’] },
‘Edim’:  { frets:[0,1,2,0,2,-1],  fingers:[’’,‘1’,‘2’,’’,‘3’,’’] },
‘Bdim’:  { frets:[-1,2,0,1,0,-1], fingers:[’’,‘2’,’’,‘1’,’’,’’] },
// ── 7 ──
‘C7’:    { frets:[-1,3,2,3,1,0],  fingers:[’’,‘3’,‘2’,‘4’,‘1’,’’] },
‘D7’:    { frets:[-1,-1,0,2,1,2], fingers:[’’,’’,’’,‘2’,‘1’,‘3’] },
‘E7’:    { frets:[0,2,0,1,0,0],   fingers:[’’,‘2’,’’,‘1’,’’,’’] },
‘G7’:    { frets:[3,2,0,0,0,1],   fingers:[‘3’,‘2’,’’,’’,’’,‘1’] },
‘A7’:    { frets:[-1,0,2,0,2,0],  fingers:[’’,’’,‘2’,’’,‘3’,’’] },
‘B7’:    { frets:[-1,2,1,2,0,2],  fingers:[’’,‘3’,‘1’,‘4’,’’,‘2’] },
// ── m7 ──
‘Am7’:   { frets:[-1,0,2,0,1,0],  fingers:[’’,’’,‘2’,’’,‘1’,’’] },
‘Em7’:   { frets:[0,2,2,0,3,0],   fingers:[’’,‘1’,‘2’,’’,‘4’,’’] },
‘Dm7’:   { frets:[-1,-1,0,2,1,1], fingers:[’’,’’,’’,‘2’,‘1’,‘1’] },
‘Bm7’:   { frets:[-1,2,4,2,3,2],  fingers:[’’,‘1’,‘3’,‘1’,‘2’,‘1’], barre:2 },
‘Cm7’:   { frets:[-1,3,5,3,4,3],  fingers:[’’,‘1’,‘3’,‘1’,‘2’,‘1’], barre:3 },
‘Fm7’:   { frets:[1,3,3,1,4,1],   fingers:[‘1’,‘3’,‘4’,‘1’,‘4’,‘1’], barre:1 },
‘Gm7’:   { frets:[3,5,5,3,6,3],   fingers:[‘1’,‘3’,‘4’,‘1’,‘4’,‘1’], barre:3 },
// ── maj7 ──
‘Cmaj7’: { frets:[-1,3,2,0,0,0],  fingers:[’’,‘3’,‘2’,’’,’’,’’] },
‘Amaj7’: { frets:[-1,0,2,1,2,0],  fingers:[’’,’’,‘2’,‘1’,‘3’,’’] },
‘Emaj7’: { frets:[0,2,1,1,0,0],   fingers:[’’,‘3’,‘1’,‘2’,’’,’’] },
‘Gmaj7’: { frets:[3,2,0,0,0,2],   fingers:[‘3’,‘2’,’’,’’,’’,‘1’] },
‘Dmaj7’: { frets:[-1,-1,0,2,2,2], fingers:[’’,’’,’’,‘1’,‘2’,‘3’] },
// ── sus2 ──
‘Dsus2’: { frets:[-1,-1,0,2,3,0], fingers:[’’,’’,’’,‘1’,‘2’,’’] },
‘Asus2’: { frets:[-1,0,2,2,0,0],  fingers:[’’,’’,‘1’,‘2’,’’,’’] },
‘Esus2’: { frets:[0,2,2,4,0,0],   fingers:[’’,‘1’,‘2’,‘4’,’’,’’] },
‘Gsus2’: { frets:[3,0,0,0,3,3],   fingers:[‘2’,’’,’’,’’,‘3’,‘4’] },
‘Csus2’: { frets:[-1,3,0,0,3,3],  fingers:[’’,‘2’,’’,’’,‘3’,‘4’] },
// ── sus4 ──
‘Dsus4’: { frets:[-1,-1,0,2,3,3], fingers:[’’,’’,’’,‘1’,‘2’,‘3’] },
‘Asus4’: { frets:[-1,0,2,2,3,0],  fingers:[’’,’’,‘1’,‘2’,‘3’,’’] },
‘Esus4’: { frets:[0,2,2,2,0,0],   fingers:[’’,‘1’,‘2’,‘3’,’’,’’] },
‘Gsus4’: { frets:[3,3,0,0,1,3],   fingers:[‘2’,‘3’,’’,’’,‘1’,‘4’] },
‘Csus4’: { frets:[-1,3,3,0,1,1],  fingers:[’’,‘3’,‘4’,’’,‘1’,‘1’] },
// ── dim7 ──
‘Adim7’: { frets:[-1,0,1,2,1,2],  fingers:[’’,’’,‘1’,‘3’,‘2’,‘4’] },
‘Cdim7’: { frets:[-1,3,4,2,4,2],  fingers:[’’,‘2’,‘4’,‘1’,‘3’,‘1’] },
‘Ddim7’: { frets:[-1,-1,0,1,0,1], fingers:[’’,’’,’’,‘1’,’’,‘2’] },
‘Edim7’: { frets:[-1,-1,2,3,2,3], fingers:[’’,’’,‘1’,‘3’,‘2’,‘4’] },
‘Bdim7’: { frets:[-1,2,3,1,3,1],  fingers:[’’,‘2’,‘4’,‘1’,‘3’,‘1’] },
‘Gdim7’: { frets:[-1,-1,5,3,4,3], fingers:[’’,’’,‘4’,‘1’,‘3’,‘1’] },
};

// ── Barre shape auto-generator ─────────────────────────────────
// For any root × quality not in CHORD_SHAPES, generate a barre form
const BARRE_POS = {
‘C’: {form:‘A’,n:3}, ‘C#’:{form:‘A’,n:4}, ‘Db’:{form:‘A’,n:4},
‘D’: {form:‘A’,n:5}, ‘D#’:{form:‘A’,n:6}, ‘Eb’:{form:‘A’,n:6},
‘E’: {form:‘E’,n:0},
‘F’: {form:‘E’,n:1}, ‘F#’:{form:‘E’,n:2}, ‘Gb’:{form:‘E’,n:2},
‘G’: {form:‘E’,n:3}, ‘G#’:{form:‘E’,n:4}, ‘Ab’:{form:‘E’,n:4},
‘A’: {form:‘A’,n:0}, ‘A#’:{form:‘A’,n:1}, ‘Bb’:{form:‘A’,n:1},
‘B’: {form:‘A’,n:2},
};

function generateBarreShape(root, quality) {
const pos = BARRE_POS[root];
if (!pos) return null;
const { form, n } = pos;
let frets, fingers, barre;

if (form === ‘E’) {
barre = n;
if      (quality === ‘’)      { frets=[n,n+2,n+2,n+1,n,n];   fingers=[‘1’,‘3’,‘4’,‘2’,‘1’,‘1’]; }
else if (quality === ‘m’)     { frets=[n,n+2,n+2,n,n,n];     fingers=[‘1’,‘3’,‘4’,‘1’,‘1’,‘1’]; }
else if (quality === ‘7’)     { frets=[n,n+2,n,n+1,n,n];     fingers=[‘1’,‘3’,‘1’,‘2’,‘1’,‘1’]; }
else if (quality === ‘m7’)    { frets=[n,n+2,n,n,n,n];       fingers=[‘1’,‘3’,‘1’,‘1’,‘1’,‘1’]; }
else if (quality === ‘maj7’)  { frets=[n,n+2,n+1,n+1,n,n];   fingers=[‘1’,‘4’,‘2’,‘3’,‘1’,‘1’]; }
else if (quality === ‘sus2’)  { frets=[n,n+2,n+4,n+4,n,n];   fingers=[‘1’,‘2’,‘3’,‘4’,‘1’,‘1’]; }
else if (quality === ‘sus4’)  { frets=[n,n+2,n+2,n+2,n,n];   fingers=[‘1’,‘2’,‘3’,‘4’,‘1’,‘1’]; }
else if (quality === ‘aug’)   { frets=[n,n+3,n+2,n+1,n+1,n]; fingers=[‘1’,‘4’,‘3’,‘2’,‘2’,‘1’]; barre=0; }
else if (quality === ‘dim’)   { frets=[-1,n,n+3,n+2,n+2,-1]; fingers=[’’,‘1’,‘4’,‘2’,‘3’,’’]; barre=0; }
else if (quality === ‘dim7’)  { frets=[-1,n,n+2,n+1,n+2,-1]; fingers=[’’,‘1’,‘3’,‘2’,‘4’,’’]; barre=0; }
else return null;
} else {
barre = n;
if      (quality === ‘’)      { frets=[-1,n,n+2,n+2,n+2,n];    fingers=[’’,‘1’,‘2’,‘3’,‘4’,‘1’]; }
else if (quality === ‘m’)     { frets=[-1,n,n+2,n+2,n+1,n];    fingers=[’’,‘1’,‘3’,‘4’,‘2’,‘1’]; }
else if (quality === ‘7’)     { frets=[-1,n,n+2,n,n+2,n];      fingers=[’’,‘1’,‘3’,‘1’,‘4’,‘1’]; }
else if (quality === ‘m7’)    { frets=[-1,n,n+2,n,n+1,n];      fingers=[’’,‘1’,‘3’,‘1’,‘2’,‘1’]; }
else if (quality === ‘maj7’)  { frets=[-1,n,n+2,n+1,n+2,n];    fingers=[’’,‘1’,‘3’,‘2’,‘4’,‘1’]; }
else if (quality === ‘sus2’)  { frets=[-1,n,n+2,n+2,n,n];      fingers=[’’,‘1’,‘3’,‘4’,‘1’,‘1’]; }
else if (quality === ‘sus4’)  { frets=[-1,n,n+2,n+2,n+3,n];    fingers=[’’,‘1’,‘2’,‘3’,‘4’,‘1’]; }
else if (quality === ‘aug’)   { frets=[-1,n,n+3,n+2,n+2,n+1];  fingers=[’’,‘1’,‘4’,‘2’,‘3’,‘1’]; barre=0; }
else if (quality === ‘dim’)   { frets=[-1,n,n+1,n+2,n+1,-1];   fingers=[’’,‘1’,‘2’,‘4’,‘3’,’’]; barre=0; }
else if (quality === ‘dim7’)  { frets=[-1,n,n+1,n+2,n+1,n+2];  fingers=[’’,‘1’,‘2’,‘4’,‘3’,‘4’]; barre=0; }
else return null;
}
return { frets, fingers, barre };
}

function resolveShape(root, quality) {
// 1. Direct lookup
const key1 = root + quality;
if (CHORD_SHAPES[key1]) return CHORD_SHAPES[key1];
// 2. Enharmonic equivalent
const alt = ENHARMONIC[root];
if (alt) {
const key2 = alt + quality;
if (CHORD_SHAPES[key2]) return CHORD_SHAPES[key2];
}
// 3. Auto-generate barre shape
const gen = generateBarreShape(root, quality);
if (gen) return gen;
// 4. Last resort: just the root major shape
if (CHORD_SHAPES[root]) return CHORD_SHAPES[root];
if (alt && CHORD_SHAPES[alt]) return CHORD_SHAPES[alt];
return null;
}

// ── Chord Diagram component ────────────────────────────────────
const FRET_ROWS = 5;

function ChordDiagram({ root, quality = ‘’, highlight = false }) {
const shape = resolveShape(root, quality);
const label = root + quality;

if (!shape) {
return (
<div style={{textAlign:‘center’,width:96}}>
<div style={{fontFamily:‘Cormorant Garamond,serif’,fontSize:17,fontWeight:700,
color:’#c9944a’,marginBottom:4}}>{label}</div>
<div style={{width:70,height:88,margin:‘0 auto’,border:‘1px dashed #2e2a25’,
borderRadius:6,display:‘flex’,alignItems:‘center’,justifyContent:‘center’}}>
<span style={{fontSize:10,color:’#555’,fontFamily:‘DM Mono,monospace’,
textAlign:‘center’,lineHeight:1.6}}>図<br/>準備中</span>
</div>
</div>
);
}

const { frets, fingers, barre = 0 } = shape;
const pressed = frets.filter(f => f > 0);
const maxFret = pressed.length ? Math.max(…pressed) : 1;
const minFret = pressed.length ? Math.min(…pressed) : 1;
const startFret = maxFret <= 5 ? 1 : minFret;

const W = 88, H = 110;
const padL = 14, padR = 8, padT = 22, padB = 8;
const boardW = W - padL - padR;
const boardH = H - padT - padB;
const strSp = boardW / 5;
const fretSp = boardH / FRET_ROWS;

const sx = s => padL + s * strSp;
const fy = f => padT + (f - startFret + 1) * fretSp;
const dots = frets.map((f, s) => (f > 0 ? { s, f, finger: fingers[s] } : null)).filter(Boolean);

return (
<div style={{textAlign:‘center’}}>
<div style={{fontFamily:‘Cormorant Garamond,serif’,fontSize:17,fontWeight:700,
color: highlight ? ‘#e8b86d’ : ‘#e8e0d4’, marginBottom:4}}>{label}</div>
<svg width={W} height={H} style={{overflow:‘visible’}}>
{/* Nut or position marker */}
{startFret === 1
? <rect x={padL} y={padT} width={boardW} height={3} fill="#c8bfb0" rx={1}/>
: <text x={padL-4} y={padT+fretSp*0.65} fontSize={9} fill="#c9944a"
fontFamily="DM Mono,monospace" textAnchor="end">{startFret}</text>
}
{/* Fret lines */}
{Array.from({length: FRET_ROWS}, (_, i) => (
<line key={i}
x1={padL} y1={padT+(i+1)*fretSp}
x2={padL+boardW} y2={padT+(i+1)*fretSp}
stroke="#2e2a25" strokeWidth={1}/>
))}
{/* Strings */}
{Array.from({length:6}, (_, s) => (
<line key={s}
x1={sx(s)} y1={padT} x2={sx(s)} y2={padT+boardH}
stroke={s===0||s===5 ? ‘#4a4540’ : ‘#3a3530’}
strokeWidth={s===0||s===5 ? 1.8 : 1.2}/>
))}
{/* Open / muted markers */}
{frets.map((f, s) => {
if (f === 0) return (
<circle key={s} cx={sx(s)} cy={padT-9} r={4}
fill="none" stroke="#7a7068" strokeWidth={1.2}/>
);
if (f === -1) return (
<g key={s}>
<line x1={sx(s)-4} y1={padT-13} x2={sx(s)+4} y2={padT-5} stroke="#555" strokeWidth={1.2}/>
<line x1={sx(s)+4} y1={padT-13} x2={sx(s)-4} y2={padT-5} stroke="#555" strokeWidth={1.2}/>
</g>
);
return null;
})}
{/* Barre bar */}
{barre > 0 && (
<rect x={padL} y={fy(barre)-fretSp/2-7} width={boardW} height={14}
rx={7} fill="#c9944a" opacity={0.3}/>
)}
{/* Finger dots */}
{dots.map(({ s, f, finger }, i) => {
const cx = sx(s);
const cy = fy(f) - fretSp/2;
return (
<g key={i}>
<circle cx={cx} cy={cy} r={7} fill="#c9944a"/>
{finger ? (
<text x={cx} y={cy+4} textAnchor="middle" fontSize={8}
fill="#141210" fontFamily="DM Mono,monospace">{finger}</text>
) : null}
</g>
);
})}
</svg>
</div>
);
}

// ── Styles ─────────────────────────────────────────────────────
const STYLE = `
@import url(‘https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap’);
:root{
–bg:#141210; –surface:#1e1b18; –border:#2e2a25;
–gold:#c9944a; –gold-dim:#8a6330; –text:#e8e0d4; –muted:#7a7068; –accent:#e8b86d;
}
*{box-sizing:border-box;margin:0;padding:0;}
body{background:var(–bg);color:var(–text);font-family:‘DM Sans’,sans-serif;min-height:100vh;}
.app{max-width:860px;margin:0 auto;padding:40px 20px 80px;}

.header{text-align:center;margin-bottom:44px;}
.header::after{content:’’;display:block;width:80px;height:1px;background:var(–gold);margin:18px auto 0;opacity:.5;}
.logo-label{font-family:‘DM Mono’,monospace;font-size:11px;letter-spacing:.25em;color:var(–gold);text-transform:uppercase;margin-bottom:10px;}
.logo-title{font-family:‘Cormorant Garamond’,serif;font-size:clamp(30px,5.5vw,50px);font-weight:700;line-height:1.1;}
.logo-title span{color:var(–gold);}
.subtitle{margin-top:8px;color:var(–muted);font-size:13px;font-weight:300;}

.tabs{display:flex;gap:2px;background:var(–surface);border:1px solid var(–border);border-radius:10px;padding:4px;margin-bottom:26px;}
.tab{flex:1;padding:10px 10px;border-radius:7px;border:none;background:none;color:var(–muted);font-family:‘DM Sans’,sans-serif;font-size:13px;font-weight:500;cursor:pointer;transition:all .2s;}
.tab.active{background:var(–border);color:var(–accent);}
.tab:hover:not(.active){color:var(–text);}

.card{background:var(–surface);border:1px solid var(–border);border-radius:14px;padding:24px;margin-bottom:20px;}
.card-title{font-family:‘Cormorant Garamond’,serif;font-size:20px;font-weight:600;margin-bottom:5px;}
.card-desc{color:var(–muted);font-size:13px;margin-bottom:20px;line-height:1.6;}

.field{display:flex;flex-direction:column;gap:7px;margin-bottom:20px;}
.field label{font-size:11px;color:var(–muted);letter-spacing:.1em;text-transform:uppercase;font-family:‘DM Mono’,monospace;}

.key-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;}
@media(max-width:480px){.key-grid{grid-template-columns:repeat(4,1fr);}}
.key-btn{padding:10px 4px;border-radius:8px;border:1px solid var(–border);background:var(–bg);color:var(–muted);font-family:‘DM Mono’,monospace;font-size:14px;cursor:pointer;transition:all .15s;text-align:center;}
.key-btn:hover{border-color:var(–gold-dim);color:var(–text);}
.key-btn.selected{background:var(–gold);border-color:var(–gold);color:#141210;font-weight:500;}

.quality-grid{display:flex;flex-wrap:wrap;gap:6px;}
.q-btn{padding:7px 13px;border-radius:7px;border:1px solid var(–border);background:var(–bg);color:var(–muted);font-family:‘DM Mono’,monospace;font-size:12px;cursor:pointer;transition:all .15s;}
.q-btn:hover{border-color:var(–gold-dim);color:var(–text);}
.q-btn.selected{background:var(–gold-dim);border-color:var(–gold);color:var(–accent);}

.fret-row{display:flex;align-items:center;gap:14px;}
.fret-val{font-family:‘DM Mono’,monospace;font-size:24px;color:var(–accent);min-width:28px;text-align:center;font-weight:500;}
.fret-slider{-webkit-appearance:none;appearance:none;width:200px;height:4px;background:var(–border);border-radius:2px;outline:none;cursor:pointer;}
.fret-slider::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;border-radius:50%;background:var(–gold);cursor:pointer;}
.fret-txt{font-size:12px;color:var(–muted);font-family:‘DM Mono’,monospace;}

.result-banner{background:var(–bg);border:1px solid var(–gold-dim);border-radius:12px;padding:20px 24px;display:flex;align-items:center;gap:20px;flex-wrap:wrap;margin-bottom:4px;}
.result-big{font-family:‘Cormorant Garamond’,serif;font-size:58px;font-weight:700;color:var(–accent);line-height:1;}
.result-arrow{font-size:24px;color:var(–muted);}
.result-calc{margin-left:auto;text-align:right;font-size:12px;color:var(–muted);line-height:1.9;font-family:‘DM Mono’,monospace;}
.result-calc span{color:var(–accent);}

.diagram-section{margin-top:24px;}
.diagram-label{font-size:11px;color:var(–muted);letter-spacing:.12em;text-transform:uppercase;font-family:‘DM Mono’,monospace;margin-bottom:14px;}
.diagram-row{display:flex;flex-wrap:wrap;gap:12px;}
.diagram-card{background:var(–bg);border:1px solid var(–border);border-radius:10px;padding:14px 10px;transition:border-color .15s;}
.diagram-card:hover{border-color:var(–gold-dim);}
.diagram-card.hl{border-color:var(–gold);}
.diagram-card.hl-accent{border-color:var(–accent);}

.two-diagrams{display:flex;align-items:flex-start;gap:8px;flex-wrap:wrap;}
.two-diagrams .col{display:flex;flex-direction:column;gap:8px;flex:1;min-width:110px;}
.two-diagrams .arrow{display:flex;align-items:center;padding-top:52px;color:var(–muted);font-size:22px;}

.capo-table{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;}
@media(max-width:480px){.capo-table{grid-template-columns:repeat(2,1fr);}}
.capo-cell{background:var(–bg);border:1px solid var(–border);border-radius:10px;padding:13px 10px;text-align:center;transition:border-color .15s;}
.capo-cell:hover{border-color:var(–gold-dim);}
.capo-cell.open .cc-chord{color:var(–accent);}
.cc-fret{font-size:10px;color:var(–gold);font-family:‘DM Mono’,monospace;margin-bottom:5px;}
.cc-chord{font-family:‘Cormorant Garamond’,serif;font-size:28px;font-weight:700;}

.divider{height:1px;background:var(–border);margin:22px 0;}

.textarea{width:100%;min-height:110px;background:var(–bg);border:1px solid var(–border);border-radius:10px;padding:13px 15px;color:var(–text);font-family:‘DM Mono’,monospace;font-size:14px;line-height:1.7;resize:vertical;outline:none;transition:border-color .15s;margin-bottom:16px;}
.textarea:focus{border-color:var(–gold-dim);}
.textarea::placeholder{color:var(–muted);}
.semi-row{display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap;}
.semi-btns{display:flex;align-items:center;gap:2px;background:var(–bg);border:1px solid var(–border);border-radius:8px;padding:3px;}
.semi-btn{width:34px;height:34px;border-radius:6px;border:none;background:none;color:var(–text);font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s;}
.semi-btn:hover{background:var(–border);}
.semi-val{min-width:44px;text-align:center;font-family:‘DM Mono’,monospace;font-size:15px;color:var(–accent);font-weight:500;}
.flat-tog{display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:var(–muted);user-select:none;margin-left:auto;}
.tog-track{width:36px;height:20px;background:var(–border);border-radius:10px;position:relative;transition:background .2s;}
.tog-track.on{background:var(–gold-dim);}
.tog-thumb{position:absolute;top:3px;left:3px;width:14px;height:14px;background:var(–text);border-radius:50%;transition:left .2s;}
.tog-track.on .tog-thumb{left:19px;}
.out-lbl{font-size:11px;color:var(–muted);letter-spacing:.12em;text-transform:uppercase;font-family:‘DM Mono’,monospace;margin-bottom:9px;}
.out-box{background:var(–bg);border:1px solid var(–border);border-radius:10px;padding:15px;font-family:‘DM Mono’,monospace;font-size:14px;line-height:1.8;color:var(–accent);white-space:pre-wrap;min-height:70px;}

.ad-strip{background:var(–surface);border:1px dashed var(–border);border-radius:10px;padding:14px;text-align:center;color:var(–muted);font-size:12px;font-family:‘DM Mono’,monospace;letter-spacing:.08em;margin-top:22px;}

.lang-toggle{display:flex;align-items:center;gap:2px;background:var(–surface);border:1px solid var(–border);border-radius:8px;padding:3px;position:absolute;top:0;right:0;}
.lang-btn{padding:5px 11px;border-radius:6px;border:none;background:none;color:var(–muted);font-family:‘DM Mono’,monospace;font-size:12px;cursor:pointer;transition:all .15s;letter-spacing:.05em;}
.lang-btn.active{background:var(–gold);color:#141210;font-weight:500;}
.lang-btn:hover:not(.active){color:var(–text);}
.header-wrap{position:relative;}
`;

const OPEN_CHORDS = [‘C’,‘D’,‘E’,‘F’,‘G’,‘A’,‘Am’,‘Em’,‘Dm’,‘Bb’];

// ── Main Component ─────────────────────────────────────────────
export default function GuitarChordTool() {
const [tab, setTab]             = useState(‘reverse’);
const [lang, setLang]           = useState(‘ja’);
const t                         = T[lang];
// reverse capo
const [revShape, setRevShape]   = useState(‘C’);
const [revFret, setRevFret]     = useState(4);
const [revQuality, setRevQuality] = useState(’’);
// forward capo
const [fwdKey, setFwdKey]       = useState(‘E’);
// transpose
const [inputText, setInputText] = useState(‘Am  F  C  G\nDm  Em  Am’);
const [semitones, setSemitones] = useState(2);
const [useFlat, setUseFlat]     = useState(false);

const soundingRoot = getSoundingRoot(revShape, revFret);
const soundingChord = soundingRoot + revQuality;
const playedChord   = revShape + revQuality;
const capoTable     = getCapoTable(fwdKey);

const transposed = useCallback(
() => transposeChordText(inputText, semitones, useFlat),
[inputText, semitones, useFlat]
);
const semLabel = semitones === 0 ? ‘±0’ : semitones > 0 ? `+${semitones}` : `${semitones}`;

// ── SEO meta tags (Next.js環境では next/head に移動してください) ──
useEffect(() => {
document.title = “ChordShift - カポ変換・コード逆引きツール | 無料ギターツール”;
const setMeta = (name, content, prop = false) => {
const sel = prop ? `meta[property="${name}"]` : `meta[name="${name}"]`;
let el = document.querySelector(sel);
if (!el) { el = document.createElement(“meta”); el.setAttribute(prop ? “property” : “name”, name); document.head.appendChild(el); }
el.setAttribute(“content”, content);
};
setMeta(“description”, “カポ位置とコードフォームを選ぶだけで実際に鳴っているキーがわかる。カポ変換・キートランスポーズも。ギタリストのための無料コード変換ツール。”);
setMeta(“keywords”,    “カポ 変換, コード 逆引き, ギター カポ, chord transposer, capo converter, guitar tool”);
setMeta(“theme-color”, “#141210”);
setMeta(“og:title”,       “ChordShift - カポ変換・コード逆引きツール”, true);
setMeta(“og:description”, “カポ位置とコードフォームを選ぶだけで実音がわかる。ギタリストのための無料コード変換ツール。”, true);
setMeta(“og:type”,        “website”, true);
setMeta(“og:url”,         “https://chordshift.vercel.app/”, true);
setMeta(“twitter:card”,        “summary”);
setMeta(“twitter:title”,       “ChordShift - カポ変換・コード逆引きツール”);
setMeta(“twitter:description”, “カポ位置とコードフォームを選ぶだけで実音がわかる。ギタリストのための無料コード変換ツール。”);
}, []);

return (
<>
<style>{STYLE}</style>
<div className="app">

```
    {/* ── Header ── */}
    <header className="header">
      <div className="header-wrap">
        <div className="lang-toggle">
          {['ja','en'].map(l => (
            <button key={l} className={`lang-btn ${lang===l?'active':''}`}
              onClick={()=>setLang(l)}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <div className="logo-label">{t.toolLabel}</div>
      <h1 className="logo-title">Chord<span>Shift</span></h1>
      <p className="subtitle">{t.subtitle}</p>
    </header>

    {/* ── Tabs ── */}
    <div className="tabs">
      {[
        {id:'reverse',   label:t.tabReverse},
        {id:'capo',      label:t.tabCapo},
        {id:'transpose', label:t.tabTranspose},
      ].map(t2 => (
        <button key={t2.id}
          className={`tab ${tab === t2.id ? 'active' : ''}`}
          onClick={() => setTab(t2.id)}>
          {t2.label}
        </button>
      ))}
    </div>

    {/* ══════════════════════════════════════════════
        REVERSE CAPO
    ══════════════════════════════════════════════ */}
    {tab === 'reverse' && (
      <div className="card">
        <div className="card-title">{t.revTitle}</div>
        <div className="card-desc">{t.revDesc}</div>

        {/* Fret slider */}
        <div className="field">
          <label>{t.revCapoPos}</label>
          <div className="fret-row">
            <span className="fret-val">{revFret}</span>
            <input type="range" min={0} max={9} value={revFret}
              className="fret-slider"
              onChange={e => setRevFret(Number(e.target.value))}/>
            <span className="fret-txt">
              {revFret === 0 ? t.revCapoNone : t.revCapoFret(revFret)}
            </span>
          </div>
        </div>

        {/* Root note */}
        <div className="field">
          <label>{t.revRoot}</label>
          <div className="key-grid">
            {KEYS.map(k => (
              <button key={k}
                className={`key-btn ${revShape === k ? 'selected' : ''}`}
                onClick={() => setRevShape(k)}>
                {k}
              </button>
            ))}
          </div>
        </div>

        {/* Quality */}
        <div className="field">
          <label>{t.revQuality}</label>
          <div className="quality-grid">
            {CHORD_QUALITIES.map(q => (
              <button key={q.id}
                className={`q-btn ${revQuality === q.id ? 'selected' : ''}`}
                onClick={() => setRevQuality(q.id)}>
                {q.label}
              </button>
            ))}
          </div>
        </div>

        {/* Result */}
        <div className="result-banner">
          <div>
            <div style={{fontSize:13,color:'var(--muted)',marginBottom:2}}>
              {t.revPlayed(playedChord, revFret)}
            </div>
            <div style={{fontSize:11,color:'var(--muted)'}}>{t.revSounding}</div>
          </div>
          <div className="result-arrow">→</div>
          <div className="result-big">{soundingChord}</div>
          {revFret > 0 && (
            <div className="result-calc">
              {t.revCalc(playedChord, revFret, soundingChord).map((line, i) => (
                <div key={i}>{i === 2 ? <span>{line}</span> : line}</div>
              ))}
            </div>
          )}
        </div>

        {/* Two diagrams side by side */}
        <div className="diagram-section">
          <div className="two-diagrams">
            <div className="col">
              <div className="diagram-label">{t.revDiagPlayed}</div>
              <div className="diagram-card hl" style={{display:'inline-block'}}>
                <ChordDiagram root={revShape} quality={revQuality} highlight={true}/>
              </div>
            </div>
            <div className="arrow">→</div>
            <div className="col">
              <div className="diagram-label">{t.revDiagSounding}</div>
              <div className="diagram-card hl-accent" style={{display:'inline-block'}}>
                <ChordDiagram root={soundingRoot} quality={revQuality} highlight={true}/>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* ══════════════════════════════════════════════
        FORWARD CAPO TABLE
    ══════════════════════════════════════════════ */}
    {tab === 'capo' && (
      <div className="card">
        <div className="card-title">{t.capoTitle}</div>
        <div className="card-desc">{t.capoDesc}</div>
        <div className="field">
          <label>{t.capoTarget}</label>
          <div className="key-grid">
            {KEYS.map(k => (
              <button key={k}
                className={`key-btn ${fwdKey === k ? 'selected' : ''}`}
                onClick={() => setFwdKey(k)}>
                {k}
              </button>
            ))}
          </div>
        </div>
        <div className="divider"/>
        <div className="out-lbl">{t.capoTarget}</div>
        <div className="capo-table" style={{marginTop:10}}>
          {capoTable.map(({ fret, shape }) => (
            <div key={fret} className={`capo-cell ${fret === 0 ? 'open' : ''}`}>
              <div className="cc-fret">
                {fret === 0 ? t.capoNone : t.capoFret(fret)}
              </div>
              <div className="cc-chord">{shape}</div>
            </div>
          ))}
        </div>
        <div className="diagram-section">
          <div className="diagram-label">{t.diagLabel(fwdKey)}</div>
          <div className="diagram-row">
            {OPEN_CHORDS.map(c => (
              <div key={c}
                className={`diagram-card ${capoTable.some(t2 => t2.shape === c) ? 'hl' : ''}`}>
                <ChordDiagram root={c} quality="" highlight={capoTable.some(t2 => t2.shape === c)}/>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}

    {/* ══════════════════════════════════════════════
        TRANSPOSE
    ══════════════════════════════════════════════ */}
    {tab === 'transpose' && (
      <div className="card">
        <div className="card-title">{t.transTitle}</div>
        <div className="card-desc">{t.transDesc}</div>
        <textarea
          className="textarea"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder={t.transPlaceholder}
          spellCheck={false}/>
        <div className="semi-row">
          <span style={{fontSize:13,color:'var(--muted)',minWidth:70}}>{t.transSemi}</span>
          <div className="semi-btns">
            <button className="semi-btn" onClick={() => setSemitones(s => s - 1)}>−</button>
            <span className="semi-val">{semLabel}</span>
            <button className="semi-btn" onClick={() => setSemitones(s => s + 1)}>＋</button>
          </div>
          <label className="flat-tog" onClick={() => setUseFlat(f => !f)}>
            <div className={`tog-track ${useFlat ? 'on' : ''}`}>
              <div className="tog-thumb"/>
            </div>
            {t.transFlat}
          </label>
        </div>
        <div className="out-lbl">{t.transResult}</div>
        <div className="out-box">
          {semitones === 0 ? (inputText || '　') : (transposed() || '　')}
        </div>
      </div>
    )}

    <div className="ad-strip">advertisement · 728×90</div>
  </div>
</>
```

);
}