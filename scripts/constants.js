export const MODULE_ID = 'hangman-game';

export const SOCKET_EVENT = 'module.hangman-game';

// Socket message types
export const MSG = {
  START:   'game:start',   // GM → all: { config, word }
  STOP:    'game:stop',    // GM → all
  GUESS:   'game:guess',   // player → all: { letter, userId }
  STATE:   'game:state',   // GM → all: full state sync
  HINT:    'game:hint',    // player → GM: request hint
};

export const DEFAULT_WORDS = [
  'elephant', 'giraffe', 'penguin', 'dolphin', 'cheetah',
  'crocodile', 'kangaroo', 'flamingo', 'platypus', 'chameleon',
  'algorithm', 'database', 'encryption', 'javascript', 'compiler',
  'astronomy', 'molecule', 'nucleus', 'photon', 'radiation',
  'antarctica', 'himalaya', 'volcano', 'archipelago', 'peninsula',
  'inception', 'gladiator', 'titanic', 'matrix', 'godfather',
  'avocado', 'guacamole', 'lasagna', 'mozzarella', 'tiramisu',
];

export const DEFAULT_CONFIG = {
  words: [...DEFAULT_WORDS],
  categoryName: 'General',
  maxWrong: 6,
  timeLimit: 90,
  scoreMultiplier: 1.0,
  preRevealed: [],      // letters revealed from the start
};

// Letters keyboard rows
export const KEY_ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['Z','X','C','V','B','N','M'],
];

// Body-part drawing order (indices into SVG <g id="bp-N"> elements)
export const BODY_PARTS = 6; // head, body, L-arm, R-arm, L-leg, R-leg
