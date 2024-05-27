const pieceTable = {
    'rt': 'r-titan',
    'rb': 'r-tank',
    'rr': 'r-rico',
    'rs': 'r-semirico',
    'rc': 'r-cannon',

    'bt': 'b-titan',
    'bb': 'b-tank',
    'br': 'b-rico',
    'bs': 'b-semirico',
    'bc': 'b-cannon'
}
let initialPosition = [
    // <piece><orientation>
    // rico: 0,1 ; semirico: 0,1,2,3 ; cannon: 0,1,2,3
    ['', '', 'rc2', 'rt', '', '', '', ''],
    ['', '', '', '', 'rs3', 'rr1', '', ''],
    ['', '', '', '', '', 'rb', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', 'bb', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['bs3', 'br1', '', '', 'bt', 'bc', '', ''],
]

const canRotate = {
    'r': true,
    's': true,
    'b': true,
}

let AudioDict = {
    shoot: new Audio('./css/sounds/shoot.mp3'),
    destroy: new Audio('./css/sounds/destroy.mp3'),
    click: new Audio('./css/sounds/click.mp3'),
    bounce: new Audio('./css/sounds/bounce.mp3'),
    move: new Audio('./css/sounds/move.mp3'),
    rotate: new Audio('./css/sounds/rotate.mp3'),
    win: new Audio('./css/sounds/win.mp3'),
    clock1: new Audio('./css/sounds/2x-clock-tick.mp3'),
    clock2: new Audio('./css/sounds/back-tick.mp3'),        // Not used
}

let paused = false;
let HistoryList = [];
const blueInitTime = 300;
const redInitTime = 300;
let blueTime = blueInitTime; 
let redTime = redInitTime;

let Cells = {};
let Pieces = {};

let prevLegalMoves = [];
let selectedCell = null;

let Turn = 'b';

let lButton = document.getElementById('bottombar-l');
let rButton = document.getElementById('bottombar-r');

//---------------------------------------------------------------------------------
// Classes

class Cell{
    constructor(i, j, piece){
        this.id = i + '-' + j;
        this.position = [i, j];
        this.piece = piece;
    }

    element(){
        let cell = document.createElement('button');
        cell.className = 'cell';
        cell.id = this.id

        document.getElementById('board').appendChild(cell);

        return cell;
    }

    getLegal(){
        if (!this.piece) return false;

        AudioDict.click.play();

        let legalMoves = [];
        let totalMoves = [];

        // Add all the possible squares to table
        if (this.piece['type'] == 'c'){
            // If cannon
            totalMoves.push(`${this.position[0]}-${this.position[1] - 1}`);
            totalMoves.push(`${this.position[0]}-${this.position[1] + 1}`);
        } else {
            // If not cannon
            for (let i = -1; i < 2; i++){
                for (let j = -1; j < 2; j++){
                    if (i == 0 && j == 0) continue;
    
                    let x = this.position[0] + i;
                    let y = this.position[1] + j;
    
                    totalMoves.push(`${x}-${y}`)
                } 
            }
        }

        // Check what moves are possible from total moves
        for (let cellId in totalMoves){
            if (Cells[totalMoves[cellId]]){ // To eliminate outside Cells
                if (
                    !Cells[totalMoves[cellId]].piece                                            // No piece
                    ||
                    (
                        this.piece.type == 'r'                                                  // Piece (not t or c)
                        && Cells[totalMoves[cellId]].piece.type != 't' 
                        && Cells[totalMoves[cellId]].piece.type != 'c'
                    )
                    ||
                    (
                        this.piece.type == 'r'                                                  // Piece (c and in same x position)
                        && Cells[totalMoves[cellId]].piece.type == 'c'
                        && this.position[0] == Cells[totalMoves[cellId]].piece.position[0]
                    )
                ){
                    legalMoves.push(totalMoves[cellId])
                }
            }
        }

        return legalMoves;
    }
}

class Piece{
    constructor(type, team, i, j, orientation=0){
        this.type = type;
        this.team = team;
        this.position = [i, j];
        this.orientation = orientation;

        this.id = i + '-' + j + '-' + team + type + orientation;
    }

    element(){
        let div = document.createElement('div');
        div.className = 'piece ' + pieceTable[this.team + this.type]
        div.style.transform = `rotate(${this.orientation * 90}deg)`;
        div.id = this.id

        return div;
    }

    shoot(){
        if(this.type != 'c' || this.team != Turn) return false;

        setTimeout(() => AudioDict.shoot.play(), 250);

        function getAbsolutePosition(element) {
            // Returns the midpoint of the element
            const rect = element.getBoundingClientRect();
            const scrollLeft = document.documentElement.scrollLeft;
            const scrollTop = document.documentElement.scrollTop; 

            const absoluteMidpointX = rect.left + scrollLeft + rect.width / 2;
            const absoluteMidpointY = rect.top + scrollTop + rect.height / 2;
        
            return [absoluteMidpointX, absoluteMidpointY];
        }

        /*
        Cannon orientation initial shoot direction
        0: -x axis
        2: x axis
        */
        let updateVector = [0, 0]
        let currentVector = Array.from(this.position);

        const cannon = document.getElementById(currentVector[0] + '-' + currentVector[1]);

        //--
        // Creating th bullet and its design
        let bullet = document.createElement('div');
        bullet.className = 'bullet ' + Turn;
        bullet.style.left = getAbsolutePosition(cannon)[0] - 10 + 'px';
        bullet.style.top = getAbsolutePosition(cannon)[1] - 10 + 'px';
        document.getElementById('container').appendChild(bullet);
        //--

        const cellDist = getAbsolutePosition(document.getElementById('0-1'))[0] - getAbsolutePosition(document.getElementById('0-0'))[0];

        const bulletSpeed = 1;
        let L = {d: 0, recur: 0};
        let T = {d: 0, recur: 0};
        let currentCell;
        let currentCelle;
        let isAnimating = false;
        let deflectors = false;

        function passThrough(){
            // Bullet travel function
            isAnimating = true;

            currentCelle = document.getElementById(currentCell.id);

            L.d = Math.abs(getAbsolutePosition(bullet)[0] - getAbsolutePosition(currentCelle)[0] + (cellDist/2 * updateVector[1]));
            T.d = Math.abs(getAbsolutePosition(bullet)[1] - getAbsolutePosition(currentCelle)[1] + (cellDist/2 * updateVector[0]));

            L.recur = Math.floor(L.d / bulletSpeed);
            T.recur = Math.floor(T.d / bulletSpeed);

            requestAnimationFrame(animateBullet);
        }

        function animateBullet(){
            // Responsible for animating bullet
            if (isAnimating) {
                bullet.style.left = bullet.offsetLeft + bulletSpeed * updateVector[1] + 'px';
                bullet.style.top = bullet.offsetTop + bulletSpeed * updateVector[0] + 'px';

                L.recur--;
                T.recur--;

                // Bullet rotation
                if (updateVector[1] == 1){
                    bullet.style.transform = `rotate(90deg)`;
                } else if (updateVector[1] == -1){
                    bullet.style.transform = `rotate(-90deg)`;
                } else if (updateVector[0] == 1){
                    bullet.style.transform = `rotate(180deg)`;
                } else if (updateVector[0] == -1){
                    bullet.style.transform = `rotate(0deg)`;
                }

                if (L.recur <= 0 && T.recur <= 0) {
                    if (deflectors){
                        bullet.style.left = getAbsolutePosition(currentCelle)[0] + (cellDist * updateVector[1]) - 10 + 'px';
                        bullet.style.top = getAbsolutePosition(currentCelle)[1] + (cellDist * updateVector[0]) - 10 + 'px';

                        deflectors = false;
                    } else {
                        bullet.style.left = getAbsolutePosition(currentCelle)[0] + (cellDist/2 * updateVector[1]) - 10 + 'px';
                        bullet.style.top = getAbsolutePosition(currentCelle)[1] + (cellDist/2 * updateVector[0]) - 10 + 'px';    
                    }

                    isAnimating = false;
                }
                requestAnimationFrame(animateBullet);

            } else {
                currentVector[0] += updateVector[0];
                currentVector[1] += updateVector[1];

                currentCell = Cells[currentVector[0] + '-' + currentVector[1]];
    
                if (currentCell){
                    // Bullet inside the board
                    if (currentCell.piece){
                        // Check which piece has been hit
                        if (currentCell.piece.type == 't'){
                            // Titan - game over if opponent or else pass through
                            if (currentCell.piece.team == Turn){
                                playerWin(Turn == 'b' ? 'Blue' : 'Red');
                                bullet.remove();
                            } else {
                                passThrough();
                            }

                        } else if (currentCell.piece.type == 'b'){
                            // Tank - delete the bullet or passthrough from one side
                            let tank = currentCell.piece;
                            if (
                                (tank.orientation%2 == 0 && updateVector[1])
                                ||
                                (tank.orientation%2 == 1 && updateVector[0])
                            ){
                                // Horizontal or vertical pass through
                                passThrough();

                            } else {
                                // Delete the bullet
                                bullet.remove();
                            }

                        } else if (currentCell.piece.type == 'r'){
                            // Rico - deflect
                            let rico = currentCell.piece.orientation

                            if(rico % 2 == 0){
                                // Rico: \
                                if (updateVector[0]){
                                    updateVector[1] = updateVector[0];
                                    updateVector[0] = 0;
                                } else {
                                    updateVector[0] = updateVector[1];
                                    updateVector[1] = 0;
                                }
                            } else {
                                // Rico: /
                                if (updateVector[1]){
                                    updateVector[0] = -updateVector[1];
                                    updateVector[1] = 0;
                                } else {
                                    updateVector[1] = -updateVector[0];
                                    updateVector[0] = 0;
                                }
                            }

                            AudioDict.bounce.play();
                            passThrough();

                        } else if (currentCell.piece.type == 's'){
                            // Semirico - deflect from only 2 sides
                            let srico = currentCell.piece.orientation
                            /**
                                0: -x -> -y ; +y -> +x
                                1: +x -> -y ; +y -> -x
                                2: +x -> +y ; -y -> -x
                                3: -x -> +y ; -y -> +x
                            **/
                            if (srico % 2 == 0){
                                // 0 or 2
                                if (
                                    srico == 0 && (updateVector[0] < 0 || updateVector[1] > 0)
                                    ||
                                    srico == 2 && (updateVector[0] > 0 || updateVector[1] < 0)
                                ){
                                    if (updateVector[0]){
                                        updateVector[1] = updateVector[0];
                                        updateVector[0] = 0;
                                    } else {
                                        updateVector[0] = updateVector[1];
                                        updateVector[1] = 0;
                                    }

                                    AudioDict.bounce.play();
                                    passThrough();

                                } else {
                                    document.getElementById(currentCell.piece.id).remove();
                                    Pieces[currentCell.piece.id] = null;
                                    currentCell.piece = null;

                                    AudioDict.destroy.play();
                                    bullet.remove();
                                }

                            } else {
                                // 1 or 3
                                if (
                                    srico == 1 && (updateVector[0] > 0 || updateVector[1] > 0)
                                    ||
                                    srico == 3 && (updateVector[0] < 0 || updateVector[1] < 0)
                                ){
                                    if (updateVector[0]){
                                        updateVector[1] = -updateVector[0];
                                        updateVector[0] = 0;
                                    } else {
                                        updateVector[0] = -updateVector[1];
                                        updateVector[1] = 0;
                                    }
                                    
                                    AudioDict.bounce.play();
                                    passThrough();

                                } else {
                                    document.getElementById(currentCell.piece.id).remove();
                                    Pieces[currentCell.piece.id] = null;
                                    currentCell.piece = null;

                                    AudioDict.destroy.play();
                                    bullet.remove();
                                }
                            }

                        } else if (currentCell.piece.type == 'c'){
                            // Opponents cannon - pass through
                            passThrough();
                        }

                    } else {
                        // Bullet hits empty cell, continue propogating

                        // Check if the next cell is rico or semirico
                        let nextVector = [
                            currentVector[0] + updateVector[0],
                            currentVector[1] + updateVector[1]
                        ]
                        let nextCell = Cells[nextVector[0] + '-' + nextVector[1]];
                        if (nextCell && nextCell.piece && (nextCell.piece.type == 's' || nextCell.piece.type == 'r')){
                            // Make bullet go to middle of that point
                            deflectors = true;
                        }

                        passThrough();
                    }
    
                } else {
                    // Bullet hits outside board, delete
                    bullet.remove();
                }
            }
        }

        // Initial shoot
        updateVector[0] = this.orientation ? 1 : -1;
        requestAnimationFrame(animateBullet);

    }
}

//--------------------------------------------------------------------------------
// Left/Right rotation button click event handlers

lButton.addEventListener('click', () => {
    // Left
    if (selectedCell && selectedCell.piece){

        // History
        let historyEntry = {
            team: selectedCell.piece.team,
            type: selectedCell.piece.type,
            orientation: {
                old: selectedCell.piece.orientation,
                new: (selectedCell.piece.orientation + 1) % 4
            },
        }
        updateHistory(historyEntry);

        // Board changes
        selectedCell.piece.orientation = (selectedCell.piece.orientation + 1) % 4;
        document.getElementById(selectedCell.piece.id).style.transform = `rotate(${selectedCell.piece.orientation * 90}deg)`;
        
        for (let cellId in prevLegalMoves){
            // Removes prev green squares
            document.getElementById(prevLegalMoves[cellId]).className = 'cell';
        }

        AudioDict.rotate.play();
        prevLegalMoves = []
        switchTurns()
    }
});

rButton.addEventListener('click', () => {
    // Right
    if (selectedCell && selectedCell.piece){
        
        // History
        let historyEntry = {
            team: selectedCell.piece.team,
            type: selectedCell.piece.type,
            orientation: {
                old: selectedCell.piece.orientation,
                new: (selectedCell.piece.orientation + 3) % 4
            },
        }
        updateHistory(historyEntry);

        // Board changes
        selectedCell.piece.orientation = (selectedCell.piece.orientation + 3) % 4;
        document.getElementById(selectedCell.piece.id).style.transform = `rotate(${selectedCell.piece.orientation * 90}deg)`;
    
        for (let cellId in prevLegalMoves){
            // Removes prev green squares
            document.getElementById(prevLegalMoves[cellId]).className = 'cell';
        }

        AudioDict.rotate.play();
        prevLegalMoves = []
        switchTurns()
    }
});

//--------------------------------------------------------------------------------
// Timer

// Timer code
const blueButton = document.getElementById('blueButton');
const redButton = document.getElementById('redButton');

let blueInterval, redInterval;

function startBlueTimer() {
    clearInterval(redInterval);
    blueButton.disabled = false;
    redButton.disabled = true;

    blueInterval = setInterval(() => {
        if (!paused){
            blueTime--;
            AudioDict.clock1.play();
            updateButtonDisplay(blueButton, blueTime);

            if (blueTime <= 0) {
                playerWin('Red');
                clearInterval(blueInterval);
            }
        }
    }, 1000);
}

function startRedTimer() {
    clearInterval(blueInterval);
    blueButton.disabled = true;
    redButton.disabled = false;

    redInterval = setInterval(() => {
        if (!paused){
            redTime--;
            AudioDict.clock1.play();
            updateButtonDisplay(redButton, redTime);

            if (redTime <= 0) {
                playerWin('Blue');
                clearInterval(redInterval);
            }
        }
    }, 1000);
}

function updateButtonDisplay(buttonElement, time) {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    buttonElement.textContent = `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

function updateHistory(entry){
    HistoryList.push(entry);

    // Update history on screen
    let entryText

    if (entry.position){
        // Position change
        entryText = 
            pieceTable[entry.team + entry.type].slice(2).charAt(0).toUpperCase() 
            + pieceTable[entry.team + entry.type].slice(2).slice(1)
            + '<br>'
            + '(' + String(entry.position.old[1] + 1) + ', ' + String(entry.position.old[0] + 1) + ')'
            + ' &rarr; '
            + '(' + String(entry.position.new[1] + 1) + ', ' + String(entry.position.new[0] + 1) + ')';
    
    } else {
        // Orientation change
        function getOrien(orien){
            switch (orien){
                case 0:
                    return 'North';
                case 1:
                    return 'East';
                case 2:
                    return 'South';
                case 3:
                    return 'West';
            }
        }

        entryText = 
            pieceTable[entry.team + entry.type].slice(2).charAt(0).toUpperCase() 
            + pieceTable[entry.team + entry.type].slice(2).slice(1)
            + '<br>'
            + getOrien(entry.orientation.old)
            +' &rarr; '
            + getOrien(entry.orientation.new);
            
    }

    const history = document.getElementById(`history-${entry.team}`);
    const historyEntry = document.createElement('div');
    historyEntry.className = 'history-entry';
    historyEntry.innerHTML = entryText;
    history.appendChild(historyEntry);
}

function playerWin(p){
    // When a player wins
    paused = true;

    const overlay = document.getElementById('overlay');
    const overlayText = document.getElementById('overlay-text');
    const pauseResumeOverlay = document.getElementById('pauseResumeOverlay');

    overlay.style.display = 'block';
    overlayText.innerHTML = `${p} has won!`;
    AudioDict.win.play();

    pauseResumeOverlay.remove();

    localStorage.setItem('History', HistoryList);
}

//--------------------------------------------------------------------------------

function shootCannon() {
    for (i in Pieces) {
        Pieces[i].shoot();
    }
}

function controls(){
    const pauseResumeBtn = document.getElementById('pauseResumeBtn');
    const pauseResumeOverlay = document.getElementById('pauseResumeOverlay');
    const overlay = document.getElementById('overlay');

    pauseResumeBtn.addEventListener('click', () => {
        if (!paused) {
            paused = true;
            pauseResumeBtn.innerHTML = '<i class="fas fa-play"></i>';
            overlay.style.display = 'block';
        } else {
            paused = false;
            pauseResumeBtn.innerHTML = '<i class="fas fa-pause"></i>';
            overlay.style.display = 'none';
        }

        AudioDict.click.play();
    });

    pauseResumeOverlay.addEventListener('click', () => {
        paused = false;
        overlay.style.display = 'none';

        pauseResumeBtn.innerHTML = '<i class="fas fa-pause"></i>';

        AudioDict.click.play();
    });

    resetBtn.addEventListener('click', () => {
        resetBoard();
        AudioDict.click.play();
    });
}

function switchTurns(){
    // Switches turns to the other team
    shootCannon();

    if (Turn == 'b'){
        Turn = 'r';
        startRedTimer();
    } else if (Turn == 'r'){
        Turn = 'b';
        startBlueTimer();
    }

    lButton.disabled = true;
    rButton.disabled = true;
}

function generateGrid() {
    // Create 8x8 grid full of buttons using cell class
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {

            let cell = new Cell(i, j);
            let elem = cell.element();

            Cells[cell.id] = cell;

            elem.addEventListener('click', () => {
                // The cell is clicked
                let legalMoves = cell.getLegal();

                if (prevLegalMoves.includes(cell.id)){
                    // Perform a move since the legal cell is clicked

                    // Entering history
                    let historyEntry = {
                        team: selectedCell.piece.team,
                        type: selectedCell.piece.type,
                        position: {
                            old: selectedCell.piece.position,
                            new: [i, j]
                        },
                    }
                    updateHistory(historyEntry);

                    if (selectedCell.piece.type == 'r' && cell.piece){
                        // Rico trying to switch with a piece
                        let selectedPiece = selectedCell.piece;

                        let temp = Array.from(selectedCell.piece.position)
                        selectedCell.piece.position = [i, j];
                        cell.piece.position = temp;

                        //---
                        // Movement process on board
                        document.getElementById(cell.piece.id).remove();
                        document.getElementById(selectedCell.piece.id).remove();
                        let elemC = cell.piece.element();
                        let elemS = selectedPiece.element();
                        document.getElementById(`${cell.piece.position[0]}-${cell.piece.position[1]}`).appendChild(elemC);
                        document.getElementById(`${selectedPiece.position[0]}-${selectedPiece.position[1]}`).appendChild(elemS);
                        //--- 

                        temp = selectedCell.piece
                        selectedCell.piece = cell.piece;
                        cell.piece = temp;

                    } else {
                        // Performing move
                        selectedCell.piece.position = [i, j];
                        cell.piece = selectedCell.piece;
    
                        // Movement process on board (might later add animation)
                        document.getElementById(cell.piece.id).remove();
                        let elem = cell.piece.element();
                        document.getElementById(`${i}-${j}`).appendChild(elem);
                        
                        selectedCell.piece = null;
                    }

                    AudioDict.move.play();
                    switchTurns();

                    // Removes prev green squares
                    for (let cellId in prevLegalMoves){
                        document.getElementById(prevLegalMoves[cellId]).className = 'cell';
                    }
                    prevLegalMoves = [];
                    selectedCell = null;

                } else {
                    selectedCell = cell;

                    // Makes valid Cells green
                    for (let cellId in prevLegalMoves){
                        // Removes prev green squares and disables buttons
                        document.getElementById(prevLegalMoves[cellId]).className = 'cell';

                        lButton.disabled = true;
                        rButton.disabled = true; 
                    }
                    prevLegalMoves = []
                    
                    if (!cell.piece || cell.piece.team != Turn) return false; // Ignore if wrong team's turn

                    for (let cellId in legalMoves) {
                        // Adds green squares
                        document.getElementById(legalMoves[cellId]).className = 'cell cell-legal'
                        prevLegalMoves.push(legalMoves[cellId]);
                    }

                    if (cell.piece && canRotate[cell.piece.type]){
                        // Enable L/R buttons
                        lButton.disabled = false;
                        rButton.disabled = false;                        
                    }

                    if (legalMoves.length == 0) selectedCell = null;
                }

            });
        }
    }
}

function initializePosition(){
    // Initializes starting position and orientation of pieces
    for(var i = 0; i <8; i++){
        for(var j = 0; j < 8; j++){
            if (!initialPosition[i][j]) continue;

            let entry = initialPosition[i][j];
            
            let piece = new Piece(
                entry[1], 
                entry[0], 
                i, j, 
                entry[2] ? Number(entry[2]) : 0
            );

            let elem = piece.element();
            document.getElementById(`${i}-${j}`).appendChild(elem);

            Pieces[piece.id] = piece;
            Cells[i + '-' + j].piece = piece;
        }
    }
}

function resetBoard(){
    // Clear the board
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            if (Cells[i + '-' + j].piece){
                let id = Cells[i + '-' + j].piece.id;

                Pieces[id] = null;
                document.getElementById(id).remove();
                Cells[i + '-' + j].piece = null;
            }
        }
    } 
    // Init board
    initializePosition();

    // Reset values
    const pauseResumeBtn = document.getElementById('pauseResumeBtn');
    const pauseResumeOverlay = document.getElementById('pauseResumeOverlay');
    const overlay = document.getElementById('overlay');

    paused = false;
    Turn = 'b';
    prevLegalMoves = [];
    selectedCell = null;
    pauseResumeBtn.innerHTML = '<i class="fas fa-pause"></i>';
    overlay.style.display = 'none';

    // Create resume button in ovelay
    if (!document.getElementById('pauseResumeOverlay')){
        const resumeBtn = document.createElement('button');
        resumeBtn.id ='pauseResumeOverlay';
        resumeBtn.className = 'icon';
        resumeBtn.title = 'Resume';
        resumeBtn.innerHTML = '<i class="fas fa-play"></i>';
        document.getElementById('overlay-content').insertBefore(resumeBtn, document.getElementById('resetBtn'));
    }
    document.getElementById('overlay-text').innerHTML = 'Game paused';

    // Reset the timer
    blueTime = blueInitTime;
    redTime = redInitTime;
    updateButtonDisplay(blueButton, blueTime);
    updateButtonDisplay(redButton, redTime);
    clearInterval(blueInterval);
    clearInterval(redInterval);

    // Clear history
    HistoryList = [];
    const history_b = document.getElementById('history-b');
    while (history_b.firstChild){
        history_b.removeChild(history_b.firstChild);
    }
    const history_r = document.getElementById('history-r');
    while (history_r.firstChild){
        history_r.removeChild(history_r.firstChild);
    }
    
}

//----------------------------------------------------------------
// Runs after loading
document.addEventListener('DOMContentLoaded', function(){
    generateGrid();
    initializePosition();

    // Initialize button display
    updateButtonDisplay(blueButton, blueTime);
    updateButtonDisplay(redButton, redTime); 
    controls();
});

//----------------------------------------------------------------
