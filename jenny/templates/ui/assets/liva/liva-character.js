const characterInstances = new Set();

const REACTIONS = {
  face: ['Hı? Dokununca gülümsüyorum işte. ☺️', 'Yanaklarım biraz ısındı sanki…', 'Ben de seni gördüğüme sevindim.'],
  hair: ['Saçım bugün biraz dağınık, farkındayım. 😅', 'Saçımla mı oynuyorsun? Devam et, itiraz etmiyorum.', 'Orası biraz gıdıklıyor!'],
  hand: ['Sana da merhaba 👋', 'Tam buradayım. Elimi gördün mü?', 'Bugünün el sallama kotası: yalnızca senin için.'],
  sweater: ['Buradayım. Anlat bakalım.', 'Kazak yumuşak, sohbet de öyle olsun mu?', 'Bugün biraz sakin kalmaya ihtiyacım vardı. Sen nasılsın?'],
  hug: ['Bu minik bir sarılma sayılır, değil mi? 🤍', 'Biraz kalabiliriz böyle. Hiçbir yere gitmiyorum.', 'Buna ihtiyacım olduğunu nereden bildin?'],
};

function svgCharacter(id) {
  return `
  <svg class="liva-svg" viewBox="0 0 360 430" role="img" aria-labelledby="${id}-title ${id}-desc">
    <title id="${id}-title">Liva, etkileşimli yapay zekâ karakteri</title>
    <desc id="${id}-desc">Gözleri seni takip eder. Yüzüne, saçına veya eline dokunabilir, uzun basarak ona sarılabilirsin.</desc>
    <defs>
      <linearGradient id="${id}-hair" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#593b35"/><stop offset=".48" stop-color="#35252a"/><stop offset="1" stop-color="#201a22"/>
      </linearGradient>
      <linearGradient id="${id}-hairLight" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#9a6650"/><stop offset="1" stop-color="#50342f"/>
      </linearGradient>
      <radialGradient id="${id}-skin" cx="45%" cy="30%" r="72%">
        <stop offset="0" stop-color="#f4c6ad"/><stop offset=".68" stop-color="#df9e87"/><stop offset="1" stop-color="#c97f70"/>
      </radialGradient>
      <linearGradient id="${id}-knit" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fff9ed"/><stop offset="1" stop-color="#dfcfc3"/>
      </linearGradient>
      <radialGradient id="${id}-iris">
        <stop offset="0" stop-color="#a9aa77"/><stop offset=".65" stop-color="#69745c"/><stop offset="1" stop-color="#354439"/>
      </radialGradient>
      <filter id="${id}-soft" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="8"/>
      </filter>
      <filter id="${id}-shadow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#684b50" flood-opacity=".18"/>
      </filter>
      <pattern id="${id}-stitch" width="9" height="9" patternUnits="userSpaceOnUse">
        <path d="M1 1l3 4 3-4" fill="none" stroke="#b7a69d" stroke-width=".65" opacity=".35"/>
      </pattern>
    </defs>

    <ellipse cx="181" cy="408" rx="126" ry="17" fill="#7d5860" opacity=".12" filter="url(#${id}-soft)"/>
    <g class="character-body" filter="url(#${id}-shadow)">
      <path class="character-hair-back" data-part="hair" d="M83 372C58 324 61 250 72 190C77 94 117 35 183 33C258 31 292 91 289 184C300 249 309 323 277 382C246 407 107 405 83 372Z" fill="url(#${id}-hair)"/>
      <path d="M92 275C73 319 84 360 105 389M275 251C297 308 278 353 260 386" fill="none" stroke="#a06a53" stroke-opacity=".35" stroke-width="7" stroke-linecap="round"/>

      <path d="M151 254L151 318C157 343 205 344 212 315L207 247Z" fill="url(#${id}-skin)"/>
      <path d="M153 276C169 292 195 292 208 273L208 250L153 256Z" fill="#b86f67" opacity=".22"/>

      <path class="character-sweater" data-part="sweater" d="M53 430C51 377 65 338 112 319L151 303C161 324 201 327 213 303L254 319C298 338 313 378 309 430Z" fill="url(#${id}-knit)"/>
      <path d="M53 430C51 377 65 338 112 319L151 303C161 324 201 327 213 303L254 319C298 338 313 378 309 430Z" fill="url(#${id}-stitch)" opacity=".65"/>
      <path d="M143 307C152 336 207 339 220 307L229 312C221 350 147 351 134 313Z" fill="#d7c2b7"/>
      <path d="M143 307C152 336 207 339 220 307" fill="none" stroke="#fffaf0" stroke-width="5" stroke-linecap="round"/>
      <path d="M116 322C99 352 97 393 99 430M249 323C267 354 267 394 264 430" fill="none" stroke="#c7b3aa" stroke-width="3" opacity=".55"/>

      <g class="character-hand" data-part="hand">
        <path d="M263 374C274 348 279 319 279 289C280 280 290 280 292 289L294 313L299 271C300 261 311 262 312 272L311 310L319 279C322 269 332 273 330 283L323 315L332 298C337 290 345 297 340 306L325 340C319 355 314 371 310 390Z" fill="url(#${id}-skin)"/>
        <path d="M294 313L292 333M311 310L306 332M323 315L315 337" fill="none" stroke="#bb796e" stroke-width="1.5" stroke-linecap="round" opacity=".6"/>
        <path d="M260 367C273 361 304 370 315 388L309 430L260 430Z" fill="url(#${id}-knit)"/>
        <path d="M263 375C278 372 298 378 310 390" fill="none" stroke="#c7b3aa" stroke-width="4"/>
      </g>

      <g class="character-head">
        <ellipse cx="105" cy="184" rx="17" ry="25" fill="#d88f7d"/>
        <ellipse cx="255" cy="184" rx="17" ry="25" fill="#d88f7d"/>
        <path d="M101 181C108 173 113 184 105 193M259 181C252 173 247 184 255 193" fill="none" stroke="#b56e66" stroke-width="2" stroke-linecap="round"/>
        <path class="character-face" data-part="face" d="M105 138C105 75 139 53 181 53C228 53 256 83 255 140L250 206C245 257 215 287 181 291C145 287 115 258 110 207Z" fill="url(#${id}-skin)"/>

        <ellipse class="character-blush" cx="131" cy="210" rx="22" ry="11" fill="#d86f77" opacity=".17"/>
        <ellipse class="character-blush" cx="230" cy="210" rx="22" ry="11" fill="#d86f77" opacity=".17"/>
        <g fill="#a7655d" opacity=".55">
          <circle cx="128" cy="197" r="1.2"/><circle cx="135" cy="200" r="1"/><circle cx="142" cy="197" r="1.1"/>
          <circle cx="221" cy="198" r="1.1"/><circle cx="228" cy="200" r="1"/><circle cx="235" cy="197" r="1.2"/>
        </g>

        <path class="character-brow" d="M124 144C137 134 152 135 163 141" fill="none" stroke="#5a3833" stroke-width="6" stroke-linecap="round"/>
        <path class="character-brow" d="M199 141C211 134 226 134 238 143" fill="none" stroke="#5a3833" stroke-width="6" stroke-linecap="round"/>

        <g class="character-eye" data-eye="left">
          <path d="M122 166C132 153 153 153 165 166C154 179 133 180 122 166Z" fill="#fff9f3"/>
          <g class="character-iris"><circle cx="144" cy="166" r="10" fill="url(#${id}-iris)"/><circle cx="144" cy="166" r="4.5" fill="#1d2422"/><circle cx="141" cy="162" r="2.5" fill="white" opacity=".9"/></g>
          <path d="M122 166C132 153 153 153 165 166" fill="none" stroke="#49302f" stroke-width="3" stroke-linecap="round"/>
          <path class="character-eyelid" d="M121 164C134 151 153 152 166 165" fill="none" stroke="#ca8676" stroke-width="13" stroke-linecap="round" opacity="0"/>
        </g>
        <g class="character-eye" data-eye="right">
          <path d="M197 166C208 153 229 153 240 166C229 179 208 179 197 166Z" fill="#fff9f3"/>
          <g class="character-iris"><circle cx="218" cy="166" r="10" fill="url(#${id}-iris)"/><circle cx="218" cy="166" r="4.5" fill="#1d2422"/><circle cx="215" cy="162" r="2.5" fill="white" opacity=".9"/></g>
          <path d="M197 166C208 153 229 153 240 166" fill="none" stroke="#49302f" stroke-width="3" stroke-linecap="round"/>
          <path class="character-eyelid" d="M196 164C209 151 228 152 241 165" fill="none" stroke="#ca8676" stroke-width="13" stroke-linecap="round" opacity="0"/>
        </g>

        <path d="M179 169C177 185 171 198 175 204C180 208 187 207 191 203" fill="none" stroke="#b86f66" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M169 213C176 216 185 216 192 212" fill="none" stroke="#b9796c" stroke-width="1.5" opacity=".45"/>
        <g class="character-mouth">
          <path class="mouth-smile" d="M157 230C170 237 190 237 205 228C197 248 168 250 157 230Z" fill="#a95259"/>
          <path d="M160 231C173 235 190 234 202 230C192 237 171 239 160 231Z" fill="#f7d6cd"/>
          <ellipse class="mouth-talk" cx="181" cy="235" rx="14" ry="2" fill="#8f454e" opacity="0"/>
        </g>

        <path class="character-hair-front" data-part="hair" d="M101 160C91 102 114 48 174 42C231 36 265 75 259 140C247 113 229 98 207 88C189 111 151 129 111 127Z" fill="url(#${id}-hair)"/>
        <path d="M108 128C143 127 183 109 207 88C210 71 190 51 173 48" fill="none" stroke="url(#${id}-hairLight)" stroke-width="12" stroke-linecap="round" opacity=".72"/>
        <path class="hair-strand strand-left" d="M113 105C79 150 94 236 119 276C103 223 116 175 125 139" fill="url(#${id}-hair)"/>
        <path class="hair-strand strand-right" d="M237 103C273 151 258 235 239 280C259 241 276 172 248 123" fill="url(#${id}-hair)"/>
        <path d="M113 117C97 170 108 223 121 255M245 118C261 170 250 229 239 255" fill="none" stroke="#a26b52" stroke-width="3" stroke-linecap="round" opacity=".38"/>

        <g class="character-earrings" fill="none" stroke="#d5aa66" stroke-width="3">
          <ellipse cx="103" cy="205" rx="6" ry="9"/><ellipse cx="257" cy="205" rx="6" ry="9"/>
        </g>
      </g>
    </g>
    <g class="character-hearts" aria-hidden="true">
      <text x="83" y="195">♥</text><text x="271" y="180">♥</text><text x="98" y="135">♥</text><text x="258" y="122">♥</text>
    </g>
    <g class="character-hit-zones" fill="transparent">
      <ellipse data-part="face" cx="181" cy="211" rx="67" ry="65"/>
      <path data-part="hair" d="M85 55H277V137C250 115 235 100 207 88C174 122 143 129 106 127Z"/>
    </g>
  </svg>`;
}

