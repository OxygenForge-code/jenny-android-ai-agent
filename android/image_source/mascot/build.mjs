/**
 * Rigenera tutta l'arte della mascotte da `character.mjs`.
 *
 * Uso (dalla cartella android/image_source/mascot/):
 *   npm install          # una volta, tira sharp
 *   node build.mjs       # sorgenti PNG + webp + icone + manifest
 *   node build.mjs --preview   # e un foglio di contatto in .preview/
 *
 * Scrive:
 *   - i sorgenti 3000² in android/image_source/ (`body_*`, `face_*`, pose cotte, icon.png)
 *   - i webp 768² in jenny/templates/ui/assets/
 *   - le icone Android in android/app/src/main/res/
 *   - manifest.json, che il test legge al posto delle costanti a mano
 *
 * Il foglio di contatto serve solo a guardare: non e' un asset e non va nel repo.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import { CANVAS, drawCharacter, drawIcon, HEAD, pivotPoint, POSES } from './character.mjs';
import { BAKED, ICON, LAYERS, RESERVE } from './poses.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const IMAGE_SOURCE = path.resolve(HERE, '..');
const REPO = path.resolve(IMAGE_SOURCE, '..', '..');
const UI_ASSETS = path.join(REPO, 'jenny', 'templates', 'ui', 'assets');
const ANDROID_RES = path.join(REPO, 'android', 'app', 'src', 'main', 'res');
const PREVIEW = path.join(HERE, '.preview');

const EXPORT_SIZE = 768;
const EXPORT_QUALITY = 82;
const FACE_PAD = 40;

const BLACK = { r: 0, g: 0, b: 0, alpha: 1 };
const FOREGROUND = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };

/** Rasterizza un SVG alla dimensione del canvas (3000²), PNG RGBA. */
async function render(svg) {
	return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}

async function renderResized(svg, size) {
	return sharp(Buffer.from(svg)).resize(size, size, { fit: 'fill', kernel: 'lanczos3' }).png().toBuffer();
}

/** Riquadro dell'inchiostro (alfa > soglia) di un PNG, in pixel del canvas. */
async function inkBox(png, width = CANVAS) {
	const { data, info } = await sharp(png).resize(width, width, { fit: 'fill' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
	const scale = CANVAS / info.width;
	let x0 = Infinity;
	let y0 = Infinity;
	let x1 = -Infinity;
	let y1 = -Infinity;
	for (let y = 0; y < info.height; y += 1) {
		for (let x = 0; x < info.width; x += 1) {
			if (data[(y * info.width + x) * 4 + 3] > 8) {
				if (x < x0) x0 = x;
				if (y < y0) y0 = y;
				if (x > x1) x1 = x;
				if (y > y1) y1 = y;
			}
		}
	}
	if (!Number.isFinite(x0)) return null;
	return [Math.floor(x0 * scale), Math.floor(y0 * scale), Math.ceil((x1 + 1) * scale), Math.ceil((y1 + 1) * scale)];
}

/** Scarto massimo su tutti i canali fra due PNG della stessa dimensione. */
async function maxDelta(a, b) {
	const [ra, rb] = await Promise.all([
		sharp(a).ensureAlpha().raw().toBuffer(),
		sharp(b).ensureAlpha().raw().toBuffer(),
	]);
	let max = 0;
	for (let i = 0; i < ra.length; i += 1) {
		const d = Math.abs(ra[i] - rb[i]);
		if (d > max) max = d;
	}
	return max;
}

async function saveSource(name, png) {
	await writeFile(path.join(IMAGE_SOURCE, name), png);
	return png;
}

async function exportWebp(name, png) {
	await sharp(png).resize(EXPORT_SIZE, EXPORT_SIZE, { kernel: 'lanczos3' }).webp({ quality: EXPORT_QUALITY, effort: 6 }).toFile(path.join(UI_ASSETS, name));
}

async function buildIcons(iconPng) {
	const trimmed = await sharp(iconPng).trim({ threshold: 1 }).png().toBuffer({ resolveWithObject: true });
	const mascot = trimmed.data;
	const { width, height } = trimmed.info;

	const fit = async (size, fraction, background) => {
		const target = Math.max(1, Math.round(size * fraction));
		const scale = target / Math.max(width, height);
		const scaled = await sharp(mascot)
			.resize(Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)), { kernel: 'lanczos3' })
			.toBuffer();
		return sharp({ create: { width: size, height: size, channels: 4, background: background || { r: 0, g: 0, b: 0, alpha: 0 } } })
			.composite([{ input: scaled, gravity: 'centre' }])
			.png()
			.toBuffer();
	};

	for (const [dpi, size] of Object.entries(FOREGROUND)) {
		const png = await fit(size, 0.54, null);
		const dir = path.join(ANDROID_RES, `mipmap-${dpi}`);
		await mkdir(dir, { recursive: true });
		await writeFile(path.join(dir, 'ic_launcher_foreground.png'), png);
	}

	const large = await fit(256, 0.8, BLACK);
	await mkdir(path.join(ANDROID_RES, 'drawable-nodpi'), { recursive: true });
	await writeFile(path.join(ANDROID_RES, 'drawable-nodpi', 'ic_notification_large.png'), large);
}

