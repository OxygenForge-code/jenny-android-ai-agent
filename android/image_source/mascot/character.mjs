/**
 * Lum — la mascotte di questo fork, disegnata come SVG parametrico.
 *
 * L'arte della mascotte a monte non e' coperta dalla AGPL (v. TRADEMARK.md),
 * quindi qui non c'e' nessun derivato: il personaggio e' uno spirito-lanterna
 * disegnato da zero in questo file, e la licenza con cui esce e' quella del
 * progetto (AGPL-3.0, v. mascot/README.md). Nessuna traccia, nessun ritaglio,
 * nessun colore dell'arte originale.
 *
 * Tre cose da cui dipende il resto dell'app:
 *
 * 1. **Il canvas e' la registrazione.** Ogni sorgente e' 3000x3000 e il
 *    personaggio sta nello stesso punto e alla stessa scala in tutte: la build
 *    non riscala e non ricentra mai una posa (android/image_source/README.md).
 * 2. **Corpo e faccia sono livelli ortogonali.** `drawCharacter()` restituisce
 *    l'inchiostro del corpo e quello della faccia separati, sullo stesso canvas.
 *    L'inchiostro della faccia non deve mai uscire dal riquadro del corpo:
 *    e' la condizione per cui una posa cotta e la sua ricomposizione hanno lo
 *    stesso riquadro d'inchiostro — la misura che fa
 *    tests/webui/test_mascot_layer_sources.py.
 * 3. **La posa cotta porta la faccia dentro la sua stessa trasformazione.**
 *    `ground`, `fall` e `hang` ruotano il personaggio: la faccia del livello
 *    resta dritta (a runtime si appoggia su un corpo dritto), quindi la posa
 *    cotta usa `faceCooked`, avvolta nella stessa catena di transform del
 *    corpo. Senza, la faccia atterra dove non c'e' la testa.
 */

const INK = '#221C2B';
const INK_SOFT = '#3A3149';
const CREAM = '#FCF6EA';
const CREAM_SHADE = '#E4D6C0';
const MOSS = '#3F6A55';
const MOSS_LIGHT = '#5E8F74';
const MOSS_DARK = '#28483A';
const LEAF = '#86BE6C';
const LEAF_DARK = '#5E9349';
const AMBER = '#FFC46E';
const AMBER_DEEP = '#EE9438';
const BRASS = '#C9A46A';
const BLUSH = '#F09C9C';

/** Canvas, spessore di linea e geometria della testa: condivisi da corpo, faccia e icona. */
export const CANVAS = 3000;
const LW = 26;
export const HEAD = { cx: 1500, cy: 1054, rx: 424, ry: 400 };

const GROUND = 2312; // dove poggiano gli stivali, in tutte le pose dritte
const SCALE = 1.12; // ingrandimento sul canvas: a 120 px di lato conta ogni pixel
const SCALE_ANCHOR = 2320;

const rad = (deg) => (deg * Math.PI) / 180;
const r2 = (n) => Math.round(n * 100) / 100;

const DEFS = `<defs>
	<radialGradient id="headFill" cx="36%" cy="28%" r="80%">
		<stop offset="0%" stop-color="#FFFFFF"/>
		<stop offset="54%" stop-color="${CREAM}"/>
		<stop offset="100%" stop-color="${CREAM_SHADE}"/>
	</radialGradient>
	<radialGradient id="core" cx="48%" cy="52%" r="58%">
		<stop offset="0%" stop-color="${AMBER}" stop-opacity="0.55"/>
		<stop offset="58%" stop-color="${AMBER_DEEP}" stop-opacity="0.18"/>
		<stop offset="100%" stop-color="${AMBER_DEEP}" stop-opacity="0"/>
	</radialGradient>
	<linearGradient id="cloakFill" x1="0.1" y1="0" x2="0.6" y2="1">
		<stop offset="0%" stop-color="${MOSS_LIGHT}"/>
		<stop offset="46%" stop-color="${MOSS}"/>
		<stop offset="100%" stop-color="${MOSS_DARK}"/>
	</linearGradient>
	<linearGradient id="leafFill" x1="0" y1="0" x2="0.4" y2="1">
		<stop offset="0%" stop-color="#A5D68A"/>
		<stop offset="60%" stop-color="${LEAF}"/>
		<stop offset="100%" stop-color="${LEAF_DARK}"/>
	</linearGradient>
	<linearGradient id="brassFill" x1="0" y1="0" x2="0.3" y2="1">
		<stop offset="0%" stop-color="#EBD3A6"/>
		<stop offset="55%" stop-color="${BRASS}"/>
		<stop offset="100%" stop-color="#9C7A46"/>
	</linearGradient>
</defs>`;

