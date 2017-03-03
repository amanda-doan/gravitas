let heightBlocks = 14;
let widthBlocks = 27;
let height = heightBlocks * 30;
let width = widthBlocks * 30;

let game = new Phaser.Game(width, height);
game.state.add('main', {preload: preload, create: create, update: update, render: render});
game.state.start('main');

const gravCoef = 150000;
const frictionCoef = 0.5;
const groundAcceleration = 30;
const airAcceleration = 5;
const maxHorizontalVelocity = 250;
const jumpVelocity = 300;
const jumpFrames = 10;
const startingLevelNum = 0;
const gravObjAttractionMin = 0;
const gravObjAttractionMax = 2 * gravCoef;
const gravObjStartColor = 0xffffff;
const gravObjEndColor = 0x351777;

let player;
let exit;
let walls;
let gravObjects;
let lava_pool;
let cursor;
let levels;
let currentLevelNum;
let graphics;
let clickedObj;
let jumpCount;
let pauseBtn;
let pauseText;

function preload() {
    game.load.image('player', 'assets/player.png');
    game.load.image('exit', 'assets/exit.png');
    game.load.image('wall', 'assets/bricks.png');
    game.load.image('gravObj', 'assets/gravObj.png');
    game.load.image('lava', 'assets/lava.png');
    //game.load.image('slider', 'assets/slider.png');
    //game.load.text('levelsExternal', 'assets/levels.txt');
    game.load.text('levelsNew', 'assets/levelsNew.txt');
}

function create() {
    game.stage.backgroundColor = '#7ac17c';
    game.physics.startSystem(Phaser.Physics.ARCADE);
    game.world.enableBody = true;
    game.canvas.oncontextmenu = function (e) {
        e.preventDefault(); 
    }

    cursor = game.input.keyboard.createCursorKeys();
    pauseBtn = game.input.keyboard.addKey(Phaser.KeyCode.SPACEBAR);
    pauseBtn.onDown.add(function() {
        if (game.physics.arcade.isPaused) {
            pauseText.kill();
        } else {
            pauseText = game.add.text(player.body.position.x + 5, player.body.position.y - 15, "Paused", {fill: "#ffffff"});
            pauseText.anchor.set(.5, .5);
        }
        game.physics.arcade.isPaused = ! game.physics.arcade.isPaused;
    }, this);

    walls = game.add.group();
    gravObjects = game.add.group();
    lava_pool = game.add.group();
    exits = game.add.group();
    
    loadLevelsFromFile();
    
    let selector = $('#level-select');
    currentLevelNum = startingLevelNum;

    graphics = game.add.graphics();

    let atrSelected;
    for(let i = 0; i < levels.length; i++) {
        
        if ( i == currentLevelNum) {
            atrSelected = 'selected';
        } else {
            atrSelected = '';
        }
        
        selector.append('<option ' + atrSelected + ' value="' + i + '">' + i + '</option>');
    }
    
    loadLevel();
}

function loadLevelsFromFile(){
    
    let levelsAll = game.cache.getText('levelsNew').split(';');
    levels = [levelsAll.length];
    for (let i = 0; i < levelsAll.length; i++) {
        levels[i] = levelsAll[i].split('\n')
    }  
}

function clearLevel(){
	walls.removeAll(true);
	lava_pool.removeAll(true);
	gravObjects.removeAll(true);
    exits.removeAll(true);

	// player is undefined on first run
	if (player != undefined) player.kill();
    // exit is undefined on first run
    //if (exit != undefined) exit.kill();
}

function selectLevel(){
	// This would be simpler with jquery
	let levelSelector = document.getElementById("level-select");
	currentLevelNum = levelSelector.options[levelSelector.selectedIndex].value;
	loadLevel();
}

function loadLevel(){
	clearLevel();
    
    let level = levels[currentLevelNum];
    if (level == undefined) {
        level = 'gggggggg';
        console.log("Attempted to load undefined level");
    }
    

    let bounds = level[1].split(',');
    game.world.setBounds(0,0,parseInt(bounds[0]), parseInt(bounds[1]));
    for (let i = 2; i < level.length; i++) {
        let element = level[i];
        let objectInfo = element.split(',');
        let objectName = objectInfo[0];
        let objectX = parseFloat(objectInfo[1]);
        let objectY = parseFloat(objectInfo[2]);
            
        switch(objectName) {
            case 'wall':
                let wall = game.add.sprite(objectX, objectY, objectName);
                walls.add(wall);
                wall.body.immovable = true;
                wall.anchor.set(.5,.5);
                break;
            case 'gravObj_off':
                initializeGravObj(objectX, objectY, false);
                break;
            case 'gravObj_on':
                initializeGravObj(objectX, objectY, true);
                break;
            case 'lava':
                let lava = game.add.sprite(objectX, objectY, objectName);
                lava.anchor.set(.5, .5);
                lava_pool.add(lava);
                break;
            case 'exit':
                let exit = game.add.sprite(objectX, objectY, objectName);
                exit.anchor.set(.5, .5);
                exits.add(exit);
                break;
            default:
                break;
        }
    }

    player = game.add.sprite(50, bounds[1] - 100, 'player');
    player.body.gravity.y = gravCoef / 60;
    game.camera.follow(player);
    
    exit = game.add.sprite(game.world.width - 70, game.world.height - 110, 'exit');
    exit.body.immovable = true;
}