export class LivaCharacter {
  constructor(host, { compact = false, onReaction = null } = {}) {
    this.host = host;
    this.compact = compact;
    this.onReaction = onReaction;
    this.id = `liva-character-${Math.random().toString(36).slice(2, 8)}`;
    this.talking = false;
    this.longPressed = false;
    this.pressTimer = null;
    this.reactionTimer = null;
    this.talkTimer = null;
    this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
    this.render();
    if (!this.compact) characterInstances.add(this);
  }

  render() {
    this.host.classList.add('liva-character');
    this.host.classList.toggle('is-compact', this.compact);
    this.host.innerHTML = `
      <div class="character-aura" aria-hidden="true"></div>
      <div class="character-speech" role="status" aria-live="polite"></div>
      ${svgCharacter(this.id)}
      ${this.compact ? '' : '<div class="character-touch-hint"><i class="ti ti-hand-finger" aria-hidden="true"></i><span>Bana dokunmayı dene</span></div>'}`;
    this.svg = this.host.querySelector('svg');
    this.speech = this.host.querySelector('.character-speech');
    if (!this.compact) this.bindInteractions();
  }

  bindInteractions() {
    this.host.addEventListener('pointermove', (event) => this.lookAt(event.clientX, event.clientY));
    this.host.addEventListener('pointerleave', () => this.centerEyes());
    this.host.addEventListener('pointerdown', (event) => {
      this.longPressed = false;
      this.pressTimer = window.setTimeout(() => {
        this.longPressed = true;
        this.react('hug');
        navigator.vibrate?.(25);
      }, 620);
      this.host.setPointerCapture?.(event.pointerId);
    });
    const endPress = () => window.clearTimeout(this.pressTimer);
    this.host.addEventListener('pointerup', endPress);
    this.host.addEventListener('pointercancel', endPress);
    this.host.addEventListener('click', (event) => {
      if (this.longPressed) return;
      const part = event.target.closest('[data-part]')?.dataset.part || 'sweater';
      this.react(part);
      navigator.vibrate?.(12);
    });
  }