function svgDoc(inner) {
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}">${DEFS}${inner}</svg>`;
}

/* ── Vocabolario delle pose ─────────────────────────────────────────────────
 * Una posa sono pochi angoli e spostamenti, non un disegno a parte: lo stesso
 * modello produce tutte, ed e' questo che tiene identica la scala (e la
 * registrazione della testa) da una posa all'altra.
 *
 *   view    'front' | 'side' (la posa di bordo: stessa testa, un braccio solo)
 *   armL/armR {a: gradi da "giu'", l: lunghezza manica, bend: polso}
 *   feet    {dx, lift} — dx apre/chiude i piedi, lift alza un piede
 *   root    {r, tx, ty, ox, oy} — rotazione del personaggio attorno a (ox, oy)
 *   bob     spostamento verticale del busto
 *   sprout  oscillazione del germoglio, in gradi
 *
 * L'inclinazione della testa NON e' parametrica: corpi e facce si accoppiano
 * liberamente, quindi la testa deve stare nello stesso punto su tutte le pose
 * `front` (una faccia inclinata per un corpo solo sarebbe fuori registro su
 * ogni altro).
 */
export const POSES = {
	idle: { view: 'front', armL: { a: 10 }, armR: { a: -10 }, feet: {} },
	// `hand` e `think` restano a bob 0: la faccia e' un livello condiviso con
	// `idle`, quindi la testa non si muove fra i tre corpi.
	hand: { view: 'front', armL: { a: 12 }, armR: { a: 116, l: 268, bend: -46 }, feet: {} },
	think: { view: 'front', armL: { a: 6 }, armR: { a: 152, l: 286, bend: -64 }, feet: {} },
	wave1: { view: 'front', armL: { a: 8 }, armR: { a: 158, l: 320, bend: -22 }, feet: {}, bob: -10, sprout: -12 },
	wave2: { view: 'front', armL: { a: 8 }, armR: { a: 184, l: 320, bend: 20 }, feet: {}, bob: -10, sprout: 14 },
	hang: {
		view: 'front',
		armL: { a: -22, l: 260 },
		armR: { a: 190, l: 440 },
		feet: { dx: -30, lift: -96 },
		bob: 14,
		root: { r: -6 },
	},
	fall: {
		view: 'front',
		armL: { a: 138, l: 300 },
		armR: { a: -138, l: 300 },
		feet: { dx: 62, lift: -70 },
		bob: -18,
		sprout: -20,
		root: { r: -11 },
	},
	ground: {
		view: 'front',
		armL: { a: 142, l: 270 },
		armR: { a: -142, l: 270 },
		feet: { dx: 74, lift: -38 },
		sprout: 24,
		root: { r: -94, ox: 1500, oy: 1760, tx: -46, ty: 262 },
		shadow: { cx: 1180, cy: 2250, rx: 600, ry: 92 },
	},
	walk1: { view: 'front', armL: { a: 40 }, armR: { a: -14 }, feet: { dx: -18, lift: -78 }, bob: -16, root: { r: -3 } },
	walk2: { view: 'front', armL: { a: -14 }, armR: { a: 40 }, feet: { dx: 18, lift: -78 }, bob: -16, root: { r: 3 } },
	side: { view: 'side', armL: { a: 10 }, armR: { a: -16 }, feet: {} },
	sideTalk: { view: 'side', armL: { a: 12 }, armR: { a: 98, l: 268, bend: -40 }, feet: {}, bob: -6 },
};

/* ── Pezzi ─────────────────────────────────────────────────────────────────── */

function leaf(cx, cy, angle, len, wid) {
	return `<g transform="translate(${r2(cx)} ${r2(cy)}) rotate(${r2(angle)})">
		<path d="M0 0 C ${len * 0.34} ${-wid} ${len * 0.86} ${-wid * 0.82} ${len} 0 C ${len * 0.86} ${wid * 0.82} ${len * 0.34} ${wid} 0 0 Z"
			fill="url(#leafFill)" stroke="${INK}" stroke-width="${LW * 0.7}" stroke-linejoin="round"/>
		<path d="M${len * 0.12} ${-wid * 0.06} C ${len * 0.44} ${-wid * 0.16} ${len * 0.62} ${-wid * 0.1} ${len * 0.84} ${wid * 0.02}"
			fill="none" stroke="${LEAF_DARK}" stroke-width="${LW * 0.48}" stroke-linecap="round"/>
	</g>`;
}