async function buildPreview(items) {
	await mkdir(PREVIEW, { recursive: true });
	const cell = 300;
	const cols = 5;
	const rows = Math.ceil(items.length / cols);
	const composites = [];
	for (const [i, item] of items.entries()) {
		const tile = await sharp(item.png).resize(cell, cell, { fit: 'contain', background: { r: 24, g: 24, b: 32, alpha: 1 } }).png().toBuffer();
		composites.push({ input: tile, left: (i % cols) * cell, top: Math.floor(i / cols) * cell });
	}
	await sharp({ create: { width: cols * cell, height: rows * cell, channels: 4, background: { r: 24, g: 24, b: 32, alpha: 1 } } })
		.composite(composites)
		.png()
		.toFile(path.join(PREVIEW, 'sheet.png'));
	for (const item of items) {
		await sharp(item.png).resize(560, 560, { fit: 'contain', background: { r: 24, g: 24, b: 32, alpha: 1 } }).png().toFile(path.join(PREVIEW, `${item.name}.png`));
	}
	console.log(`preview: ${path.join(PREVIEW, 'sheet.png')}`);
}

async function main() {
	const preview = process.argv.includes('--preview');
	const previewItems = [];
	const problems = [];

	// 1. Pose cotte + riferimenti del test.
	for (const spec of BAKED) {
		const drawn = drawCharacter({ pose: POSES[spec.pose], expression: spec.expression });
		const png = await saveSource(spec.source, await render(drawn.cooked));
		if (!spec.reference) await exportWebp(`jenny-${spec.asset}.webp`, png);
		previewItems.push({ name: spec.asset, png });
	}

	// 2. Livelli: tutti i sorgenti, solo quelli in LAYERS diventano webp.
	for (const spec of [...LAYERS, ...RESERVE]) {
		const drawn = drawCharacter({ pose: spec.pose ? POSES[spec.pose] : POSES.idle, expression: spec.expression || 'normal' });
		const svg = spec.kind === 'face' ? drawn.face : drawn.body;
		await saveSource(`${spec.stem}.PNG`, await render(svg));
	}
	for (const spec of LAYERS) {
		const drawn = drawCharacter({ pose: spec.pose ? POSES[spec.pose] : POSES.idle, expression: spec.expression || 'normal' });
		await exportWebp(`jenny-${spec.stem.replaceAll('_', '-')}.webp`, await render(spec.kind === 'face' ? drawn.face : drawn.body));
	}

	// 3. Icona: testa + faccia, canvas pieno.
	const icon = drawIcon({ expression: ICON.expression });
	const iconPng = await saveSource('icon.png', await render(icon.cooked));
	await buildIcons(iconPng);

	// 4. Manifest: quello che il test misura invece di ricopiarlo a mano.
	const windows = {};
	for (const prefix of ['face_front_', 'face_side_']) {
		let box = null;
		for (const spec of [...LAYERS, ...RESERVE].filter((s) => s.kind === 'face' && s.stem.startsWith(prefix))) {
			const b = await inkBox(
				await render(drawCharacter({ expression: spec.expression, view: spec.view, pose: POSES[spec.pose] || POSES.idle }).face),
				750
			);
			if (!b) continue;
			box = box ? [Math.min(box[0], b[0]), Math.min(box[1], b[1]), Math.max(box[2], b[2]), Math.max(box[3], b[3])] : b;
		}
		if (box) windows[prefix] = [box[0] - FACE_PAD, box[1] - FACE_PAD, box[2] + FACE_PAD, box[3] + FACE_PAD];
	}

	const hand = pivotPoint(POSES.hang);
	const pivot = { x: Number((hand.x / CANVAS).toFixed(4)), y: Number((hand.y / CANVAS).toFixed(4)) };

	// Posa cotta da cui viene ogni corpo: il test pretende lo stesso riquadro.
	const sameSilhouette = [
		{ body: 'body_front_idle', pose: 'idle' },
		{ body: 'body_front_hand', pose: 'talk_1a' },
		{ body: 'body_front_think', pose: 'think' },
	];

	const recomposes = [
		{ body: 'body_front_idle', face: 'face_front_normal_talk', pose: 'talk_1b' },
		{ body: 'body_front_think', face: 'face_front_thinking', pose: 'think' },
	];

	// 5. Il controllo che il test fa in CI, rifatto qui per non aspettare il CI.
	for (const pair of sameSilhouette) {
		const a = await inkBox(await render(drawCharacter({ pose: POSES[pair.body.replace('body_front_', '')], expression: 'normal' }).body));
		const b = await inkBox(await render(drawCharacter({ pose: POSES[pair.pose] || POSES.idle, expression: 'normal' }).cooked));
		const target = await inkBox(await sharp(path.join(IMAGE_SOURCE, `${pair.pose}.PNG`)).png().toBuffer());
		if (JSON.stringify(a) !== JSON.stringify(target)) problems.push(`${pair.body}: ink box ${a} != ${pair.pose} ${target}`);
		if (!b) problems.push(`${pair.pose}: cooked pose without ink`);
	}
	for (const pair of recomposes) {
		const composed = await render(drawCharacter({ pose: POSES[pair.body.replace('body_front_', '')], expression: 'normal' }).body);
		const face = await render(drawCharacter({ expression: pair.face.replace('face_front_', ''), pose: POSES.idle }).face);
		const merged = await sharp(composed).composite([{ input: face }]).png().toBuffer();
		const cooked = await sharp(path.join(IMAGE_SOURCE, `${pair.pose}.PNG`)).png().toBuffer();
		const delta = await maxDelta(merged, cooked);
		if (delta > 8) problems.push(`${pair.body} + ${pair.face} != ${pair.pose} (max delta ${delta})`);
	}

	// Ogni faccia deve stare dentro il riquadro d'inchiostro del corpo con cui
	// si accoppia: se ne esce, la posa cotta e la sua ricomposizione non hanno
	// piu' la stessa sagoma e il test di registrazione cade.
	const PAIRED_BODY = { face_front_: 'body_front_idle', face_side_: 'body_side_idle' };
	for (const spec of [...LAYERS, ...RESERVE].filter((s) => s.kind === 'face')) {
		const prefix = Object.keys(PAIRED_BODY).find((k) => spec.stem.startsWith(k));
		if (!prefix) continue;
		const bodyPose = PAIRED_BODY[prefix].replace('body_front_', '').replace('body_side_', '');
		const bodySvg = drawCharacter({ pose: POSES[bodyPose], expression: 'normal' }).body;
		const faceSvg = drawCharacter({ pose: POSES.idle, expression: spec.expression, view: spec.view }).face;
		const bodyPng = await render(bodySvg);
		const merged = await sharp(bodyPng).composite([{ input: await render(faceSvg) }]).png().toBuffer();
		const bodyBox = await inkBox(bodyPng);
		const mergedBox = await inkBox(merged);
		if (JSON.stringify(bodyBox) !== JSON.stringify(mergedBox)) {
			problems.push(`${spec.stem}: inchiostro fuori dal corpo (${mergedBox} vs ${bodyBox})`);
		}
	}

	const manifest = {
		canvas: CANVAS,
		export: { size: EXPORT_SIZE, quality: EXPORT_QUALITY },
		head: HEAD,
		layers: LAYERS.map((l) => l.stem),
		reserve: RESERVE.map((l) => l.stem),
		baked: BAKED.map((b) => b.source.replace(/\.PNG$/, '')),
		reference: BAKED.filter((b) => b.reference).map((b) => b.source.replace(/\.PNG$/, '')),
		faceWindows: windows,
		pivot,
	};
	await writeFile(path.join(HERE, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

	if (preview) await buildPreview(previewItems);

	console.log(`sources: ${BAKED.length} pose cotte (+${BAKED.filter((b) => b.reference).length} riferimenti), ${LAYERS.length + RESERVE.length} livelli`);
	console.log(`webp: ${BAKED.filter((b) => !b.reference).length} cotte + ${LAYERS.length} livelli`);
	console.log(`pivot: ${pivot.x} / ${pivot.y}`);
	console.log(`face windows: ${Object.entries(windows).map(([k, v]) => `${k}${v}`).join(' ')}`);
	if (problems.length) {
		console.error(`\n${problems.length} problema/i:`);
		for (const p of problems) console.error(` - ${p}`);
		process.exitCode = 1;
	} else {
		console.log('registration: ok');
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
