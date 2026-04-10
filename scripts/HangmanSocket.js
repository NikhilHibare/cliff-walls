import { SOCKET_EVENT, MSG } from './constants.js';

/**
 * HangmanSocket — thin wrapper around Foundry's socket system.
 *
 * GM sends:  start, stop, state-sync
 * Players send: guess, hint-request
 * All clients receive everything and update their local HangmanGame instance.
 */
export class HangmanSocket {

  static _gameApp = null;   // reference to the HangmanGame window

  static register(gameApp) {
    HangmanSocket._gameApp = gameApp;

    game.socket.on(SOCKET_EVENT, (msg) => {
      HangmanSocket._handle(msg);
    });
  }

  static _handle(msg) {
    const app = HangmanSocket._gameApp;
    if (!app) return;

    switch (msg.type) {
      case MSG.START:
        app.onGameStart(msg.data);
        break;

      case MSG.STOP:
        app.onGameStop();
        break;

      case MSG.GUESS:
        // Every client applies the guess to keep state in sync
        if (app.state && app.state.phase === 'playing') {
          const letter = msg.data.letter;
          if (!app.state.guessed.has(letter)) {
            app.state.guessed.add(letter);
            app._afterGuess();
          }
        }
        break;

      default:
        break;
    }
  }

  // ── GM sends ──────────────────────────────────────────────────────────────

  static startGame(data) {
    const msg = { type: MSG.START, data };
    // Emit to all OTHER clients
    game.socket.emit(SOCKET_EVENT, msg);
    // Also apply locally (GM sees the game too)
    HangmanSocket._handle(msg);
  }

  static stopGame() {
    const msg = { type: MSG.STOP, data: {} };
    game.socket.emit(SOCKET_EVENT, msg);
    HangmanSocket._handle(msg);
    ui.notifications.info('Hangman: Game stopped.');
  }

  // ── Player sends ──────────────────────────────────────────────────────────

  static broadcastGuess(letter) {
    // Send to everyone else — sender already applied the guess locally
    game.socket.emit(SOCKET_EVENT, {
      type: MSG.GUESS,
      data: { letter, userId: game.user.id },
    });
  }
}