/** Il germoglio: gambo ricurvo, tre foglie e due lucciole. */
function sprout({ tilt = 0 } = {}) {
	const bx = HEAD.cx;
	const by = HEAD.cy - HEAD.ry + 18;
	return `<g transform="translate(${bx} ${by}) rotate(${tilt})">
		<path d="M2 46 C -16 -40 -6 -140 30 -232" fill="none" stroke="${INK}" stroke-width="${LW * 1.1}" stroke-linecap="round"/>
		<path d="M2 46 C -16 -40 -6 -140 30 -232" fill="none" stroke="${MOSS_DARK}" stroke-width="${LW * 0.36}" stroke-linecap="round"/>
		${leaf(-4, -112, 198, 196, 72)}
		${leaf(28, -226, 292, 172, 64)}
		${leaf(2, -206, 158, 116, 44)}
		<circle cx="104" cy="-150" r="15" fill="${AMBER}" stroke="${INK}" stroke-width="${LW * 0.45}"/>
		<circle cx="-104" cy="-58" r="10" fill="${AMBER}" stroke="${INK}" stroke-width="${LW * 0.4}"/>
	</g>`;
}

function coreGlow() {
	const { cx, cy, rx, ry } = HEAD;
	return `<ellipse cx="${cx}" cy="${cy + 46}" rx="${rx * 0.7}" ry="${ry * 0.64}" fill="url(#core)"/>`;
}

/** Il berretto d'ottone da cui esce il germoglio. */
function cap() {
	const { cx } = HEAD;
	const y = HEAD.cy - HEAD.ry + 52;
	return `<g>
		<rect x="${cx - 82}" y="${y - 30}" width="164" height="58" rx="26" fill="url(#brassFill)" stroke="${INK}" stroke-width="${LW * 0.75}"/>
		<circle cx="${cx}" cy="${y - 2}" r="13" fill="${AMBER}" stroke="${INK}" stroke-width="${LW * 0.45}"/>
	</g>`;
}

/** La testa: cupola di lanterna, nucleo caldo, riflesso. Nessun tratto del viso. */
function head() {
	const { cx, cy, rx, ry } = HEAD;
	return `<g>
		<ellipse cx="${cx}" cy="${cy + 12}" rx="${rx}" ry="${ry}" fill="${MOSS_DARK}" opacity="0.20"/>
		<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#headFill)" stroke="${INK}" stroke-width="${LW * 1.2}"/>
		${coreGlow()}
		<path d="M${cx - rx * 0.74} ${cy + ry * 0.4} C ${cx - rx * 0.46} ${cy + ry * 0.78} ${cx + rx * 0.46} ${cy + ry * 0.78} ${cx + rx * 0.74} ${cy + ry * 0.4}"
			fill="none" stroke="${CREAM_SHADE}" stroke-width="${LW * 0.85}" stroke-linecap="round" opacity="0.8"/>
		<ellipse cx="${cx - rx * 0.44}" cy="${cy - ry * 0.46}" rx="${rx * 0.3}" ry="${ry * 0.2}" fill="#FFFFFF" opacity="0.72"
			transform="rotate(-28 ${cx - rx * 0.44} ${cy - ry * 0.46})"/>
		${cap()}
	</g>`;
}

/** Il naso della posa di bordo: l'unico tratto che la testa aggiunge di lato. */
function noseBump() {
	const { cx, cy } = HEAD;
	return `<path d="M${cx + HEAD.rx - 6} ${cy + 44} q 46 24 6 62" fill="none" stroke="${INK}"
		stroke-width="${LW * 1.1}" stroke-linecap="round"/>`;
}