  lookAt(clientX, clientY) {
    if (this.reducedMotion) return;
    const rect = this.svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = Math.max(-1, Math.min(1, ((clientX - rect.left) / rect.width - 0.5) * 2));
    const y = Math.max(-1, Math.min(1, ((clientY - rect.top) / rect.height - 0.43) * 2));
    this.host.style.setProperty('--look-x', `${(x * 3.2).toFixed(2)}px`);
    this.host.style.setProperty('--look-y', `${(y * 2.2).toFixed(2)}px`);
    this.host.style.setProperty('--head-tilt', `${(x * 1.4).toFixed(2)}deg`);
  }

  centerEyes() {
    this.host.style.setProperty('--look-x', '0px');
    this.host.style.setProperty('--look-y', '0px');
    this.host.style.setProperty('--head-tilt', '0deg');
  }

  say(text, duration = 3300) {
    if (this.compact || !this.speech) return;
    window.clearTimeout(this.reactionTimer);
    this.speech.textContent = text;
    this.host.classList.add('has-speech');
    this.reactionTimer = window.setTimeout(() => this.host.classList.remove('has-speech'), duration);
  }

  react(part = 'face') {
    const choices = REACTIONS[part] || REACTIONS.face;
    const line = choices[Math.floor(Math.random() * choices.length)];
    this.host.classList.remove('is-happy', 'is-surprised', 'is-hugging', 'is-waving');
    // Force a style flush so repeated touches replay the animation.
    void this.host.offsetWidth;
    const moodClass = part === 'hug' ? 'is-hugging' : part === 'hand' ? 'is-waving' : part === 'hair' ? 'is-surprised' : 'is-happy';
    this.host.classList.add(moodClass);
    this.say(line);
    this.onReaction?.({ part, text: line });
    window.setTimeout(() => this.host.classList.remove(moodClass), part === 'hug' ? 2400 : 1700);
  }

  setTalking(active) {
    this.talking = Boolean(active);
    this.host.classList.toggle('is-talking', this.talking);
    window.clearTimeout(this.talkTimer);
    if (active && !this.reducedMotion) {
      this.talkTimer = window.setTimeout(() => this.setTalking(false), 9000);
    }
  }

  setMood(mood = 'calm') {
    this.host.dataset.mood = mood;
    this.host.classList.toggle('is-happy', mood === 'happy');
    if (mood === 'happy') window.setTimeout(() => this.host.classList.remove('is-happy'), 1800);
  }
}

export function reactEverywhere(part) {
  characterInstances.forEach((character) => character.react(part));
}
