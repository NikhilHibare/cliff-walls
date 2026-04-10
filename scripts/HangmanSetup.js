import { MODULE_ID, DEFAULT_CONFIG, KEY_ROWS } from './constants.js';
import { HangmanSocket } from './HangmanSocket.js';

export class HangmanSetup extends Application {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'hangman-setup',
      title: game.i18n.localize('HANGMAN.SetupTitle'),
      template: `modules/${MODULE_ID}/templates/setup.html`,
      width: 640,
      height: 700,
      resizable: true,
      classes: ['hangman-app', 'hangman-setup-window'],
    });
  }

  // ── Settings helpers ─────────────────────────────────────────────────────

  static loadConfig() {
    try {
      return foundry.utils.mergeObject(
        foundry.utils.deepClone(DEFAULT_CONFIG),
        game.settings.get(MODULE_ID, 'gmConfig') ?? {}
      );
    } catch { return foundry.utils.deepClone(DEFAULT_CONFIG); }
  }

  static async saveConfig(cfg) {
    await game.settings.set(MODULE_ID, 'gmConfig', cfg);
  }

  // ── Template data ────────────────────────────────────────────────────────

  getData() {
    const cfg = HangmanSetup.loadConfig();
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    return {
      ...cfg,
      words: cfg.words.map((w, i) => ({ word: w, index: i })),
      alphabet: alphabet.map(l => ({
        letter: l,
        active: (cfg.preRevealed ?? []).includes(l),
      })),
      keyRows: KEY_ROWS,
    };
  }

  // ── Listeners ────────────────────────────────────────────────────────────

  activateListeners(html) {
    super.activateListeners(html);

    // ── Word list ──
    html.find('.hms-add-word-btn').on('click', () => {
      const inp = html.find('.hms-new-word-input');
      const word = inp.val().trim().toUpperCase();
      if (!word) return;
      const cfg = HangmanSetup.loadConfig();
      if (!cfg.words.includes(word)) cfg.words.push(word);
      HangmanSetup.saveConfig(cfg).then(() => this.render());
      inp.val('');
    });

    html.find('.hms-new-word-input').on('keydown', (e) => {
      if (e.key === 'Enter') html.find('.hms-add-word-btn').trigger('click');
    });

    html.find('.hms-remove-word').on('click', (e) => {
      const idx = parseInt(e.currentTarget.dataset.index);
      const cfg = HangmanSetup.loadConfig();
      cfg.words.splice(idx, 1);
      HangmanSetup.saveConfig(cfg).then(() => this.render());
    });

    html.find('.hms-clear-words').on('click', async () => {
      const ok = await Dialog.confirm({
        title: 'Clear Word List',
        content: '<p>Remove all words from the list?</p>',
      });
      if (!ok) return;
      const cfg = HangmanSetup.loadConfig();
      cfg.words = [];
      await HangmanSetup.saveConfig(cfg);
      this.render();
    });

    html.find('.hms-import-btn').on('click', () => {
      const raw = html.find('.hms-import-input').val();
      const words = raw.split(',').map(w => w.trim().toUpperCase()).filter(Boolean);
      const cfg = HangmanSetup.loadConfig();
      words.forEach(w => { if (!cfg.words.includes(w)) cfg.words.push(w); });
      HangmanSetup.saveConfig(cfg).then(() => this.render());
      html.find('.hms-import-input').val('');
    });

    // ── Pre-revealed letters ──
    html.find('.hms-letter-toggle').on('click', (e) => {
      const letter = e.currentTarget.dataset.letter;
      const cfg = HangmanSetup.loadConfig();
      const idx = cfg.preRevealed.indexOf(letter);
      if (idx === -1) cfg.preRevealed.push(letter);
      else cfg.preRevealed.splice(idx, 1);
      HangmanSetup.saveConfig(cfg).then(() => this.render());
    });

    html.find('.hms-clear-revealed').on('click', () => {
      const cfg = HangmanSetup.loadConfig();
      cfg.preRevealed = [];
      HangmanSetup.saveConfig(cfg).then(() => this.render());
    });

    // ── Difficulty fields ──
    html.find('.hms-field').on('change', (e) => {
      const cfg = HangmanSetup.loadConfig();
      const key = e.currentTarget.dataset.key;
      const val = e.currentTarget.type === 'number'
        ? parseFloat(e.currentTarget.value)
        : e.currentTarget.value;
      cfg[key] = val;
      HangmanSetup.saveConfig(cfg);
    });

    // ── Category name ──
    html.find('.hms-category-input').on('change', (e) => {
      const cfg = HangmanSetup.loadConfig();
      cfg.categoryName = e.currentTarget.value.trim() || 'General';
      HangmanSetup.saveConfig(cfg);
    });

    // ── Start game ──
    html.find('.hms-start-btn').on('click', () => this._startGame());

    // ── Stop game ──
    html.find('.hms-stop-btn').on('click', () => HangmanSocket.stopGame());
  }

  // ── Game start logic ─────────────────────────────────────────────────────

  _startGame() {
    const cfg = HangmanSetup.loadConfig();
    if (!cfg.words.length) {
      ui.notifications.warn('Hangman: Add at least one word before starting.');
      return;
    }
    const word = cfg.words[Math.floor(Math.random() * cfg.words.length)];
    HangmanSocket.startGame({ config: cfg, word });
    ui.notifications.info(`Hangman: Game started! Word has ${word.length} letters.`);
  }
}
