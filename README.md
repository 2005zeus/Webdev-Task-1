# Ricochet Rumble

Arjun, a tech enthusiast, was bored of playing chess. So he asked his nerd friend Vishrudh to suggest a two-player game that was new and more interesting. Vishrudh, who was lazy yet brilliant, came up with an immediate idea of Ricochet Rumble, where the game is played as follows:

### Game Logic

- An 8x8 - 2 player turn-based board game consisting of 5 different pieces.
  - Titan
  - Tank
  - Ricochets
  - Semi Ricochets
  - Cannon
- Any piece can move one tile or rotate once. The cannon is allowed to move only in the horizontal direction and is positioned in the base rank.
- The aim of the game is to destroy the opponent’s Titan by striking the bullet through a series of various Ricochets.

## Modes

### NormalMode

- Create an 8x8 grid for the game board. Make the base config as shown in the video: [Demo](https://www.youtube.com/watch?v=-gpd-5AY6T0)
- Make the cannon shoot a circular bullet. Implement movement logic and move validation for each piece: they can move to adjacent or diagonally adjacent cells or rotate.
- Add a time system: Each player gets specific amount of time. The timer must decrement during the respective player’s turn. If the timer balls down to 0, the other player wins.
- Make the game mobile responsive.
- Add pause, resume and reset feature.

### HackerMode

- Implement the feature to undo and redo the moves.
- Make the bullet destroy semi Ricochets when hit in the non reflecting surface.
- Display the history of moves of each player. Store the history once the game ends in local storage.
- Add game sound effects.
- Make the cannon shoot a Directional bullet (you can use an asset)
- Make the Ricochets swap with any piece (opponent's piece, too) except the Titans.
- Make the tanks to allow the bullets to pass through from any one side.

### HackerMode++

- Using the stored game history, implement a game replay feature.
- Randomized Playable starting position.
- Animate the game movements (For e.g., smoother bullets)
- Create a single-player mode where the opponent is a bot.
- Add spells (For eg: spell which makes a piece passthrough for a move)

_**NO** frameworks are allowed. HTML canvas is **prohibited** for this task. Use only vanilla js, CSS, and HTML_

_**NOTE**: Normal Mode is necessary to complete the task. HackerMode and HackerMode++ are highly encouraged_

## Deadline

30 May 2024 | 11.59 pm