function update() {
    game.physics.arcade.collide(player, walls);
    game.physics.arcade.collide(player, gravObjects);

    game.physics.arcade.overlap(player, lava_pool, restart, null, this);
    
    if (! game.physics.arcade.isPaused){
        if (cursor.left.isDown) {
            if (player.body.touching.down) {
                player.body.velocity.x = Math.max(-maxHorizontalVelocity, player.body.velocity.x - groundAcceleration);
            } else {
                player.body.velocity.x -= airAcceleration;
            }
        } else if (cursor.right.isDown) {
            if (player.body.touching.down) {
                player.body.velocity.x = Math.min(maxHorizontalVelocity, player.body.velocity.x + groundAcceleration);
            } else {
                player.body.velocity.x += airAcceleration;
            }
        } else {
            if (player.body.touching.down) {
                player.body.velocity.x = player.body.velocity.x * frictionCoef;
            }
        }

        if (cursor.up.isDown && player.body.touching.down) {
            player.body.velocity.y = -jumpVelocity;
            jumpCount = 0;
        }
        //Let user jump higher if they hold the button down
        if (jumpCount < jumpFrames) {
            if (cursor.up.isDown) {
                player.body.velocity.y -= jumpVelocity/(jumpFrames - 3)
            } else {
                jumpCount = jumpFrames;
            }

        }

        jumpCount += 1;
    }
    
    // updates level if player reaches exit
    if (player.overlap(exit)) {
        currentLevelNum++;
        loadLevel();
    }

    if (game.input.activePointer.leftButton.isDown && clickedObj != null) {
        clickedObj.gravWeight = Math.min(gravObjAttractionMax, clickedObj.gravWeight + 5000)
    }
    if (game.input.activePointer.rightButton.isDown && clickedObj != null) {
        clickedObj.gravWeight = Math.max(gravObjAttractionMin, clickedObj.gravWeight - 5000)
    }
    
    
    
    let xGravCoef = 0;
    let yGravCoef = 0;

    // Gravity object changes
    for (let i = 0;  i < gravObjects.children.length; i++) {
        let gravObj = gravObjects.children[i];
        
        if (gravObj.gravOn) {
            let diff = Phaser.Point.subtract(player.position, gravObj.position);
            let r = diff.getMagnitude();
            diff.normalize();

            xGravCoef += gravObj.gravWeight * diff.x / r;
            yGravCoef += gravObj.gravWeight * diff.y / r;
        }
        
        //displays weight of gravity objects
        //game.debug.text(obj.gravWeight/1000, obj.position.x - 15, obj.position.y - 15);
    }
    player.body.acceleration.x = -xGravCoef;
    player.body.acceleration.y = -yGravCoef;
}

function render() {
    graphics.clear();
    for (let i = 0; i < gravObjects.children.length; i++) {
        drawGravObjCircle(gravObjects.children[i]);
    }
}

function drawGravObjCircle(gravObj) {
    // these are heuristic constants which look okay
    if (gravObj.gravOn) {
        let radius = gravObj.gravWeight / gravCoef * 150;
        let subAmount = gravObjAttractionMax / gravCoef * 25;
        let alpha = 0.2;
        let fillColor = gravObj.gravOn ? 0x351777 : 0x808080;
        while (radius > 0) {
            graphics.beginFill(fillColor, alpha);
            graphics.drawCircle(gravObj.x, gravObj.y, radius);
            graphics.endFill();
            radius -= subAmount;
            alpha += 0.7 * alpha * (1 - alpha); // logistically increase alpha
        }
    }
}

function restart() {
    loadLevel();
}

function initializeGravObj(x, y, gravOn) {
    let gravObj = game.add.sprite(x, y, 'gravObj');

    gravObj.anchor.set(.5, .5);
    gravObj.gravOn = true ;
    gravObj.gravWeight = gravCoef * gravOn;
    gravObjects.add(gravObj);
    gravObj.body.immovable = true;
    gravObj.inputEnabled = true;
    gravObj.events.onInputDown.add(toggleGravity, this);
    gravObj.events.onInputUp.add(endClick, this);
    gravObj.tint = 0x351777;
}

function toggleGravityAll() {

    for (let i = 0;  i < gravObjects.children.length; i++) {
        let gravObj = gravObjects.children[i];
        gravObj.gravOn = !gravObj.gravOn;
    }
}

function toggleGravity(gravObj) {

    clickedObj = gravObj;
}

function endClick(gravObj) {
    clickedObj = null;
}