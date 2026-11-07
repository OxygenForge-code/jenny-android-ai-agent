/**
 * Il catalogo delle pose: cosa si esporta, cosa resta in riserva, cosa e' solo
 * un riferimento per il test. E' la sola tabella che build.mjs legge — aggiungere
 * una posa significa aggiungere una riga qui, e nient'altro.
 */

/** Pose "cotte": faccia disegnata dentro, una sola immagine. Usate da bordo, volo, onboarding. */
export const BAKED = [
	{ asset: 'side', source: 'jenny-side.PNG', pose: 'side', expression: 'normal' },
	{ asset: 'side-talk', source: 'jenny-side-talk.PNG', pose: 'sideTalk', expression: 'normal_talk' },
	{ asset: 'hang', source: 'jenny-hang.PNG', pose: 'hang', expression: 'normal' },
	{ asset: 'fall', source: 'jenny-fall.PNG', pose: 'fall', expression: 'normal' },
	{ asset: 'ground', source: 'jenny-ground.PNG', pose: 'ground', expression: 'dizzy' },
	{ asset: 'walk1', source: 'jenny-walk1.PNG', pose: 'walk1', expression: 'normal' },
	{ asset: 'walk2', source: 'jenny-walk2.PNG', pose: 'walk2', expression: 'normal' },
	{ asset: 'hello1', source: 'hello1.PNG', pose: 'wave1', expression: 'happy' },
	{ asset: 'hello2', source: 'hello2.PNG', pose: 'wave2', expression: 'happy' },
	{ asset: 'idle', source: 'idle.PNG', pose: 'idle', expression: 'normal' },
	// Riferimenti del test: nessun ramo del client li mostra, ma sono le pose
	// cotte da cui due coppie corpo+faccia devono ricomporsi al pixel.
	{ asset: 'talk_1a', source: 'talk_1a.PNG', pose: 'hand', expression: 'normal_talk', reference: true },
	{ asset: 'talk_1b', source: 'talk_1b.PNG', pose: 'idle', expression: 'normal_talk', reference: true },
	{ asset: 'think', source: 'think.PNG', pose: 'think', expression: 'thinking', reference: true },
];

/**
 * Livelli spediti: `jenny-<stem coi trattini>.webp`, 13 file.
 * Il nome dice cosa e', non con cosa si accoppia: `face_front_happy` e' la
 * faccia di riposo di quell'espressione, `_talk` e' l'altra bocca.
 */
export const LAYERS = [
	{ stem: 'body_front_idle', kind: 'body', pose: 'idle' },
	{ stem: 'body_front_hand', kind: 'body', pose: 'hand' },
	{ stem: 'body_front_think', kind: 'body', pose: 'think' },
	{ stem: 'face_front_normal', kind: 'face', expression: 'normal', view: 'front' },
	{ stem: 'face_front_normal_talk', kind: 'face', expression: 'normal_talk', view: 'front' },
	{ stem: 'face_front_thinking', kind: 'face', expression: 'thinking', view: 'front' },
	{ stem: 'face_front_happy', kind: 'face', expression: 'happy', view: 'front' },
	{ stem: 'face_front_sad', kind: 'face', expression: 'sad', view: 'front' },
	{ stem: 'face_front_angry', kind: 'face', expression: 'angry', view: 'front' },
	{ stem: 'body_side_idle', kind: 'body', pose: 'side' },
	{ stem: 'face_side_happy', kind: 'face', expression: 'happy', view: 'side' },
	{ stem: 'face_side_sad', kind: 'face', expression: 'sad', view: 'side' },
	{ stem: 'face_side_angry', kind: 'face', expression: 'angry', view: 'side' },
];

/**
 * In riserva: sorgenti importati e mai esportati (10). Le bocche alternative
 * degli umori servono al parlato espressivo, che non c'e' ancora; la faccia di
 * lato che pensa, il corpo di lato col gesto e i corpi del saluto chiudono il
 * conto. Un webp che nessun ramo del client puo' mostrare marcirebbe.
 */
export const RESERVE = [
	{ stem: 'face_front_happy_talk', kind: 'face', expression: 'happy_talk', view: 'front' },
	{ stem: 'face_front_sad_talk', kind: 'face', expression: 'sad_talk', view: 'front' },
	{ stem: 'face_front_angry_talk', kind: 'face', expression: 'angry_talk', view: 'front' },
	{ stem: 'face_side_happy_talk', kind: 'face', expression: 'happy_talk', view: 'side' },
	{ stem: 'face_side_sad_talk', kind: 'face', expression: 'sad_talk', view: 'side' },
	{ stem: 'face_side_angry_talk', kind: 'face', expression: 'angry_talk', view: 'side' },
	{ stem: 'face_side_thinking', kind: 'face', expression: 'thinking', view: 'side' },
	{ stem: 'body_side_hand', kind: 'body', pose: 'sideTalk' },
	{ stem: 'body_front_wave1', kind: 'body', pose: 'wave1' },
	{ stem: 'body_front_wave2', kind: 'body', pose: 'wave2' },
];

/** L'icona: la testa da sola, come il vecchio `icon.png` (faccia + linee). */
export const ICON = { pose: 'idle', expression: 'happy' };