/** Il mantello: collo a V, cintura, orlo a smerli. */
function cloak() {
	const { cx } = HEAD;
	const top = 1470;
	const hem = 2216;
	return `<g>
		<path d="M${cx} ${top + 24}
			C ${cx - 186} ${top + 26} ${cx - 292} ${top + 150} ${cx - 330} ${top + 380}
			C ${cx - 356} ${top + 560} ${cx - 368} ${hem - 180} ${cx - 362} ${hem - 54}
			${hemSmerli(cx - 362, hem - 54, cx + 362, hem - 54)}
			C ${cx + 368} ${hem - 180} ${cx + 356} ${top + 560} ${cx + 330} ${top + 380}
			C ${cx + 292} ${top + 150} ${cx + 186} ${top + 26} ${cx} ${top + 24} Z"
			fill="url(#cloakFill)" stroke="${INK}" stroke-width="${LW * 1.15}" stroke-linejoin="round"/>
		<path d="M${cx - 318} ${top + 250} C ${cx - 236} ${top + 440} ${cx - 200} ${hem - 320} ${cx - 214} ${hem - 130}
			C ${cx - 280} ${hem - 240} ${cx - 332} ${hem - 430} ${cx - 318} ${top + 250} Z"
			fill="${MOSS_DARK}" opacity="0.32"/>
		<path d="M${cx - 244} ${top + 52} C ${cx - 120} ${top + 168} ${cx + 120} ${top + 168} ${cx + 244} ${top + 52}"
			fill="none" stroke="${MOSS_DARK}" stroke-width="${LW * 0.62}" stroke-linecap="round" opacity="0.5"/>
		<path d="M${cx - 316} ${top + 452} C ${cx - 156} ${top + 496} ${cx + 156} ${top + 496} ${cx + 316} ${top + 452}"
			fill="none" stroke="${INK}" stroke-width="${LW * 0.85}" opacity="0.45"/>
		<rect x="${cx - 62}" y="${top + 430}" width="124" height="56" rx="20" fill="url(#brassFill)" stroke="${INK}" stroke-width="${LW * 0.65}"/>
		<circle cx="${cx}" cy="${top + 52}" r="30" fill="${AMBER}" stroke="${INK}" stroke-width="${LW * 0.7}"/>
		<path d="M${cx} ${top + 82} C ${cx - 6} ${top + 150} ${cx - 4} ${top + 186} ${cx} ${top + 210}" fill="none"
			stroke="${BRASS}" stroke-width="${LW * 0.75}" stroke-linecap="round"/>
		<circle cx="${cx}" cy="${top + 224}" r="18" fill="${BRASS}" stroke="${INK}" stroke-width="${LW * 0.65}"/>
	</g>`;
}

/** L'orlo: tre smerli diversi, cosi' la gonna non sembra un uovo. */
function hemSmerli(x0, y0, x1) {
	const span = (x1 - x0) / 3;
	const depth = 80;
	return `C ${x0 + span * 0.5} ${y0 + depth} ${x0 + span * 0.8} ${y0 + depth} ${x0 + span} ${y0 + 4}
		C ${x0 + span * 1.5} ${y0 + depth * 0.92} ${x0 + span * 1.8} ${y0 + depth * 0.92} ${x0 + span * 2} ${y0 + 4}
		C ${x0 + span * 2.5} ${y0 + depth * 0.86} ${x0 + span * 2.8} ${y0 + depth * 0.86} ${x1} ${y0 + 4}`;
}

const SHOULDER = { x: 268, y: 1584, w: 132 };

/** Dove finisce una manica: spalla + angolo + lunghezza, piu' il polso (`bend`). */
export function mittCenter(side, { a = 0, l = 300, bend = 0 } = {}) {
	const sx = side === 'L' ? HEAD.cx - SHOULDER.x : HEAD.cx + SHOULDER.x;
	const sy = SHOULDER.y;
	const sign = side === 'L' ? 1 : -1;
	const ex = Math.sin(rad(a)) * l * sign;
	const ey = Math.cos(rad(a)) * l;
	const wx = sx + ex;
	const wy = sy + ey;
	return {
		x: wx + Math.sin(rad(a + bend)) * 70 * sign,
		y: wy + Math.cos(rad(a + bend)) * 70,
		cuff: { x: wx, y: wy },
	};
}

