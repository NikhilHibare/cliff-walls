import { MODULE_ID, KEY_ROWS, BODY_PARTS } from './constants.js';
import { HangmanSocket } from './HangmanSocket.js';

const INITIAL_STATS = { wins:0, losses:0, streak:0, bestStreak:0, totalScore:0, gamesPlayed:0 };

export class HangmanGame extends Application {

  constructor(options = {}) {
    super(options);
    // Game state — set by socket events
    this.state = null;  // null = waiting for GM
    this._timerInterval = null;
    this._stats = this._loadStats();
    this._keyHandler = null;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'hangman-game',
      title: game.i18n.localize('HANGMAN.Title'),
      template: `modules/${MODULE_ID}/templates/game.html`,
      width: 820,
      height: 620,
      resizable: true,
      classes: ['hangman-app', 'hangman-game-window'],
    });
  }

  // ── Stats ────────────────────────────────────────────────────────────────

  _loadStats() {
    try { return foundry.utils.mergeObject({...INITIAL_STATS}, game.settings.get(MODULE_ID, 'playerStats') ?? {}); }
    catch { return {...INITIAL_STATS}; }
  }

  async _saveStats() {
    try { await game.settings.set(MODULE_ID, 'playerStats', this._stats); } catch {}
  }

  // ── State helpers ────────────────────────────────────────────────────────

  get wrongGuesses() {
    if (!this.state) return [];
    return [...this.state.guessed].filter(l => !this.state.word.includes(l));
  }

  get wrongCount() { return this.wrongGuesses.length; }

  get isWordGuessed() {
    if (!this.state) return false;
    return this.state.word.split('').every(l => this.state.guessed.has(l));
  }

  get timePercent() {
    if (!this.state || !this.state.config.timeLimit) return 100;
    return Math.max(0, (this.state.timeLeft / this.state.config.timeLimit) * 100);
  }

  get wrongPercent() {
    if (!this.state) return 0;
    return Math.min(100, (this.wrongCount / this.state.config.maxWrong) * 100);
  }

  get winRate() {
    if (!this._stats.gamesPlayed) return 0;
    return Math.round((this._stats.wins / this._stats.gamesPlayed) * 100);
  }

  // ── Socket: called by HangmanSocket when GM starts ───────────────────────

  onGameStart(data) {
    this._stopTimer();
    this.state = {
      word:     data.word.toUpperCase(),
      config:   data.config,
      guessed:  new Set(data.config.preRevealed.map(l => l.toUpperCase())),
      timeLeft: data.config.timeLimit || 0,
      phase:    'playing',  // playing | win | lose
      hintUsed: false,
    };
    this.render(true);
    if (this.state.config.timeLimit > 0) this._startTimer();
  }

  onGameStop() {
    this._stopTimer();
    this.state = null;
    this.render();
  }

  // ── Template data ────────────────────────────────────────────────────────

  getData() {
    if (!this.state) {
      return { waiting: true, stats: this._stats, winRate: this.winRate };
    }

    const s = this.state;
    const cfg = s.config;
    const maxWrong = cfg.maxWrong;
    const bodyPartsToShow = Math.round((this.wrongCount / maxWrong) * BODY_PARTS);
    const timeColor = this.timePercent > 50 ? '#30d158' : this.timePercent > 25 ? '#ffd60a' : '#ff2d55';
    const wrongColor = this.wrongPercent < 50 ? '#30d158' : this.wrongPercent < 75 ? '#ffd60a' : '#ff2d55';

    const mins = Math.floor(s.timeLeft / 60);
    const secs = String(s.timeLeft % 60).padStart(2,'0');

    const wordLetters = s.word.split('').map(letter => ({
      letter,
      revealed: s.guessed.has(letter),
      wrongReveal: s.phase === 'lose' && !s.guessed.has(letter),
      show: s.guessed.has(letter) || s.phase !== 'playing',
    }));

    const keyboard = KEY_ROWS.map(row => row.map(letter => ({
      letter,
      state: !s.guessed.has(letter) ? 'idle' : s.word.includes(letter) ? 'correct' : 'wrong',
    })));

    return {
      waiting: false,
      phase:   s.phase,
      isPlaying: s.phase === 'playing',
      isWin:   s.phase === 'win',
      isLose:  s.phase === 'lose',

      word:        s.word,
      wordLetters,
      wordLength:  s.word.length,
      keyboard,

      wrongGuesses:   this.wrongGuesses,
      wrongCount:     this.wrongCount,
      maxWrong,
      hintUsed:       s.hintUsed,

      bodyPartsToShow,
      showPulse:      this.wrongPercent >= 75,
      scaffoldDanger: this.wrongPercent > 50,

      timeLeft:       s.timeLeft,
      timeDisplay:    cfg.timeLimit > 0 ? `${mins}:${secs}` : '∞',
      timePercent:    this.timePercent,
      timeColor,
      hasTimer:       cfg.timeLimit > 0,

      wrongPercent:   this.wrongPercent,
      wrongColor,

      categoryName:   cfg.categoryName ?? 'General',
      score:          this._computeScore(),

      stats:    this._stats,
      winRate:  this.winRate,
    };
  }

  // ── Rendering & listeners ────────────────────────────────────────────────

  activateListeners(html) {
    super.activateListeners(html);

    html.find('.hm-key').on('click', e => {
      if (!this.state || this.state.phase !== 'playing') return;
      this.guess(e.currentTarget.dataset.letter);
    });

    html.find('.hm-hint-btn').on('click', () => this.useHint());

    html.find('.hm-play-again-btn').on('click', () => {
      // Only GM can restart — players can only request it
      if (game.user.isGM) {
        const setup = Object.values(ui.windows).find(w => w instanceof (require('./HangmanSetup.js').HangmanSetup));
        if (setup) setup._startGame();
      } else {
        ui.notifications.info('Ask the GM to start a new round!');
      }
    });

    // Physical keyboard
    this._keyHandler = (e) => {
      if (!this.state || this.state.phase !== 'playing') return;
      const k = e.key.toUpperCase();
      if (/^[A-Z]$/.test(k)) this.guess(k);
    };
    window.addEventListener('keydown', this._keyHandler);
  }

  async close(options = {}) {
    this._stopTimer();
    if (this._keyHandler) window.removeEventListener('keydown', this._keyHandler);
    return super.close(options);
  }

  // ── Guess logic ──────────────────────────────────────────────────────────

  guess(letter) {
    if (!this.state || this.state.phase !== 'playing') return;
    if (this.state.guessed.has(letter)) return;
    this.state.guessed.add(letter);
    // Broadcast to all (GM syncs authoritative state)
    HangmanSocket.broadcastGuess(letter);
    this._afterGuess();
  }

  useHint() {
    if (!this.state || this.state.hintUsed || this.state.phase !== 'playing') return;
    const unguessed = this.state.word.split('').filter(l => !this.state.guessed.has(l));
    if (!unguessed.length) return;
    const hint = unguessed[Math.floor(Math.random() * unguessed.length)];
    this.state.hintUsed = true;
    this.guess(hint);
  }

  _afterGuess() {
    if (this.isWordGuessed) {
      this._endGame('win');
    } else if (this.wrongCount >= this.state.config.maxWrong) {
      this._endGame('lose');
    } else {
      this.render();
    }
  }

  _endGame(result) {
    this._stopTimer();
    this.state.phase = result;
    const score = result === 'win' ? this._computeScore() : 0;
    const newStreak = result === 'win' ? this._stats.streak + 1 : 0;
    this._stats = {
      wins:       this._stats.wins + (result === 'win' ? 1 : 0),
      losses:     this._stats.losses + (result === 'lose' ? 1 : 0),
      streak:     newStreak,
      bestStreak: Math.max(this._stats.bestStreak, newStreak),
      totalScore: this._stats.totalScore + score,
      gamesPlayed:this._stats.gamesPlayed + 1,
    };
    this._saveStats();
    this.render();
  }

  _computeScore() {
    if (!this.state) return 0;
    const cfg = this.state.config;
    const timeBonus = cfg.timeLimit > 0 ? Math.max(0, this.state.timeLeft) : 0;
    const base = 100 + this.state.word.length * 10 + timeBonus - this.wrongCount * 15 - (this.state.hintUsed ? 50 : 0);
    return Math.max(0, Math.round(base * (cfg.scoreMultiplier ?? 1)));
  }

  // ── Timer ────────────────────────────────────────────────────────────────

  _startTimer() {
    this._stopTimer();
    this._timerInterval = setInterval(() => {
      if (!this.state) { this._stopTimer(); return; }
      this.state.timeLeft = Math.max(0, this.state.timeLeft - 1);
      if (this.state.timeLeft === 0) {
        this._endGame('lose');
      } else {
        this._tickTimerUI();
      }
    }, 1000);
  }

  _stopTimer() {
    if (this._timerInterval) { clearInterval(this._timerInterval); this._timerInterval = null; }
  }

  _tickTimerUI() {
    if (!this.element?.length || !this.state) return;
    const pct = this.timePercent;
    const color = pct > 50 ? '#30d158' : pct > 25 ? '#ffd60a' : '#ff2d55';
    const m = Math.floor(this.state.timeLeft / 60);
    const s = String(this.state.timeLeft % 60).padStart(2,'0');
    this.element.find('.hm-time-value').text(`${m}:${s}`).css('color', color);
    this.element.find('.hm-time-bar-fill').css({ width: `${pct}%`, background: color });
  }
}
