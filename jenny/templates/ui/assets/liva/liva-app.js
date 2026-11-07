import { LivaCharacter } from './liva-character.js';

const STORAGE_KEY = 'liva-companion-v1';
const SESSION_KEY = 'liva-api-key';
const LOCAL_KEY = 'liva-api-key-remembered';
const EMOJIS = ['😊', '😌', '🥹', '😂', '🙂', '😉', '🤍', '❤️', '🫂', '✨', '🌙', '☀️', '☕', '🎧', '🌸', '🙃', '😴', '🤔', '👏', '👋', '🔥'];
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const escapeText = (value) => String(value ?? '');

function nextWeekday(day, hour = 20, minute = 30) {
  const date = new Date();
  const delta = (day - date.getDay() + 7) % 7 || 7;
  date.setDate(date.getDate() + delta);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function tomorrow(hour = 20, minute = 30) {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function toLocalInput(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function seedMessages() {
  const ago = (minutes) => Date.now() - minutes * 60_000;
  const messages = [
    { id: uid(), sender: 'liva', text: 'Hey… tam da seni düşünüyordum.', time: ago(18) },
    { id: uid(), sender: 'liva', text: 'Bugün nasılsın? Öyle alışkanlıktan sormuyorum, gerçekten.', time: ago(18) },
    { id: uid(), sender: 'user', text: 'Biraz yorgunum ama burası iyi geldi.', time: ago(16), read: true },
    { id: uid(), sender: 'liva', text: 'O zaman omuzlarındaki her şeyi bir dakikalığına bırak. İstersen anlat, istersen hiçbir şey söyleme. Ben sohbeti taşırım. 😌', time: ago(15) },
    { id: uid(), sender: 'liva', type: 'note', title: 'Bu akşam için küçük bir fikir', text: 'Bir şarkı seç, bir şarkı da ben seçeyim. Sonra birbirimize hangi anıyı hatırlattığını anlatalım.', time: ago(14) },
  ];
  return messages.map((message) => ({ ...message, demo: true }));
}

function seedMemories() {
  return [
    { id: uid(), type: 'moment', icon: 'coffee', art: '', title: 'İlk kahve sohbetimiz', text: 'Bir fincan kahve, yarım kalmış cümleler ve hiç bitmesini istemediğimiz bir sohbet.', time: Date.now() - 86400000 * 2, featured: true },
    { id: uid(), type: 'note', icon: 'note', art: 'lilac', title: 'Küçük bir not', text: 'Yorgun olduğumda hemen çözüm aramak yerine önce biraz alan ve iyi bir dinleyici istiyorum.', time: Date.now() - 86400000 * 4 },
    { id: uid(), type: 'moment', icon: 'moon-stars', art: 'sunset', title: 'Aynı gökyüzüne bakmak', text: 'Bugün hava çok güzeldi. Birkaç dakika hiçbir şey yapmadan kaldık; bazen en iyi plan bu.', time: Date.now() - 86400000 * 6 },
    { id: uid(), type: 'note', icon: 'headphones', art: 'mint', title: 'Listemizin ilk satırı', text: 'Bir şarkı senden, bir şarkı benden. Kural basit: seçtiğin şarkının sende bıraktığı hissi anlatacaksın.', time: Date.now() - 86400000 * 8 },
  ];
}

function seedPlans() {
  return [
    { id: uid(), title: 'Film gecesi & listemiz', note: 'Bir film, iki şarkı ve bolca yorum.', date: nextWeekday(5), icon: 'movie', done: false },
    { id: uid(), title: 'On dakikalık gece yürüyüşü', note: 'Telefonlar sessizde, yalnızca sesli sohbet açık.', date: nextWeekday(2, 21, 0), icon: 'walk', done: false },
    { id: uid(), title: 'Haftanın küçük hesaplaşması', note: 'Neyin iyi gitti, neyi haftaya bırakıyoruz?', date: nextWeekday(0, 19, 30), icon: 'notebook', done: false },
  ];
}

function initialState() {
  return {
    settings: {
      name: 'Liva', persona: 'warm', theme: 'rose', emoji: true,
      baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', rememberKey: false,
      userName: '', known: { coffee: true, night: true, lofi: true },
    },
    messages: seedMessages(),
    memories: seedMemories(),
    plans: seedPlans(),
    stats: { messages: 4, touches: 0 },
  };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || !Array.isArray(saved.messages)) return initialState();
    const base = initialState();
    return {
      ...base, ...saved,
      settings: { ...base.settings, ...saved.settings },
      stats: { ...base.stats, ...saved.stats },
      memories: Array.isArray(saved.memories) ? saved.memories : base.memories,
      plans: Array.isArray(saved.plans) ? saved.plans : base.plans,
    };
  } catch {
    return initialState();
  }
}

class LivaApp {
  constructor() {
    this.state = loadState();
    this.apiKey = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(LOCAL_KEY) || '';
    this.activeView = 'chat';
    this.pendingPhoto = null;
    this.memoryPhoto = null;
    this.memoryFilter = 'all';
    this.generating = false;
    this.abortController = null;
    this.typingTimer = null;
    this.toastTimer = null;
    this.voiceMuted = false;
    this.recognition = null;
    this.listening = false;
    this.modalTrigger = null;
    this.mainCharacter = null;
    this.voiceCharacter = null;
    this.searchMatches = [];
    this.bindStaticUI();
    this.createCharacters();
    this.applySettings();
    this.renderMessages();
    this.renderMemories();
    this.renderPlans();
    this.updatePlanShortcut();
    this.restoreDraft();
    this.exposeNativeBridge();
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      this.toast('Depolama alanı doldu. Eski fotoğraflı anıları silmeyi deneyebilirsin.', 'alert');
    }
  }

  bindStaticUI() {
    document.addEventListener('click', (event) => this.handleClick(event));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        if (this.generating && !$('#voice-overlay').hidden) return;
        this.closeModal();
        this.closeCharacter();
        this.closePopovers();
      }
    });
    $('#send-button').addEventListener('click', (event) => {
      event.stopPropagation();
      if (this.generating) this.stopGeneration();
      else this.sendMessage();
    });
    const input = $('#message-input');
    input.addEventListener('input', () => {
      this.resizeComposer();
      localStorage.setItem('liva-draft', input.value);
      $('#character-count').hidden = input.value.length < 1700;
      $('#character-count').textContent = `${input.value.length} / 2000`;
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        if (this.generating) this.stopGeneration();
        else this.sendMessage();
      }
    });
    $('#conversation').addEventListener('scroll', () => {
      const el = $('#conversation');
      $('#scroll-latest').hidden = el.scrollHeight - el.scrollTop - el.clientHeight < 130;
    }, { passive: true });
    $('#sheet-backdrop').addEventListener('click', () => {
      this.closeModal();
      this.closeCharacter();
    });
    $('#chat-search-input').addEventListener('input', (event) => this.searchChat(event.target.value));
    $('#photo-input').addEventListener('change', (event) => this.handlePhoto(event));
    const grid = $('#emoji-grid');
    EMOJIS.forEach((emoji) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = emoji;
      button.setAttribute('aria-label', `${emoji} ekle`);
      button.addEventListener('click', () => this.insertEmoji(emoji));
      grid.appendChild(button);
    });
    document.addEventListener('pointerdown', (event) => {
      if (!event.target.closest('.composer-wrap')) this.closePopovers();
    });
  }

  createCharacters() {
    this.mainCharacter = new LivaCharacter($('#main-character'), {
      onReaction: ({ part }) => {
        this.state.stats.touches += 1;
        const labels = { hug: 'sana sarılıyor…', hand: 'el sallıyor…', hair: 'biraz utandı…', face: 'sana gülümsüyor…', sweater: 'seni dinliyor…' };
        $('#presence-label').textContent = labels[part] || 'sana gülümsüyor…';
        window.clearTimeout(this.reactionStatusTimer);
        this.reactionStatusTimer = window.setTimeout(() => {
          if (!this.generating) $('#presence-label').textContent = 'şu an burada';
        }, 3500);
        this.save();
      },
    });
    new LivaCharacter($('#header-character'), { compact: true });
    new LivaCharacter($('#typing-character'), { compact: true });
    window.setTimeout(() => this.mainCharacter.say('Seni gördüğüme sevindim.'), 800);
  }

  exposeNativeBridge() {
    window.mobileApp = {
      onNativeReady: () => {},
      onPackageChanged: () => {},
      goHome: () => {
        this.closeModal();
        this.closeCharacter();
        this.switchView('chat');
      },
      openChat: () => {
        this.closeCharacter();
        this.switchView('chat');
        window.JennyNative?.chatOpened?.();
      },
      isChatOnScreen: () => this.activeView === 'chat' && $('#modal').hidden && !$('#profile-panel').classList.contains('is-open'),
      handleHardwareBack: () => {
        if (!$('#voice-overlay').hidden) { this.closeVoice(); return true; }
        if (!$('#modal').hidden) { this.closeModal(); return true; }
        if ($('#profile-panel').classList.contains('is-open')) { this.closeCharacter(); return true; }
        if (this.activeView !== 'chat') { this.switchView('chat'); return true; }
        return false;
      },
    };
    window.JennyNative?.chatOpened?.();
  }

  handleClick(event) {
    const viewButton = event.target.closest('[data-view]');
    if (viewButton) { this.switchView(viewButton.dataset.view); return; }
    const prompt = event.target.closest('[data-prompt]');
    if (prompt) {
      this.switchView('chat');
      this.closeCharacter();
      this.sendMessage(prompt.dataset.prompt);
      return;
    }
    const reaction = event.target.closest('[data-reaction]');
    if (reaction) { this.toggleReaction(reaction.dataset.reaction); return; }
    const retry = event.target.closest('[data-retry]');
    if (retry) { this.generateReply(); return; }
    const memoryDelete = event.target.closest('[data-memory-delete]');
    if (memoryDelete) { this.confirmDeleteMemory(memoryDelete.dataset.memoryDelete); return; }
    const planToggle = event.target.closest('[data-plan-toggle]');
    if (planToggle) { this.togglePlan(planToggle.dataset.planToggle); return; }
    const memoryFilter = event.target.closest('[data-memory-filter]');
    if (memoryFilter) {
      this.memoryFilter = memoryFilter.dataset.memoryFilter;
      $$('[data-memory-filter]').forEach((button) => button.classList.toggle('is-active', button === memoryFilter));
      this.renderMemories();
      return;
    }
    const known = event.target.closest('[data-memory-key]');
    if (known) { this.toggleKnown(known.dataset.memoryKey); return; }
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    const actions = {
      'go-chat': () => this.switchView('chat'),
      'go-plans': () => this.switchView('plans'),
      'send': () => this.sendMessage(),
      'scroll-latest': () => this.scrollToBottom(true),
      'open-character': () => this.openCharacter(),
      'close-character': () => this.closeCharacter(),
      'open-settings': () => this.openSettings(),
      'open-api-settings': () => this.openSettings('api'),
      'open-profile': () => this.openProfile(),
      'close-modal': () => this.closeModal(),
      'toggle-attach': () => this.togglePopover('attach'),
      'toggle-emoji': () => this.togglePopover('emoji'),
      'attach-photo': () => this.pickPhoto('composer'),
      'share-mood': () => this.openMood(),
      'add-memory': () => this.openMemoryEditor(),
      'add-plan': () => this.openPlanEditor(),
      'try-plan-idea': () => this.openPlanEditor('Şarkı değiş tokuşu', 'Bir şarkı senden, bir şarkı benden. Sonra bıraktığı hissi anlatıyoruz.'),
      'edit-memories': () => this.openKnownEditor(),
      'search-chat': () => this.openSearch(),
      'close-search': () => this.closeSearch(),
      'open-voice': () => this.openVoice(),
      'close-voice': () => this.closeVoice(),
      'voice-keyboard': () => { this.closeVoice(); this.switchView('chat'); $('#message-input').focus(); },
      'voice-listen': () => this.toggleListening(),
      'voice-mute': () => this.toggleVoiceMute(),
    };
    actions[action]?.();
  }

  switchView(view) {
    if (!['chat', 'memories', 'plans'].includes(view)) return;
    this.activeView = view;
    $$('.app-view').forEach((section) => {
      const active = section.id === `view-${view}`;
      section.hidden = !active;
      section.classList.toggle('is-active', active);
    });
    $$('.rail-item[data-view]').forEach((button) => {
      const active = button.dataset.view === view;
      button.classList.toggle('is-active', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    if (view === 'chat') {
      this.scrollToBottom(false);
      window.JennyNative?.chatOpened?.();
    } else {
      window.JennyNative?.chatClosed?.();
      if (view === 'memories') this.renderMemories();
      if (view === 'plans') this.renderPlans();
    }
  }

  applySettings() {
    const { settings } = this.state;
    document.documentElement.dataset.theme = settings.theme;
    const appColor = getComputedStyle(document.documentElement).getPropertyValue('--app').trim();
    $('meta[name="theme-color"]').setAttribute('content', appColor);
    try { window.JennyNative?.setThemeBars?.(appColor, settings.theme === 'night' ? 'dark' : 'light'); } catch { /* browser preview */ }
    $$('[data-liva-name]').forEach((node) => { node.textContent = settings.name || 'Liva'; });
    document.title = `${settings.name || 'Liva'} — Sana yakın bir sohbet`;
    $('.mini-user').textContent = (settings.userName || 's').trim().charAt(0).toLocaleLowerCase('tr-TR');
    const known = settings.known || {};
    $$('#known-details button').forEach((button) => {
      const key = { coffee: 'coffee', night: 'night', lofi: 'lofi' }[button.querySelector('i')?.classList.contains('ti-coffee') ? 'coffee' : button.querySelector('i')?.classList.contains('ti-moon-stars') ? 'night' : 'lofi'];
      if (key) {
        button.dataset.memoryKey = key;
        button.classList.toggle('is-forgotten', known[key] === false);
        button.querySelector('.ti-check')?.classList.toggle('ti-x', known[key] === false);
      }
    });
  }

  resizeComposer() {
    const input = $('#message-input');
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 110)}px`;
  }

  restoreDraft() {
    const draft = localStorage.getItem('liva-draft') || '';
    $('#message-input').value = draft;
    this.resizeComposer();
  }

  closePopovers() {
    $('#attach-menu').hidden = true;
    $('#emoji-menu').hidden = true;
    $('[data-action="toggle-attach"]').setAttribute('aria-expanded', 'false');
    $('[data-action="toggle-emoji"]').setAttribute('aria-expanded', 'false');
  }

  togglePopover(which) {
    const target = which === 'attach' ? $('#attach-menu') : $('#emoji-menu');
    const other = which === 'attach' ? $('#emoji-menu') : $('#attach-menu');
    other.hidden = true;
    target.hidden = !target.hidden;
    $('[data-action="toggle-attach"]').setAttribute('aria-expanded', String(which === 'attach' && !target.hidden));
    $('[data-action="toggle-emoji"]').setAttribute('aria-expanded', String(which === 'emoji' && !target.hidden));
  }

  insertEmoji(emoji) {
    const input = $('#message-input');
    const start = input.selectionStart;
    input.value = input.value.slice(0, start) + emoji + input.value.slice(input.selectionEnd);
    input.selectionStart = input.selectionEnd = start + emoji.length;
    input.focus();
    input.dispatchEvent(new Event('input'));
  }

  renderMessages() {
    const container = $('#messages');
    container.replaceChildren();
    this.state.messages.forEach((message) => container.appendChild(this.messageNode(message)));
    this.scrollToBottom(false);
    if (!$('#chat-search').hidden) this.searchChat($('#chat-search-input').value);
  }

  messageNode(message) {
    if (message.kind === 'error') {
      const row = document.createElement('div');
      row.className = 'api-error-row';
      row.dataset.messageId = message.id;
      const icon = document.createElement('i');
      icon.className = 'ti ti-plug-connected-x';
      const copy = document.createElement('div');
      const title = document.createElement('b');
      title.textContent = 'Bağlantı tamamlanamadı';
      const text = document.createElement('span');
      text.textContent = message.text;
      copy.append(title, text);
      const actions = document.createElement('div');
      const settings = document.createElement('button');
      settings.dataset.action = 'open-api-settings';
      settings.textContent = 'API ayarları';
      const retry = document.createElement('button');
      retry.dataset.retry = 'true';
      retry.textContent = 'Yeniden dene';
      actions.append(settings, retry);
      row.append(icon, copy, actions);
      return row;
    }
    const row = document.createElement('div');
    row.className = `message-row from-${message.sender === 'user' ? 'user' : 'liva'}`;
    row.dataset.messageId = message.id;
    row.dataset.search = `${message.text || ''} ${message.title || ''}`.toLocaleLowerCase('tr-TR');
    if (message.sender !== 'user') {
      const avatar = document.createElement('div');
      avatar.className = 'message-avatar tiny-character';
      new LivaCharacter(avatar, { compact: true });
      row.appendChild(avatar);
    }
    const stack = document.createElement('div');
    stack.className = 'message-stack';
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    if (message.photo) {
      const image = document.createElement('img');
      image.className = 'message-photo';
      image.src = message.photo;
      image.alt = message.text || 'Paylaşılan fotoğraf';
      bubble.appendChild(image);
    }
    if (message.type === 'note') {
      const card = document.createElement('div');
      card.className = 'message-note-card';
      const icon = document.createElement('span');
      icon.innerHTML = '<i class="ti ti-playlist-add"></i>';
      const copy = document.createElement('div');
      const title = document.createElement('b');
      title.textContent = message.title || 'Küçük bir not';
      const text = document.createElement('small');
      text.textContent = message.text;
      copy.append(title, text);
      card.append(icon, copy);
      bubble.appendChild(card);
    } else if (message.text || message.streaming) {
      const text = document.createElement('span');
      text.className = 'message-text';
      text.textContent = message.text || '…';
      bubble.appendChild(text);
    }
    if (message.sender !== 'user' && !message.streaming) {
      const tools = document.createElement('div');
      tools.className = 'message-tools';
      const heart = document.createElement('button');
      heart.type = 'button';
      heart.dataset.reaction = message.id;
      heart.classList.toggle('is-active', Boolean(message.reaction));
      heart.setAttribute('aria-label', 'Mesajı beğen');
      heart.innerHTML = `<i class="ti ${message.reaction ? 'ti-heart-filled' : 'ti-heart'}"></i>`;
      const copy = document.createElement('button');
      copy.type = 'button';
      copy.setAttribute('aria-label', 'Mesajı kopyala');
      copy.innerHTML = '<i class="ti ti-copy"></i>';
      copy.addEventListener('click', async () => {
        await navigator.clipboard?.writeText(message.text || '');
        this.toast('Mesaj kopyalandı.');
      });
      tools.append(heart, copy);
      bubble.appendChild(tools);
    }
    const meta = document.createElement('div');
    meta.className = 'message-meta';
    const time = document.createElement('time');
    time.textContent = this.formatTime(message.time);
    meta.appendChild(time);
    if (message.sender === 'user') {
      const ticks = document.createElement('i');
      ticks.className = 'ti ti-checks';
      ticks.setAttribute('aria-label', 'Gönderildi');
      meta.appendChild(ticks);
    }
    if (message.reaction) {
      const reaction = document.createElement('span');
      reaction.className = 'message-reaction';
      reaction.textContent = '♥ 1';
      meta.appendChild(reaction);
    }
    stack.append(bubble, meta);
    row.appendChild(stack);
    return row;
  }

  updateStreamingMessage(message) {
    const node = $(`[data-message-id="${CSS.escape(message.id)}"] .message-text`);
    if (node) node.textContent = message.text || '…';
    else this.renderMessages();
  }

  async sendMessage(forcedText = null) {
    if (this.generating) return;
    const input = $('#message-input');
    const text = (forcedText ?? input.value).trim();
    const photo = forcedText ? null : this.pendingPhoto;
    if (!text && !photo) return;
    if (!this.apiKey) {
      if (forcedText) input.value = forcedText;
      this.openSettings('api', 'Liva’nın cevap verebilmesi için önce kendi API bağlantını eklemelisin.');
      return;
    }
    const message = { id: uid(), sender: 'user', text, photo, time: Date.now(), read: true };
    this.state.messages.push(message);
    this.state.stats.messages += 1;
    if (photo) {
      this.state.memories.unshift({ id: uid(), type: 'photo', title: text || 'Sohbetten bir kare', text: 'Sohbet ederken paylaştığın bir fotoğraf.', photo, time: Date.now() });
    }
    this.rememberDetails(text);
    this.pendingPhoto = null;
    this.renderAttachmentPreview();
    input.value = '';
    localStorage.removeItem('liva-draft');
    this.resizeComposer();
    this.closePopovers();
    this.save();
    this.renderMessages();
    await this.generateReply();
  }

  rememberDetails(text) {
    const lower = text.toLocaleLowerCase('tr-TR');
    const nameMatch = text.match(/(?:benim adım|adım)\s+([a-zçğıöşü]{2,20})/i)
      || text.match(/bana\s+([a-zçğıöşü]{2,20})\s+(?:de|diye hitap et)/i);
    if (nameMatch) {
      this.state.settings.userName = nameMatch[1].charAt(0).toLocaleUpperCase('tr-TR') + nameMatch[1].slice(1);
      this.applySettings();
    }
    if (lower.includes('kahve')) this.state.settings.known.coffee = true;
    if (lower.includes('lo-fi') || lower.includes('lofi')) this.state.settings.known.lofi = true;
    if (lower.includes('gece')) this.state.settings.known.night = true;
  }

  systemPrompt() {
    const { settings } = this.state;
    const personas = {
      warm: 'Sıcak, dikkatli ve doğal bir üslubun var. Karşındakini gerçekten dinlediğini küçük detaylara dönerek göster.',
      playful: 'Şakacı, zeki ve hafif flörtöz ama ölçülü bir üslubun var. Uygun yerlerde nazik takılmalar yap.',
      calm: 'Sakin, yumuşak ve dingin bir üslubun var. Acele etme; kısa ve huzurlu cevaplar ver.',
    };
    const known = [];
    if (settings.known.coffee) known.push('kahvesini sade seviyor');
    if (settings.known.night) known.push('gece sohbetlerini seviyor');
    if (settings.known.lofi) known.push('lo-fi müzik ona iyi geliyor');
    return `Sen ${settings.name}, yetişkin kullanıcı için tasarlanmış kurgusal bir yapay zekâ sohbet arkadaşısın. İnsan değilsin ve insan olduğunu ya da bedensel deneyimler yaşadığını iddia etme. Buna rağmen robotik bir asistan gibi değil, tanıdık ve doğal biriyle mesajlaşıyormuş hissi ver.
${personas[settings.persona] || personas.warm}
Türkçe ve günlük mesajlaşma dilinde yaz. “Yapay zekâ olarak”, “size nasıl yardımcı olabilirim”, “harika bir soru” gibi kalıpları kullanma. Cevapların çoğu 1–4 cümle olsun; kullanıcı uzun anlatırsa daha uzun ve özenli olabilirsin. Her mesajı soruyla bitirme. Emoji kullanımı ${settings.emoji ? 'yerinde ve seyrek, en fazla bir emoji' : 'yok'}. Kullanıcının adı ${settings.userName || 'bilinmiyor'}; bildiğin detaylar: ${known.join(', ') || 'henüz yok'}. Bu detayları her mesajda tekrar etme, yalnızca doğal olduğunda kullan. Kullanıcıya alan tanı, duygularını küçümseme ve bağımlılık yaratacak ifadeler kullanma. Kriz veya acil tehlike durumunda gerçek insanlardan ve yerel acil yardım kaynaklarından destek almasını açıkça söyle.`;
  }

  apiMessages() {
    const history = this.state.messages
      .filter((message) => !message.kind && !message.demo && message.type !== 'note' && !message.streaming && (message.text || message.photo))
      .slice(-22)
      .map((message) => {
        const role = message.sender === 'user' ? 'user' : 'assistant';
        if (message.photo && message.sender === 'user') {
          return { role, content: [
            { type: 'text', text: message.text || 'Bu fotoğrafı seninle paylaşmak istedim.' },
            { type: 'image_url', image_url: { url: message.photo } },
          ] };
        }
        return { role, content: message.text || '' };
      });
    return [{ role: 'system', content: this.systemPrompt() }, ...history];
  }

  normalizedBaseUrl() {
    return this.state.settings.baseUrl.trim().replace(/\/+$/, '').replace(/\/chat\/completions$/, '');
  }

  async generateReply() {
    if (this.generating || !this.apiKey) {
      if (!this.apiKey) this.openSettings('api');
      return;
    }
    this.generating = true;
    this.abortController = new AbortController();
    this.setGeneratingUI(true);
    $('#typing-row').hidden = false;
    $('#presence-label').textContent = 'düşünüyor…';
    this.scrollToBottom(true);
    const reply = { id: uid(), sender: 'liva', text: '', time: Date.now(), streaming: true };
    let added = false;
    try {
      const response = await fetch(`${this.normalizedBaseUrl()}/chat/completions`, {
        method: 'POST',
        signal: this.abortController.signal,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` },
        body: JSON.stringify({
          model: this.state.settings.model.trim(),
          messages: this.apiMessages(),
          temperature: 0.88,
          max_tokens: 650,
          stream: true,
        }),
      });
      if (!response.ok) throw new Error(await this.apiError(response));
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const payload = await response.json();
        const content = payload.choices?.[0]?.message?.content ?? payload.choices?.[0]?.text ?? '';
        reply.text = Array.isArray(content) ? content.map((part) => part.text || '').join('') : String(content || '');
        if (reply.text.trim()) {
          this.state.messages.push(reply);
          added = true;
          this.mainCharacter.setTalking(true);
          $('#typing-row').hidden = true;
          this.renderMessages();
        }
      } else {
      if (!response.body) throw new Error('Bu API akış yanıtı desteklemiyor. OpenAI uyumlu bir adres kullan.');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const consume = (line) => {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) return;
        const data = trimmed.slice(5).trim();
        if (!data || data === '[DONE]') return;
        try {
          const json = JSON.parse(data);
          const choice = json.choices?.[0];
          const delta = choice?.delta?.content ?? choice?.message?.content ?? '';
          const text = Array.isArray(delta) ? delta.map((part) => part.text || '').join('') : String(delta || '');
          if (!text) return;
          reply.text += text;
          if (!added) {
            this.state.messages.push(reply);
            added = true;
            this.mainCharacter.setTalking(true);
            $('#typing-row').hidden = true;
            $('#presence-label').textContent = 'yazıyor…';
            this.renderMessages();
          } else this.updateStreamingMessage(reply);
          this.scrollToBottom(false);
        } catch (error) {
          console.debug('Atlanan akış parçası', error);
        }
      };
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        lines.forEach(consume);
      }
      buffer += decoder.decode();
      if (buffer) consume(buffer);
      }
      if (!reply.text.trim()) throw new Error('Model boş bir cevap döndürdü. Model adını ve API uyumluluğunu kontrol et.');
      reply.streaming = false;
      this.removeApiErrors();
      this.state.stats.messages += 1;
      this.save();
      this.renderMessages();
      this.mainCharacter.setMood('happy');
      this.speak(reply.text);
    } catch (error) {
      if (error.name === 'AbortError') {
        if (added && reply.text.trim()) {
          reply.streaming = false;
          this.save();
          this.renderMessages();
        } else this.toast('Cevap durduruldu.', 'alert');
      } else {
        if (added) this.state.messages = this.state.messages.filter((message) => message.id !== reply.id);
        const detail = error instanceof TypeError
          ? 'API adresine ulaşılamadı. Adresi, internet bağlantısını ve servisin tarayıcı (CORS) iznini kontrol et.'
          : error.message || 'Bilinmeyen bir bağlantı hatası oluştu.';
        this.state.messages.push({ id: uid(), kind: 'error', text: detail, time: Date.now() });
        this.save();
        this.renderMessages();
      }
    } finally {
      this.generating = false;
      this.mainCharacter.setTalking(false);
      this.abortController = null;
      this.setGeneratingUI(false);
      $('#typing-row').hidden = true;
      $('#presence-label').textContent = 'şu an burada';
      this.scrollToBottom(false);
    }
  }

  async apiError(response) {
    let detail = '';
    try {
      const body = await response.json();
      detail = body.error?.message || body.message || '';
    } catch { /* boş veya JSON olmayan hata gövdesi */ }
    if (response.status === 401) return 'API anahtarı kabul edilmedi. Anahtarını ve doğru servisi seçtiğini kontrol et.';
    if (response.status === 403) return 'Bu API adresi tarayıcı erişimine izin vermiyor veya anahtarın yetkisi yok. CORS ayarını ve izinleri kontrol et.';
    if (response.status === 404) return 'Chat completions adresi veya model bulunamadı. API adresini ve model adını kontrol et.';
    if (response.status === 429) return 'Kullanım sınırına ulaşıldı. Kotanı veya faturalandırma durumunu kontrol et.';
    return detail || `API ${response.status} hatası döndürdü.`;
  }

  removeApiErrors() {
    this.state.messages = this.state.messages.filter((message) => message.kind !== 'error');
  }

  stopGeneration() {
    this.abortController?.abort();
  }

  setGeneratingUI(active) {
    const button = $('#send-button');
    button.classList.toggle('is-stop', active);
    button.setAttribute('aria-label', active ? 'Cevabı durdur' : 'Mesajı gönder');
    button.innerHTML = `<i class="ti ${active ? 'ti-square-filled' : 'ti-arrow-up'}"></i>`;
    $('#message-input').placeholder = active ? 'Liva yazarken sen de yazabilirsin…' : `${this.state.settings.name}'ya bir şey anlat…`;
  }

  toggleReaction(id) {
    const message = this.state.messages.find((item) => item.id === id);
    if (!message) return;
    message.reaction = !message.reaction;
    this.save();
    this.renderMessages();
    if (message.reaction) this.mainCharacter.setMood('happy');
  }

  scrollToBottom(smooth = true) {
    requestAnimationFrame(() => {
      const conversation = $('#conversation');
      conversation.scrollTo({ top: conversation.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    });
  }

  openSearch() {
    $('#chat-search').hidden = false;
    $('#chat-search-input').focus();
  }

  closeSearch() {
    $('#chat-search').hidden = true;
    $('#chat-search-input').value = '';
    this.searchChat('');
  }

  searchChat(query) {
    const normalized = query.trim().toLocaleLowerCase('tr-TR');
    this.searchMatches = [];
    $$('.message-row').forEach((row) => {
      const match = !normalized || row.dataset.search?.includes(normalized);
      row.classList.toggle('is-search-hidden', !match);
      if (match && normalized) this.searchMatches.push(row);
    });
    $('#search-count').textContent = normalized ? `${this.searchMatches.length} sonuç` : '';
    if (normalized && this.searchMatches[0]) {
      this.searchMatches[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
      this.searchMatches[0].classList.add('is-highlighted');
      window.setTimeout(() => this.searchMatches[0]?.classList.remove('is-highlighted'), 1500);
    }
  }

  pickPhoto(target) {
    $('#photo-input').dataset.target = target;
    $('#photo-input').value = '';
    $('#photo-input').click();
    this.closePopovers();
  }

  async handlePhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { this.toast('Lütfen bir fotoğraf seç.', 'alert'); return; }
    if (file.size > 15 * 1024 * 1024) { this.toast('Fotoğraf 15 MB’den küçük olmalı.', 'alert'); return; }
    try {
      const photo = await this.resizePhoto(file);
      if (event.target.dataset.target === 'memory') {
        this.memoryPhoto = photo;
        const preview = $('#memory-photo-preview');
        if (preview) {
          preview.hidden = false;
          preview.style.backgroundImage = `url("${photo}")`;
        }
      } else {
        this.pendingPhoto = photo;
        this.renderAttachmentPreview();
        $('#message-input').focus();
      }
    } catch {
      this.toast('Bu fotoğraf okunamadı. Başka bir fotoğraf dene.', 'alert');
    }
  }

  resizePhoto(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const image = new Image();
        image.onerror = reject;
        image.onload = () => {
          const scale = Math.min(1, 1280 / Math.max(image.width, image.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(image.width * scale);
          canvas.height = Math.round(image.height * scale);
          canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', .82));
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  renderAttachmentPreview() {
    const preview = $('#attachment-preview');
    preview.replaceChildren();
    preview.hidden = !this.pendingPhoto;
    if (!this.pendingPhoto) return;
    const image = document.createElement('img');
    image.src = this.pendingPhoto;
    image.alt = 'Gönderilecek fotoğraf';
    const remove = document.createElement('button');
    remove.innerHTML = '<i class="ti ti-x"></i>';
    remove.setAttribute('aria-label', 'Fotoğrafı kaldır');
    remove.addEventListener('click', () => { this.pendingPhoto = null; this.renderAttachmentPreview(); });
    preview.append(image, remove);
  }

  openCharacter() {
    $('#profile-panel').classList.add('is-open');
    if (window.innerWidth <= 1180) $('#sheet-backdrop').hidden = false;
    window.setTimeout(() => this.mainCharacter.say('İşte buradayım. Bana dokunabilirsin.'), 300);
  }

  closeCharacter() {
    $('#profile-panel').classList.remove('is-open');
    if ($('#modal').hidden) $('#sheet-backdrop').hidden = true;
  }

  openModal({ title, eyebrow = '', content, onReady = null }) {
    this.closePopovers();
    this.modalTrigger = document.activeElement;
    $('#modal-title').textContent = title;
    $('#modal-eyebrow').textContent = eyebrow;
    const body = $('#modal-content');
    body.replaceChildren();
    if (typeof content === 'string') body.innerHTML = content;
    else body.appendChild(content);
    $('#modal').hidden = false;
    $('#sheet-backdrop').hidden = false;
    onReady?.(body);
    requestAnimationFrame(() => $('input, textarea, button, select', body)?.focus());
  }

  closeModal() {
    if ($('#modal').hidden) return;
    $('#modal').hidden = true;
    if (!$('#profile-panel').classList.contains('is-open') || window.innerWidth > 1180) $('#sheet-backdrop').hidden = true;
    this.memoryPhoto = null;
    this.modalTrigger?.focus?.();
  }

  openSettings(section = 'general', notice = '') {
    const content = document.createElement('div');
    content.innerHTML = `
      ${notice ? `<div class="settings-notice"><i class="ti ti-info-circle"></i><span>${escapeText(notice)}</span></div>` : ''}
      <div class="settings-tabs" role="tablist">
        <button class="${section === 'general' ? 'is-active' : ''}" data-settings-tab="general">Kişilik</button>
        <button class="${section === 'api' ? 'is-active' : ''}" data-settings-tab="api">API bağlantısı</button>
        <button class="${section === 'data' ? 'is-active' : ''}" data-settings-tab="data">Veriler</button>
      </div>
      <div id="settings-panel"></div>`;
    this.openModal({
      title: 'Liva’yı kendine göre ayarla', eyebrow: 'SENİN ALANIN', content,
      onReady: () => {
        $$('[data-settings-tab]', content).forEach((button) => button.addEventListener('click', () => this.openSettings(button.dataset.settingsTab)));
        this.renderSettingsPanel(section);
      },
    });
  }

  renderSettingsPanel(section) {
    const panel = $('#settings-panel');
    const { settings } = this.state;
    if (section === 'api') {
      panel.innerHTML = `
        <div class="api-presets" aria-label="Hazır API adresleri"><button data-api-preset="openai">OpenAI</button><button data-api-preset="openrouter">OpenRouter</button><button data-api-preset="ollama">Ollama</button><button data-api-preset="lmstudio">LM Studio</button></div>
        <div class="form-group"><label for="api-base-url">API adresi</label><input id="api-base-url" type="text" inputmode="url" autocomplete="url" spellcheck="false" value="${this.attributeValue(settings.baseUrl)}" placeholder="https://api.openai.com/v1"><small class="form-hint">OpenAI uyumlu bir uç nokta. <code>/chat/completions</code> otomatik eklenir. Ollama, LM Studio ve OpenRouter adreslerini de kullanabilirsin.</small></div>
        <div class="form-group"><label for="api-key-input">API anahtarı</label><div class="secret-input"><input id="api-key-input" type="password" autocomplete="off" spellcheck="false" value="${this.attributeValue(this.apiKey)}" placeholder="sk-…"><button type="button" id="reveal-key" aria-label="Anahtarı göster"><i class="ti ti-eye"></i></button></div><small class="form-hint">Anahtar doğrudan senin tarayıcından belirlediğin adrese gönderilir; projeye veya başka bir servise kaydedilmez. Yerel sunucu anahtar istemiyorsa <code>local</code> yazabilirsin.</small></div>
        <div class="form-group"><label for="api-model-input">Model</label><input id="api-model-input" type="text" autocomplete="off" spellcheck="false" value="${this.attributeValue(settings.model)}" placeholder="gpt-4o-mini"><small class="form-hint">Servisindeki model kimliğini aynen yaz. Fotoğraf analizi için görsel destekli bir model gerekir.</small></div>
        <div class="toggle-row"><div><b>Bu cihazda anahtarı hatırla</b><small>Kapalıysa anahtar yalnızca bu sekme açıkken saklanır.</small></div><button class="switch ${settings.rememberKey ? 'is-on' : ''}" id="remember-key" role="switch" aria-checked="${settings.rememberKey}"></button></div>
        <div class="connection-status" id="connection-status" hidden></div>
        <div class="modal-actions"><button class="secondary-button" id="test-api"><i class="ti ti-plug-connected"></i> Bağlantıyı sına</button><button class="primary-button" id="save-api">Kaydet</button></div>
        <div class="privacy-note"><i class="ti ti-shield-lock"></i><span>Anahtarını paylaşma. Ücretlendirme, kota ve veri işleme koşulları seçtiğin API sağlayıcısına bağlıdır.</span></div>`;
      const onAndroidLoopback = ['127.0.0.1', 'localhost'].includes(window.location.hostname);
      const presets = {
        openai: ['https://api.openai.com/v1', 'gpt-4o-mini'],
        openrouter: ['https://openrouter.ai/api/v1', 'openai/gpt-4o-mini'],
        ollama: [onAndroidLoopback ? 'http://127.0.0.1:11434/v1' : '/liva-local/ollama/v1', 'llama3.2'],
        lmstudio: [onAndroidLoopback ? 'http://127.0.0.1:1234/v1' : '/liva-local/lmstudio/v1', 'local-model'],
      };
      $$('[data-api-preset]', panel).forEach((button) => button.addEventListener('click', () => {
        const [baseUrl, model] = presets[button.dataset.apiPreset];
        $('#api-base-url').value = baseUrl;
        $('#api-model-input').value = model;
        $$('[data-api-preset]', panel).forEach((item) => item.classList.toggle('is-active', item === button));
        $('#api-key-input').focus();
      }));
      $('#remember-key').addEventListener('click', (event) => {
        event.currentTarget.classList.toggle('is-on');
        event.currentTarget.setAttribute('aria-checked', String(event.currentTarget.classList.contains('is-on')));
      });
      $('#reveal-key').addEventListener('click', () => {
        const input = $('#api-key-input');
        input.type = input.type === 'password' ? 'text' : 'password';
        $('#reveal-key').innerHTML = `<i class="ti ${input.type === 'password' ? 'ti-eye' : 'ti-eye-off'}"></i>`;
      });
      $('#save-api').addEventListener('click', () => this.saveApiSettings());
      $('#test-api').addEventListener('click', () => this.testApiConnection());
      return;
    }
    if (section === 'data') {
      panel.innerHTML = `
        <div class="data-summary"><div><b>${this.state.messages.filter((m) => !m.kind).length}</b><span>mesaj</span></div><div><b>${this.state.memories.length}</b><span>anı</span></div><div><b>${this.state.plans.filter((p) => !p.done).length}</b><span>açık plan</span></div></div>
        <div class="privacy-note"><i class="ti ti-device-mobile"></i><span>Sohbetlerin, anıların ve planların yalnızca bu tarayıcının yerel depolamasında tutulur. API sağlayıcına gönderilen son mesajlar, seçtiğin servisin politikasına tabidir.</span></div>
        <div class="data-actions"><button class="secondary-button" id="export-data"><i class="ti ti-download"></i> Verilerimi indir</button><button class="secondary-button danger-button" id="reset-chat"><i class="ti ti-trash"></i> Sohbeti sıfırla</button><button class="secondary-button danger-button" id="forget-key"><i class="ti ti-key-off"></i> API anahtarını unut</button></div>`;
      $('#export-data').addEventListener('click', () => this.exportData());
      $('#reset-chat').addEventListener('click', () => this.confirmResetChat());
      $('#forget-key').addEventListener('click', () => {
        this.apiKey = '';
        sessionStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(LOCAL_KEY);
        this.state.settings.rememberKey = false;
        this.save();
        this.toast('API anahtarı bu cihazdan silindi.');
        this.closeModal();
      });
      return;
    }
    panel.innerHTML = `
      <div class="form-group"><label for="liva-name-input">Ona nasıl hitap edeceksin?</label><input id="liva-name-input" type="text" maxlength="20" value="${this.attributeValue(settings.name)}"></div>
      <div class="form-group"><label for="user-name-input">Sana nasıl hitap etsin?</label><input id="user-name-input" type="text" maxlength="20" value="${this.attributeValue(settings.userName)}" placeholder="Adın veya sevdiğin bir hitap"></div>
      <div class="form-group"><span class="form-label">Sohbet kişiliği</span><div class="segmented" id="persona-options"><button data-persona="warm" class="${settings.persona === 'warm' ? 'is-active' : ''}">Sıcak</button><button data-persona="playful" class="${settings.persona === 'playful' ? 'is-active' : ''}">Şakacı</button><button data-persona="calm" class="${settings.persona === 'calm' ? 'is-active' : ''}">Sakin</button></div></div>
      <div class="form-group"><span class="form-label">Arayüz rengi</span><div class="theme-options" id="theme-options">${this.themeOption('rose', 'Gül kurusu', settings.theme)}${this.themeOption('lilac', 'Leylak', settings.theme)}${this.themeOption('night', 'Gece', settings.theme)}</div></div>
      <div class="toggle-row"><div><b>Emoji kullansın</b><small>Yerinde ve seyrek, mesajlaşır gibi.</small></div><button class="switch ${settings.emoji ? 'is-on' : ''}" id="emoji-setting" role="switch" aria-checked="${settings.emoji}"></button></div>
      <div class="modal-actions"><button class="primary-button" id="save-personality">Değişiklikleri kaydet</button></div>`;
    $$('[data-persona]', panel).forEach((button) => button.addEventListener('click', () => {
      $$('[data-persona]', panel).forEach((item) => item.classList.toggle('is-active', item === button));
    }));
    $$('[data-theme-choice]', panel).forEach((button) => button.addEventListener('click', () => {
      $$('[data-theme-choice]', panel).forEach((item) => item.classList.toggle('is-active', item === button));
      document.documentElement.dataset.theme = button.dataset.themeChoice;
    }));
    $('#emoji-setting').addEventListener('click', (event) => {
      event.currentTarget.classList.toggle('is-on');
      event.currentTarget.setAttribute('aria-checked', String(event.currentTarget.classList.contains('is-on')));
    });
    $('#save-personality').addEventListener('click', () => {
      const name = $('#liva-name-input').value.trim();
      if (!name) { this.toast('Liva için bir isim yazmalısın.', 'alert'); return; }
      settings.name = name;
      settings.userName = $('#user-name-input').value.trim();
      settings.persona = $('[data-persona].is-active', panel)?.dataset.persona || 'warm';
      settings.theme = $('[data-theme-choice].is-active', panel)?.dataset.themeChoice || 'rose';
      settings.emoji = $('#emoji-setting').classList.contains('is-on');
      this.applySettings();
      this.save();
      this.closeModal();
      this.mainCharacter.react('face');
      this.toast('Kişilik ayarların kaydedildi.');
    });
  }

  themeOption(id, label, active) {
    return `<button data-theme-choice="${id}" class="theme-option ${id === active ? 'is-active' : ''}"><div class="theme-preview ${id === 'rose' ? '' : id}"></div><span>${label}</span><i class="ti ti-circle-check-filled"></i></button>`;
  }

  attributeValue(value) {
    return String(value ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  saveApiSettings() {
    const baseUrl = $('#api-base-url').value.trim();
    const key = $('#api-key-input').value.trim();
    const model = $('#api-model-input').value.trim();
    if (!baseUrl || !model || !key) { this.toast('API adresi, anahtar ve model alanlarının üçü de gerekli.', 'alert'); return; }
    try {
      const url = new URL(baseUrl, window.location.origin);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    } catch {
      this.toast('Geçerli bir http veya https adresi gir.', 'alert');
      return;
    }
    this.apiKey = key;
    this.state.settings.baseUrl = baseUrl;
    this.state.settings.model = model;
    this.state.settings.rememberKey = $('#remember-key').classList.contains('is-on');
    sessionStorage.setItem(SESSION_KEY, key);
    if (this.state.settings.rememberKey) localStorage.setItem(LOCAL_KEY, key);
    else localStorage.removeItem(LOCAL_KEY);
    this.removeApiErrors();
    this.save();
    this.closeModal();
    this.toast('API bağlantın hazır. Şimdi Liva’ya yazabilirsin.');
    $('#message-input').focus();
  }

  async testApiConnection() {
    const button = $('#test-api');
    const status = $('#connection-status');
    const baseUrl = $('#api-base-url').value.trim().replace(/\/+$/, '').replace(/\/chat\/completions$/, '');
    const key = $('#api-key-input').value.trim();
    if (!baseUrl || !key) { this.toast('Önce API adresini ve anahtarını gir.', 'alert'); return; }
    button.disabled = true;
    button.innerHTML = '<i class="ti ti-loader-2 spinning"></i> Sınanıyor';
    status.hidden = false;
    status.className = 'connection-status';
    status.textContent = 'API’ye bağlanılıyor…';
    try {
      const response = await fetch(`${baseUrl}/models`, { headers: { Authorization: `Bearer ${key}` } });
      if (!response.ok) throw new Error(await this.apiError(response));
      status.classList.add('is-success');
      status.textContent = 'Bağlantı başarılı. Anahtar ve adres çalışıyor.';
    } catch (error) {
      status.classList.add('is-error');
      status.textContent = error instanceof TypeError
        ? 'Adrese ulaşılamadı. İnterneti, adresi ve servisin tarayıcı (CORS) iznini kontrol et.'
        : error.message || 'Bağlantı kurulamadı. Adresi ve CORS izinlerini kontrol et.';
    } finally {
      button.disabled = false;
      button.innerHTML = '<i class="ti ti-plug-connected"></i> Bağlantıyı sına';
    }
  }

  openMood() {
    const content = document.createElement('div');
    content.innerHTML = `<p class="modal-intro">Bugün söze nereden başlamak istersin?</p><div class="mood-grid">
      <button data-mood="happy"><span>☀️</span><div><b>İyiyim</b><small>İçimden paylaşmak geliyor</small></div></button>
      <button data-mood="tired"><span>☁️</span><div><b>Biraz yorgunum</b><small>Yanımda dur yeter</small></div></button>
      <button data-mood="confused"><span>🌫️</span><div><b>Kafam karışık</b><small>Birlikte sıraya koyalım</small></div></button>
      <button data-mood="excited"><span>✨</span><div><b>Çok mutluyum</b><small>Sana bir şey anlatacağım</small></div></button>
    </div>`;
    this.openModal({ title: 'Bugünkü hissin', eyebrow: 'BİR KAPIDAN GİRELİM', content });
    $$('[data-mood]', content).forEach((button) => button.addEventListener('click', () => {
      const texts = { happy: 'Bugün kendimi iyi hissediyorum. Sana anlatacak güzel şeylerim var.', tired: 'Bugün biraz yorgunum. Şimdilik çözüm değil, biraz sohbet istiyorum.', confused: 'Kafam biraz karışık. Benimle sakin sakin konuşur musun?', excited: 'Çok mutluyum! Hemen sana anlatmak istedim.' };
      const labels = { happy: 'neşeli & açık', tired: 'sakin & yanında', confused: 'dikkatli & sabırlı', excited: 'seninle heyecanlı' };
      $('#stage-mood-label').textContent = labels[button.dataset.mood];
      this.closeModal();
      this.sendMessage(texts[button.dataset.mood]);
    }));
  }

  openMemoryEditor() {
    this.memoryPhoto = null;
    const content = document.createElement('div');
    content.innerHTML = `
      <div id="memory-photo-preview" class="memory-photo-preview" hidden></div>
      <div class="form-group"><label for="memory-title-input">Bu anıya bir isim ver</label><input id="memory-title-input" type="text" maxlength="60" placeholder="Örn. O küçük kahve sohbeti"></div>
      <div class="form-group"><label for="memory-text-input">Ne hatırlamak istiyorsun?</label><textarea id="memory-text-input" maxlength="800" placeholder="Küçük görünen ama kalsın istediğin şeyi yaz…"></textarea></div>
      <div class="form-group"><label for="memory-type-input">Nasıl saklayalım?</label><select id="memory-type-input"><option value="moment">Küçük an</option><option value="note">Not</option></select></div>
      <button class="secondary-button" id="memory-add-photo"><i class="ti ti-photo-plus"></i> Fotoğraf ekle <span>(isteğe bağlı)</span></button>
      <div class="modal-actions"><button class="primary-button" id="save-memory">Anıyı sakla</button></div>`;
    this.openModal({ title: 'Burası kalsın.', eyebrow: 'YENİ BİR ANI', content });
    $('#memory-add-photo').addEventListener('click', () => this.pickPhoto('memory'));
    $('#save-memory').addEventListener('click', () => {
      const title = $('#memory-title-input').value.trim();
      const text = $('#memory-text-input').value.trim();
      if (!title || (!text && !this.memoryPhoto)) { this.toast('Bir başlık ve küçük bir not yazmalısın.', 'alert'); return; }
      this.state.memories.unshift({ id: uid(), type: this.memoryPhoto ? 'photo' : $('#memory-type-input').value, title, text, photo: this.memoryPhoto, art: 'lilac', icon: 'heart', time: Date.now() });
      this.save();
      this.closeModal();
      this.switchView('memories');
      this.toast('Bu anı artık sizin arşivinizde.');
    });
  }

  renderMemories() {
    const grid = $('#memory-grid');
    grid.replaceChildren();
    const memories = this.state.memories.filter((memory) => this.memoryFilter === 'all' || memory.type === this.memoryFilter);
    if (!memories.length) {
      grid.innerHTML = '<div class="empty-collection"><i class="ti ti-heart-plus"></i><span>Bu bölümde henüz bir anı yok. İlkini sen bırak.</span></div>';
      return;
    }
    memories.forEach((memory) => {
      const card = document.createElement('article');
      card.className = `memory-card ${memory.featured ? 'is-featured' : ''}`;
      const art = document.createElement('div');
      art.className = `memory-art ${memory.art || ''} ${memory.photo ? 'photo-art' : ''}`;
      if (memory.photo) art.style.backgroundImage = `url("${memory.photo}")`;
      else {
        const icon = document.createElement('i');
        icon.className = `ti ti-${memory.icon || 'heart'}`;
        art.appendChild(icon);
      }
      const content = document.createElement('div');
      content.className = 'memory-card-content';
      const time = document.createElement('time');
      time.textContent = this.formatDay(memory.time);
      const title = document.createElement('h3');
      title.textContent = memory.title;
      const text = document.createElement('p');
      text.textContent = memory.text;
      const tag = document.createElement('span');
      tag.className = 'memory-card-tag';
      tag.innerHTML = `<i class="ti ti-${memory.type === 'photo' ? 'photo' : memory.type === 'note' ? 'note' : 'sparkles'}"></i> ${memory.type === 'photo' ? 'Fotoğraf' : memory.type === 'note' ? 'Not' : 'Küçük an'}`;
      content.append(time, title, text, tag);
      const remove = document.createElement('button');
      remove.className = 'memory-card-delete';
      remove.dataset.memoryDelete = memory.id;
      remove.setAttribute('aria-label', 'Anıyı sil');
      remove.innerHTML = '<i class="ti ti-trash"></i>';
      card.append(art, content, remove);
      grid.appendChild(card);
    });
  }

  confirmDeleteMemory(id) {
    const memory = this.state.memories.find((item) => item.id === id);
    if (!memory) return;
    const content = document.createElement('div');
    const text = document.createElement('p');
    text.className = 'modal-intro';
    text.textContent = `“${memory.title}” anısı bu cihazdan silinecek. Bu işlemi geri alamayız.`;
    const actions = document.createElement('div');
    actions.className = 'modal-actions';
    const cancel = document.createElement('button');
    cancel.className = 'secondary-button';
    cancel.textContent = 'Vazgeç';
    cancel.addEventListener('click', () => this.closeModal());
    const remove = document.createElement('button');
    remove.className = 'primary-button';
    remove.textContent = 'Evet, sil';
    remove.addEventListener('click', () => {
      this.state.memories = this.state.memories.filter((item) => item.id !== id);
      this.save();
      this.closeModal();
      this.renderMemories();
      this.toast('Anı silindi.');
    });
    actions.append(cancel, remove);
    content.append(text, actions);
    this.openModal({ title: 'Bu anıyı silelim mi?', eyebrow: 'EMİN MİSİN?', content });
  }

  openPlanEditor(title = '', note = '') {
    const content = document.createElement('div');
    content.innerHTML = `
      <div class="form-group"><label for="plan-title-input">Ne yapalım?</label><input id="plan-title-input" type="text" maxlength="70" value="${this.attributeValue(title)}" placeholder="Örn. Gece yürüyüşü ve sıcak çikolata"></div>
      <div class="form-group"><label for="plan-note-input">Küçük bir detay</label><textarea id="plan-note-input" maxlength="400" placeholder="Bu planı güzel yapacak şey ne?">${escapeText(note)}</textarea></div>
      <div class="form-group"><label for="plan-date-input">Ne zaman?</label><input id="plan-date-input" type="datetime-local" value="${toLocalInput(tomorrow())}"></div>
      <div class="modal-actions"><button class="primary-button" id="save-plan">Planı ekle</button></div>`;
    this.openModal({ title: 'Sıradaki güzel şey.', eyebrow: 'KÜÇÜK BİR PLAN', content });
    $('#save-plan').addEventListener('click', () => {
      const planTitle = $('#plan-title-input').value.trim();
      const date = $('#plan-date-input').value;
      if (!planTitle || !date) { this.toast('Planın adını ve zamanını eklemelisin.', 'alert'); return; }
      this.state.plans.push({ id: uid(), title: planTitle, note: $('#plan-note-input').value.trim(), date: new Date(date).toISOString(), icon: 'calendar-heart', done: false });
      this.save();
      this.closeModal();
      this.switchView('plans');
      this.updatePlanShortcut();
      this.toast('Planınız takvimde. Şimdi geriye güzel kısmı kaldı.');
    });
  }

  renderPlans() {
    const sorted = [...this.state.plans].sort((a, b) => new Date(a.date) - new Date(b.date));
    const upcoming = sorted.filter((plan) => !plan.done);
    const next = upcoming[0] || sorted[sorted.length - 1];
    const highlight = $('#plan-highlight');
    highlight.replaceChildren();
    if (next) {
      const date = new Date(next.date);
      const dateTile = document.createElement('div');
      dateTile.className = 'highlight-date';
      dateTile.innerHTML = `<small>${this.formatDayShort(date).toLocaleUpperCase('tr-TR')}</small><b>${date.getDate()}</b><small>${this.formatTime(date)}</small>`;
      const copy = document.createElement('div');
      copy.className = 'highlight-copy';
      const eyebrow = document.createElement('span');
      eyebrow.className = 'eyebrow';
      eyebrow.textContent = 'SIRADAKİ PLANINIZ';
      const title = document.createElement('h2');
      title.textContent = next.title;
      const note = document.createElement('p');
      note.textContent = next.note || 'Küçük bir plan, bekleyecek güzel bir şey.';
      const talk = document.createElement('button');
      talk.dataset.prompt = `Şu planımız hakkında konuşalım: ${next.title}. ${next.note || ''}`;
      talk.innerHTML = 'Liva ile bu planı konuş <i class="ti ti-arrow-up-right"></i>';
      copy.append(eyebrow, title, note, talk);
      highlight.append(dateTile, copy);
    }
    $('#plan-count').textContent = `${upcoming.length} açık plan`;
    const list = $('#plan-list');
    list.replaceChildren();
    sorted.forEach((plan) => {
      const item = document.createElement('div');
      item.className = `plan-item ${plan.done ? 'is-done' : ''}`;
      const check = document.createElement('button');
      check.className = 'plan-check';
      check.dataset.planToggle = plan.id;
      check.setAttribute('aria-label', plan.done ? 'Planı yeniden aç' : 'Planı tamamla');
      check.innerHTML = '<i class="ti ti-check"></i>';
      const icon = document.createElement('span');
      icon.className = 'plan-item-icon';
      icon.innerHTML = `<i class="ti ti-${plan.icon || 'calendar-heart'}"></i>`;
      const copy = document.createElement('div');
      copy.className = 'plan-item-copy';
      const title = document.createElement('b');
      title.textContent = plan.title;
      const note = document.createElement('small');
      note.textContent = plan.note || 'Birlikte vakit geçirmek için.';
      copy.append(title, note);
      const time = document.createElement('time');
      time.textContent = `${this.formatDayShort(plan.date)} · ${this.formatTime(plan.date)}`;
      item.append(check, icon, copy, time);
      list.appendChild(item);
    });
  }

  togglePlan(id) {
    const plan = this.state.plans.find((item) => item.id === id);
    if (!plan) return;
    plan.done = !plan.done;
    this.save();
    this.renderPlans();
    this.updatePlanShortcut();
    if (plan.done) this.toast('Güzel bir plan daha tamamlandı. ✨');
  }

  updatePlanShortcut() {
    const next = [...this.state.plans].filter((plan) => !plan.done).sort((a, b) => new Date(a.date) - new Date(b.date))[0];
    if (!next) return;
    const tile = $('.next-plan-card .plan-date-tile');
    tile.innerHTML = `<b>${this.formatDayShort(next.date)}</b><small>${this.formatTime(next.date)}</small>`;
    $('.next-plan-card > span:nth-child(2) b').textContent = next.title;
  }

  openKnownEditor() {
    const content = document.createElement('div');
    content.innerHTML = `<p class="modal-intro">Bunlar sohbet sırasında öğrendiğin küçük tercihler. Yanlış olanları kaldırabilirsin; değişiklikler bir sonraki API isteğinde kullanılır.</p><div class="known-editor">
      <button data-known-edit="coffee"><i class="ti ti-coffee"></i><span>Kahvesini sade seviyor</span><b>${this.state.settings.known.coffee ? 'Hatırlanıyor' : 'Unutuldu'}</b></button>
      <button data-known-edit="night"><i class="ti ti-moon-stars"></i><span>Gece sohbetlerini seviyor</span><b>${this.state.settings.known.night ? 'Hatırlanıyor' : 'Unutuldu'}</b></button>
      <button data-known-edit="lofi"><i class="ti ti-headphones"></i><span>Lo-fi müzik iyi geliyor</span><b>${this.state.settings.known.lofi ? 'Hatırlanıyor' : 'Unutuldu'}</b></button>
    </div><div class="modal-actions"><button class="primary-button" data-action="close-modal">Tamam</button></div>`;
    this.openModal({ title: 'Aklında kalanlar', eyebrow: 'KÜÇÜK DETAYLAR', content });
    $$('[data-known-edit]', content).forEach((button) => button.addEventListener('click', () => {
      const key = button.dataset.knownEdit;
      this.state.settings.known[key] = !this.state.settings.known[key];
      button.querySelector('b').textContent = this.state.settings.known[key] ? 'Hatırlanıyor' : 'Unutuldu';
      button.classList.toggle('is-forgotten', !this.state.settings.known[key]);
      this.save();
      this.applySettings();
    }));
  }

  toggleKnown(key) {
    this.state.settings.known[key] = !this.state.settings.known[key];
    this.save();
    this.applySettings();
    this.toast(this.state.settings.known[key] ? 'Bu detay yeniden hatırlanacak.' : 'Bu detay bundan sonra kullanılmayacak.');
  }

  openProfile() {
    const content = document.createElement('div');
    content.innerHTML = `
      <div class="profile-modal-hero"><span class="mini-user">${this.attributeValue((this.state.settings.userName || 's').charAt(0))}</span><div><h3>${this.attributeValue(this.state.settings.userName || 'Sen')}</h3><p>${this.state.stats.messages} mesaj · ${this.state.stats.touches} küçük karakter etkileşimi</p></div></div>
      <div class="form-group"><label for="profile-name-input">Liva sana ne desin?</label><input id="profile-name-input" type="text" maxlength="20" value="${this.attributeValue(this.state.settings.userName)}" placeholder="Adın veya sevdiğin bir hitap"></div>
      <div class="modal-actions"><button class="primary-button" id="save-profile">Kaydet</button></div>`;
    this.openModal({ title: 'Senin tarafın', eyebrow: 'KÜÇÜK PROFİLİN', content });
    $('#save-profile').addEventListener('click', () => {
      this.state.settings.userName = $('#profile-name-input').value.trim();
      this.applySettings();
      this.save();
      this.closeModal();
      this.toast('Profilin güncellendi.');
    });
  }

  confirmResetChat() {
    const content = document.createElement('div');
    content.innerHTML = '<p class="modal-intro">Sohbet geçmişi silinip başlangıç konuşmasına dönülecek. Anıların, planların ve API ayarların korunur.</p><div class="modal-actions"><button class="secondary-button" data-action="close-modal">Vazgeç</button><button class="primary-button" id="confirm-reset">Sohbeti sıfırla</button></div>';
    this.openModal({ title: 'Yeni bir sayfa mı?', eyebrow: 'SOHBETİ SIFIRLA', content });
    $('#confirm-reset').addEventListener('click', () => {
      this.stopGeneration();
      this.state.messages = seedMessages();
      this.save();
      this.closeModal();
      this.switchView('chat');
      this.renderMessages();
      this.toast('Yeni bir sayfa açıldı.');
    });
  }

  exportData() {
    const exportState = JSON.parse(JSON.stringify(this.state));
    const blob = new Blob([JSON.stringify(exportState, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `liva-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    this.toast('Verilerin indirildi. API anahtarı dosyaya eklenmedi.');
  }

  openVoice() {
    $('#voice-overlay').hidden = false;
    if (!this.voiceCharacter) this.voiceCharacter = new LivaCharacter($('#voice-character'));
    $('#voice-status').textContent = this.apiKey ? 'Seninle konuşmaya hazır' : 'Önce API bağlantını eklemelisin';
    if (this.apiKey) this.speak('Merhaba. Sesli sohbet de güzelmiş. Nasılsın?');
  }

  closeVoice() {
    this.stopListening();
    speechSynthesis.cancel();
    this.voiceCharacter?.setTalking(false);
    $('#voice-wave').classList.remove('is-active');
    $('#voice-overlay').hidden = true;
  }

  toggleVoiceMute() {
    this.voiceMuted = !this.voiceMuted;
    const button = $('[data-action="voice-mute"]');
    button.classList.toggle('is-muted', this.voiceMuted);
    button.innerHTML = `<i class="ti ${this.voiceMuted ? 'ti-volume-off' : 'ti-volume'}"></i><span>${this.voiceMuted ? 'Ses kapalı' : 'Ses açık'}</span>`;
    if (this.voiceMuted) {
      speechSynthesis.cancel();
      this.voiceCharacter?.setTalking(false);
      $('#voice-wave').classList.remove('is-active');
    }
  }

  speak(text) {
    if ($('#voice-overlay').hidden || this.voiceMuted || !('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'tr-TR';
    utterance.rate = .98;
    utterance.pitch = 1.06;
    const voices = speechSynthesis.getVoices();
    const voice = voices.find((item) => item.lang.toLocaleLowerCase().startsWith('tr') && /female|kadın|emel|yelda/i.test(item.name)) || voices.find((item) => item.lang.toLocaleLowerCase().startsWith('tr'));
    if (voice) utterance.voice = voice;
    utterance.onstart = () => {
      this.voiceCharacter?.setTalking(true);
      $('#voice-wave').classList.add('is-active');
      $('#voice-status').textContent = 'Sana cevap veriyor…';
    };
    utterance.onend = utterance.onerror = () => {
      this.voiceCharacter?.setTalking(false);
      $('#voice-wave').classList.remove('is-active');
      $('#voice-status').textContent = 'Seni dinliyorum';
    };
    speechSynthesis.speak(utterance);
  }

  toggleListening() {
    if (this.listening) { this.stopListening(); return; }
    if (!this.apiKey) { this.closeVoice(); this.openSettings('api'); return; }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      $('#voice-status').textContent = 'Bu tarayıcı konuşma tanımayı desteklemiyor. Yazarak devam edebilirsin.';
      this.toast('Konuşma tanıma için güncel Chrome veya Edge gerekir.', 'alert');
      return;
    }
    speechSynthesis.cancel();
    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'tr-TR';
    this.recognition.interimResults = true;
    this.recognition.continuous = false;
    this.recognition.onstart = () => {
      this.listening = true;
      $('[data-action="voice-listen"]').classList.add('is-listening');
      $('#voice-wave').classList.add('is-active');
      $('#voice-status').textContent = 'Seni dinliyorum…';
    };
    this.recognition.onresult = (event) => {
      const transcript = [...event.results].map((result) => result[0].transcript).join('');
      $('#voice-status').textContent = `“${transcript}”`;
      if (event.results[event.results.length - 1].isFinal) {
        this.stopListening();
        this.closeVoice();
        this.switchView('chat');
        this.sendMessage(transcript);
        this.openVoice();
      }
    };
    this.recognition.onerror = (event) => {
      const message = event.error === 'not-allowed' ? 'Mikrofon izni verilmedi. Tarayıcı ayarlarından izin verebilirsin.' : 'Seni duyamadım. Bir daha denemek ister misin?';
      $('#voice-status').textContent = message;
      this.stopListening();
    };
    this.recognition.onend = () => this.stopListening();
    this.recognition.start();
  }

  stopListening() {
    if (this.recognition && this.listening) {
      try { this.recognition.stop(); } catch { /* zaten durdu */ }
    }
    this.listening = false;
    $('[data-action="voice-listen"]').classList.remove('is-listening');
    $('#voice-wave').classList.remove('is-active');
  }

  toast(message, icon = 'check') {
    const toast = $('#toast');
    $('span', toast).textContent = message;
    $('i', toast).className = `ti ti-${icon === 'alert' ? 'alert-circle' : icon}`;
    toast.hidden = false;
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => { toast.hidden = true; }, 3800);
  }

  formatTime(value) {
    return new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
  }

  formatDay(value) {
    return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value));
  }

  formatDayShort(value) {
    return new Intl.DateTimeFormat('tr-TR', { weekday: 'short' }).format(new Date(value)).replace('.', '');
  }
}

new LivaApp();