/** Manica: spallina sul mantello, polsino, guanto con il pollice. */
function arm(side, opts = {}) {
	const { a = 0, l = 300 } = opts;
	const sign = side === 'L' ? 1 : -1;
	const sx = side === 'L' ? HEAD.cx - SHOULDER.x : HEAD.cx + SHOULDER.x;
	const sy = SHOULDER.y;
	const ex = Math.sin(rad(a)) * l * sign;
	const ey = Math.cos(rad(a)) * l;
	const { x: mx, y: my } = mittCenter(side, opts);
	const w = SHOULDER.w;
	return `<g>
		<path d="M${r2(sx)} ${sy} L${r2(sx + ex)} ${r2(sy + ey)}" stroke="${INK}" stroke-width="${w + LW * 1.8}" stroke-linecap="round"/>
		<path d="M${r2(sx)} ${sy} L${r2(sx + ex)} ${r2(sy + ey)}" stroke="${MOSS}" stroke-width="${w}" stroke-linecap="round"/>
		<path d="M${r2(sx - sign * 24)} ${sy + 30} L${r2(sx + ex - sign * 18)} ${r2(sy + ey + 20)}" stroke="${MOSS_LIGHT}" stroke-width="${w * 0.32}" stroke-linecap="round" opacity="0.5"/>
		<ellipse cx="${r2(sx)}" cy="${sy}" rx="${w * 0.62}" ry="${w * 0.58}" fill="${MOSS}" stroke="${INK}" stroke-width="${LW * 0.85}"/>
		<circle cx="${r2(mx)}" cy="${r2(my)}" r="${w * 0.6}" fill="${CREAM}" stroke="${INK}" stroke-width="${LW * 0.95}"/>
		<ellipse cx="${r2(mx - sign * 16)}" cy="${r2(my - w * 0.22)}" rx="${w * 0.22}" ry="${w * 0.15}" fill="#FFFFFF" opacity="0.75"/>
		<path d="M${r2(mx - sign * w * 0.34)} ${r2(my + w * 0.1)} q ${sign * w * 0.28} ${w * 0.28} ${sign * w * 0.6} ${-w * 0.02}"
			fill="none" stroke="${INK_SOFT}" stroke-width="${LW * 0.4}" stroke-linecap="round" opacity="0.45"/>
	</g>`;
}

/** Uno stivaletto: gambale, suola scura, punta tonda. */
function boot(cx, cy, flip = 1) {
	return `<g transform="translate(${r2(cx)} ${r2(cy)}) scale(${flip} 1)">
		<path d="M-92 -130 C -92 -182 92 -182 92 -130 L 92 0 C 92 40 -92 40 -92 0 Z"
			fill="${MOSS_DARK}" stroke="${INK}" stroke-width="${LW * 0.95}" stroke-linejoin="round"/>
		<path d="M-100 0 C -100 48 100 48 100 0 C 100 -22 -100 -22 -100 0 Z" fill="${INK}" opacity="0.88"/>
		<path d="M-54 -146 q 54 -24 108 0" fill="none" stroke="${MOSS_LIGHT}" stroke-width="${LW * 0.55}" stroke-linecap="round" opacity="0.75"/>
	</g>`;
}

function groundShadow({ cx = HEAD.cx, cy = 2400, rx = 386, ry = 58 } = {}) {
	return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${MOSS_DARK}" opacity="0.13"/>`;
}

/* ── Faccia ─────────────────────────────────────────────────────────────────
 * Solo inchiostro del viso: niente riempimento della testa, niente germoglio.
 * Tutto resta dentro il riquadro d'inchiostro del corpo.
 */
