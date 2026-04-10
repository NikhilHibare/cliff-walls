import { MODULE_ID, DEFAULT_CONFIG } from './constants.js';
import { HangmanSetup } from './HangmanSetup.js';
import { HangmanGame }  from './HangmanGame.js';
import { HangmanSocket } from './HangmanSocket.js';

// Singleton application instances
let setupApp = null;
let gameApp  = null;

// ── init ──────────────────────────────────────────────────────────────────────

Hooks.once('init', () => {
  console.log(`${MODULE_ID} | init`);

  // Handlebars helpers
  Handlebars.registerHelper('gte', (a, b) => a >= b);
  Handlebars.registerHelper('eq',  (a, b) => a === b);
  Handlebars.registerHelper('inc', (n) => n + 1);
  Handlebars.registerHelper('times', (n, opts) => {
    let out = '';
    for (let i = 0; i < n; i++) out += opts.fn(i);
    return out;
  });

  // GM-scoped config: word list, difficulty etc.
  game.settings.register(MODULE_ID, 'gmConfig', {
    name:    'Hangman GM Config',
    scope:   'world',
    config:  false,
    type:    Object,
    default: DEFAULT_CONFIG,
  });

  // Per-client stats
  game.settings.register(MODULE_ID, 'playerStats', {
    name:    'Hangman Player Stats',
    scope:   'client',
    config:  false,
    type:    Object,
    default: { wins:0, losses:0, streak:0, bestStreak:0, totalScore:0, gamesPlayed:0 },
  });
});

// ── ready ─────────────────────────────────────────────────────────────────────

Hooks.once('ready', () => {
  console.log(`${MODULE_ID} | ready`);

  // Create singleton game window
  gameApp = new HangmanGame();

  // Register socket listener
  HangmanSocket.register(gameApp);

  // Expose to macros
  game.hangman = {
    openSetup: () => openSetup(),
    openGame:  () => openGame(),
  };
});

// ── Scene Controls ────────────────────────────────────────────────────────────

Hooks.on('getSceneControlButtons', (controls) => {
  const tokens = controls.find(c => c.name === 'token');
  if (!tokens) return;

  if (game.user.isGM) {
    tokens.tools.push({
      name:    'hangman-setup',
      title:   game.i18n.localize('HANGMAN.OpenSetup'),
      icon:    'fas fa-cog',
      button:  true,
      onClick: () => openSetup(),
    });
  }

  tokens.tools.push({
    name:    'hangman-play',
    title:   game.i18n.localize('HANGMAN.OpenGame'),
    icon:    'fas fa-puzzle-piece',
    button:  true,
    onClick: () => openGame(),
  });
});

// ── Player List buttons ───────────────────────────────────────────────────────

Hooks.on('renderPlayerList', (_app, html) => {
  const footer = html.find('.player-list-footer');

  if (game.user.isGM) {
    const gmBtn = $(`
      <button class="hm-pl-btn hm-pl-btn--gm" title="${game.i18n.localize('HANGMAN.OpenSetup')}">
        <i class="fas fa-cog"></i> HM Setup
      </button>
    `);
    gmBtn.on('click', () => openSetup());
    footer.append(gmBtn);
  }

  const playBtn = $(`
    <button class="hm-pl-btn" title="${game.i18n.localize('HANGMAN.OpenGame')}">
      <i class="fas fa-puzzle-piece"></i> Hangman
    </button>
  `);
  playBtn.on('click', () => openGame());
  footer.append(playBtn);
});

// ── Open helpers ──────────────────────────────────────────────────────────────

function openSetup() {
  if (!game.user.isGM) {
    ui.notifications.warn(game.i18n.localize('HANGMAN.GMOnly'));
    return;
  }
  if (!setupApp) setupApp = new HangmanSetup();
  setupApp.rendered ? setupApp.bringToTop() : setupApp.render(true);
}

function openGame() {
  if (!gameApp) gameApp = new HangmanGame();
  gameApp.rendered ? gameApp.bringToTop() : gameApp.render(true);
}