export function drawFace({ expression = 'normal', view = 'front' } = {}) {
	const { cx, cy } = HEAD;
	const side = view === 'side';
	const mood = expression.replace(/_talk$/, '');
	const open = expression.endsWith('_talk');

	const eyePos = side
		? [
				{ x: cx + 128, y: cy + 10, rx: 62, ry: 84, main: true },
				{ x: cx + 286, y: cy + 16, rx: 30, ry: 46, main: false },
			]
		: [
				{ x: cx - 150, y: cy + 4, rx: 68, ry: 88, main: true },
				{ x: cx + 150, y: cy + 4, rx: 68, ry: 88, main: true },
			];

	const eye = ({ x, y, rx, ry, main }, index) => {
		if (mood === 'happy') {
			const w = rx * 1.04;
			return `<path d="M${r2(x - w)} ${r2(y + ry * 0.28)} q ${r2(w)} ${r2(-ry * 0.94)} ${r2(w * 2)} 0"
				fill="none" stroke="${INK}" stroke-width="${LW * 1.1}" stroke-linecap="round"/>`;
		}
		if (mood === 'thinking') {
			const up = index === 0 ? -12 : 8;
			return `<g>
				<ellipse cx="${r2(x + 8)}" cy="${r2(y + up)}" rx="${r2(rx * 0.9)}" ry="${r2(ry * 0.86)}" fill="${INK}"/>
				<circle cx="${r2(x + 8 - rx * 0.32)}" cy="${r2(y + up - ry * 0.34)}" r="${r2(rx * 0.26)}" fill="#FFFFFF" opacity="0.92"/>
			</g>`;
		}
		if (mood === 'dizzy') {
			return `<path d="M${r2(x - rx * 0.64)} ${r2(y)} a ${r2(rx * 0.44)} ${r2(rx * 0.44)} 0 1 1 ${r2(rx * 0.3)} ${r2(-rx * 0.32)}
				a ${r2(rx * 0.28)} ${r2(rx * 0.28)} 0 1 1 ${r2(-rx * 0.16)} ${r2(rx * 0.2)}"
				fill="none" stroke="${INK}" stroke-width="${LW * 0.75}" stroke-linecap="round"/>`;
		}

		const droop = mood === 'sad' ? 12 : mood === 'angry' ? 4 : 0;
		const narrow = mood === 'angry' ? 0.8 : mood === 'sad' ? 0.86 : 1;
		const top = y - ry * narrow;
		const bottom = y + ry * narrow;
		// Palpebra, iride ambra, due riflessi: a 120 px restano tre macchie leggibili.
		return `<g>
			<ellipse cx="${r2(x)}" cy="${r2(y + droop * 0.2)}" rx="${r2(rx)}" ry="${r2(ry * narrow)}" fill="${INK}"/>
			<ellipse cx="${r2(x)}" cy="${r2(bottom - ry * 0.32)}" rx="${r2(rx * 0.6)}" ry="${r2(ry * 0.22)}" fill="${AMBER_DEEP}" opacity="0.5"/>
			<circle cx="${r2(x - rx * 0.32)}" cy="${r2(y - ry * 0.34)}" r="${r2(rx * 0.28)}" fill="#FFFFFF" opacity="0.95"/>
			<circle cx="${r2(x + rx * 0.34)}" cy="${r2(y + ry * 0.3)}" r="${r2(rx * 0.13)}" fill="#FFFFFF" opacity="0.55"/>
			<path d="M${r2(x - rx * 1.02)} ${r2(top + 8)} q ${r2(rx)} ${r2(-14 + droop * 0.3)} ${r2(rx * 2.04)} 0"
				fill="none" stroke="${INK}" stroke-width="${LW * 0.7}" stroke-linecap="round"/>
		</g>`;
	};

	const brows = () => {
		const b = ({ x, y, rx }, tilt, lift) =>
			`<path d="M${r2(x - rx * 0.84)} ${r2(y - 116 + lift)} q ${r2(rx * 0.84)} ${r2(-24)} ${r2(rx * 1.68)} 0"
				fill="none" stroke="${INK}" stroke-width="${LW * 0.8}" stroke-linecap="round"
				transform="rotate(${tilt} ${r2(x)} ${r2(y - 116 + lift)})"/>`;
		if (mood === 'happy' || mood === 'dizzy') return '';
		if (mood === 'angry') return b(eyePos[0], 15, -4) + b(eyePos[1], -15, -4);
		if (mood === 'sad') return b(eyePos[0], -14, 0) + b(eyePos[1], 14, 0);
		if (mood === 'thinking') return b(eyePos[0], -4, -14) + b(eyePos[1], 10, 6);
		return b(eyePos[0], 0, 0) + b(eyePos[1], 0, 0);
	};

	const mouth = () => {
		const mx = side ? cx + 196 : cx;
		const my = cy + 212;
		if (open) {
			const ry = mood === 'happy' ? 68 : 52;
			return `<g>
				<path d="M${r2(mx - 42)} ${my - 8} q 42 ${r2(ry * 0.92)} 84 0 q -42 ${r2(ry * 0.5)} -84 0 Z"
					fill="${INK}" stroke="${INK}" stroke-width="${LW * 0.65}" stroke-linejoin="round"/>
				<path d="M${r2(mx - 16)} ${r2(my + ry * 0.4)} q 16 12 32 0" fill="${BLUSH}" opacity="0.9"/>
			</g>`;
		}
		switch (mood) {
			case 'happy':
				return `<path d="M${r2(mx - 54)} ${my - 12} q 54 56 108 0" fill="none" stroke="${INK}"
					stroke-width="${LW * 0.95}" stroke-linecap="round"/>`;
			case 'sad':
				return `<path d="M${r2(mx - 36)} ${my + 14} q 36 -28 72 0" fill="none" stroke="${INK}"
					stroke-width="${LW * 0.9}" stroke-linecap="round"/>`;
			case 'angry':
				return `<path d="M${r2(mx - 40)} ${my - 2} q 20 -20 40 6 q 20 -24 40 -4" fill="none" stroke="${INK}"
					stroke-width="${LW * 0.9}" stroke-linecap="round" stroke-linejoin="round"/>`;
			case 'thinking':
				return `<path d="M${r2(mx - 24)} ${my + 2} q 24 10 48 -4" fill="none" stroke="${INK}"
					stroke-width="${LW * 0.9}" stroke-linecap="round"/>`;
			case 'dizzy':
				return `<path d="M${r2(mx - 30)} ${my} q 15 18 30 0 q 15 -18 30 0" fill="none" stroke="${INK}"
					stroke-width="${LW * 0.9}" stroke-linecap="round"/>`;
			default:
				return `<path d="M${r2(mx - 30)} ${my - 8} q 30 36 60 0" fill="none" stroke="${INK}"
					stroke-width="${LW * 0.95}" stroke-linecap="round"/>`;
		}
	};

	const nose = () =>
		side
			? ''
			: `<path d="M${cx} ${cy + 118} q 10 16 -6 24" fill="none" stroke="${INK_SOFT}" stroke-width="${LW * 0.55}" stroke-linecap="round" opacity="0.7"/>`;

	const blush = () => {
		const spots = side
			? [{ x: cx + 320, y: cy + 152 }]
			: [
					{ x: cx - 284, y: cy + 140 },
					{ x: cx + 284, y: cy + 140 },
				];
		const fade = mood === 'sad' || mood === 'angry' ? 0.16 : 0.48;
		return spots
			.map(
				(s) => `<g opacity="${fade}">
					<ellipse cx="${s.x}" cy="${s.y}" rx="64" ry="34" fill="${BLUSH}"/>
					<path d="M${s.x - 28} ${s.y - 8} l 0 14 M${s.x + 2} ${s.y - 12} l 0 18 M${s.x + 32} ${s.y - 8} l 0 14"
						stroke="${BLUSH}" stroke-width="${LW * 0.42}" stroke-linecap="round" opacity="0.8"/>
				</g>`
			)
			.join('');
	};

	const extras = () => {
		if (mood === 'thinking') {
			// I puntini restano dentro il riquadro d'inchiostro del corpo: fuori
			// sfonderebbero la sagoma e la posa cotta non tornerebbe piu'.
			return `<g>
				<circle cx="${cx + 190}" cy="${cy - 230}" r="15" fill="${CREAM}" stroke="${INK}" stroke-width="${LW * 0.55}"/>
				<circle cx="${cx + 246}" cy="${cy - 276}" r="20" fill="${CREAM}" stroke="${INK}" stroke-width="${LW * 0.55}"/>
				<circle cx="${cx + 308}" cy="${cy - 322}" r="26" fill="${CREAM}" stroke="${INK}" stroke-width="${LW * 0.55}"/>
			</g>`;
		}
		if (mood === 'happy') {
			const star = (x, y, s) => `<path d="M${x} ${y - s} Q ${x + s * 0.22} ${y - s * 0.22} ${x + s} ${y}
				Q ${x + s * 0.22} ${y + s * 0.22} ${x} ${y + s} Q ${x - s * 0.22} ${y + s * 0.22} ${x - s} ${y}
				Q ${x - s * 0.22} ${y - s * 0.22} ${x} ${y - s} Z" fill="${AMBER}" stroke="${AMBER_DEEP}" stroke-width="${LW * 0.3}"/>`;
			return star(cx - 290, cy - 180, 44) + star(cx - 212, cy - 78, 28) + star(cx + 292, cy - 146, 24);
		}
		if (mood === 'angry') {
			return `<g stroke="${AMBER_DEEP}" stroke-width="${LW * 0.8}" stroke-linecap="round" fill="none" opacity="0.95">
				<path d="M${cx + 210} ${cy - 300} q 24 24 0 48 q -24 24 0 48"/>
				<path d="M${cx + 262} ${cy - 300} q 24 24 0 48 q -24 24 0 48"/>
			</g>`;
		}
		if (mood === 'sad') {
			return `<path d="M${cx + 222} ${cy + 140} q 24 56 6 84 q -18 28 -34 -6 q -12 -24 28 -78 Z"
				fill="#9AD3F0" stroke="${INK}" stroke-width="${LW * 0.5}" opacity="0.85"/>`;
		}
		return '';
	};

	return `<g>
		${blush()}
		${eye(eyePos[0], 0)}
		${eye(eyePos[1], 1)}
		${brows()}
		${nose()}
		${mouth()}
		${extras()}
	</g>`;
}

/* ── Personaggio ──────────────────────────────────────────────────────────── */

/** Il lato di bordo sporge di 46 px verso destra: corpo e faccia lo sanno. */
const SIDE_SHIFT = 46;

function parts(p, { withFace = false } = {}) {
	const view = p.view || 'front';
	const side = view === 'side';
	const feet = p.feet || {};
	const dx = side ? (feet.dx || 0) * 0.4 : feet.dx || 0;
	const bob = p.bob || 0;
	// I piedi prima del mantello (l'orlo li copre a meta'), le braccia dopo: una
	// manica disegnata sotto sparisce dentro la gonna e la mano resta appesa al
	// nulla.
	return `<g transform="translate(${side ? SIDE_SHIFT : 0} ${bob})">
		${boot(HEAD.cx - 196 + dx, GROUND + (feet.lift || 0), 1)}
		${boot(HEAD.cx + 196 - dx, GROUND - (feet.lift || 0) * 0.45, -1)}
		${cloak()}
		${side ? '' : arm('L', p.armL)}
		${arm('R', p.armR)}
		${head()}
		${side ? noseBump() : ''}
		${sprout({ tilt: p.sprout || 0 })}
	</g>`;
}

/** L'ingrandimento del personaggio: lo prendono corpo e faccia, non la rotazione. */
const SCALE_CHAIN = `translate(${HEAD.cx} ${SCALE_ANCHOR}) scale(${SCALE}) translate(${-HEAD.cx} ${-SCALE_ANCHOR})`;

function rootChain(p) {
	const root = p.root || {};
	const ox = root.ox ?? HEAD.cx;
	const oy = root.oy ?? GROUND;
	return `translate(${root.tx || 0} ${root.ty || 0}) rotate(${root.r || 0} ${ox} ${oy})`;
}

function layered(p) {
	const view = p.view || 'front';
	// Il livello della faccia porta l'ingrandimento del corpo (a runtime si
	// appoggia su un corpo dritto) ma non la rotazione della posa: quella la
	// prende solo la posa cotta. Il lato aggiunge lo spostamento orizzontale,
	// che e' geometria della posa, non trasformazione.
	const layer = `<g transform="${SCALE_CHAIN}"><g transform="translate(${view === 'side' ? SIDE_SHIFT : 0} ${p.bob || 0})">${drawFace(
		{ expression: p.expression, view }
	)}</g></g>`;
	return { layer };
}

/**
 * Un punto del disegno portato **sul canvas**: bob, ingrandimento, rotazione e
 * traslazione della posa, nello stesso ordine in cui li applica `parts()`.
 * Il pivot del volo passa di qui, o resta indietro di qualche grado e la
 * mascotte pende storta.
 */
function toCanvas(x, y, p) {
	const root = p.root || {};
	const r = rad(root.r || 0);
	const ox = root.ox ?? HEAD.cx;
	const oy = root.oy ?? GROUND;
	const vx = p.view === 'side' ? SIDE_SHIFT : 0;
	const sx = HEAD.cx + (x + vx - HEAD.cx) * SCALE;
	const sy = SCALE_ANCHOR + (y + (p.bob || 0) - SCALE_ANCHOR) * SCALE;
	const dx = sx - ox;
	const dy = sy - oy;
	return {
		x: (root.tx || 0) + ox + dx * Math.cos(r) - dy * Math.sin(r),
		y: (root.ty || 0) + oy + dx * Math.sin(r) + dy * Math.cos(r),
	};
}

/** Il punto della mano alzata sul canvas: e' il pivot con cui il volo la appende. */
export function pivotPoint(pose = POSES.hang) {
	const p = { ...POSES.idle, ...pose };
	const m = mittCenter('R', p.armR || {});
	return toCanvas(m.x, m.y, p);
}

export function drawCharacter({ pose = POSES.idle, expression = 'normal' } = {}) {
	const p = { ...POSES.idle, ...pose, expression };
	const { layer } = layered(p);
	const rc = rootChain(p);

	const body = `${groundShadow(p.shadow)}
	<g transform="${rc}"><g transform="${SCALE_CHAIN}">
		${parts(p)}
	</g></g>`;

	// La posa cotta: la faccia entra nella rotazione della posa, il corpo no.
	const faceCooked = `<g transform="${rc}">${layer}</g>`;

	return {
		body: svgDoc(body),
		face: svgDoc(layer),
		cooked: svgDoc(body + faceCooked),
	};
}

/**
 * L'icona: la testa da sola, ingrandita a riempire il canvas, come il vecchio
 * `icon.png` (faccia + linee su sfondo trasparente). La build ritaglia al
 * riquadro dell'inchiostro, quindi il margine attorno non conta.
 */
export function drawIcon({ expression = 'happy' } = {}) {
	const { cx, cy } = HEAD;
	const scale = 1.34;
	const wrap = (inner) =>
		`<g transform="translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})">${inner}</g>`;
	return {
		cooked: svgDoc(wrap(head() + sprout({ tilt: -10 }) + drawFace({ expression, view: 'front' }))),
	};
}
