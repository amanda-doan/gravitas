let JumpState = function() {
    let isJumping = false;
    let jumpCount = 0;
    let lastTwoJumpFrames = [false, false];
    
    const maxJumpFrames = 10;
    const jumpVelocity = 300;
    
    function update(player) {
        lastTwoJumpFrames = [lastTwoJumpFrames[1], this.isJumping];
        this.isJumping = !player.isTouchingBottom;
    }
    
    function recentlyJumped() {
        return (lastTwoJumpFrames[0] || lastTwoJumpFrames[1]);
    }
    
    function doJumpPhysics(game, player) {
        if (game.input.keyboard.isDown(Phaser.KeyCode.W) && player.isTouchingBottom && player.body.touching.down && ! player.isTouchingTop && ! this.isJumping) {
            player.body.velocity.y = -jumpVelocity;
            jumpCount = 0;
            this.isJumping = true;
            // If you're trying to go in a direction opposite the one you're going,
            //      you kick off the ground to change direction quickly
            if(game.input.keyboard.isDown(Phaser.KeyCode.A) && player.body.velocity.x > 0){
                    player.body.velocity.x *=-0.5;
            }
            if(game.input.keyboard.isDown(Phaser.KeyCode.D) && player.body.velocity.x < 0){
                player.body.velocity.x *=-0.5;
            }
            
            let jumpSound = game.add.audio('jump4');
            jumpSound.volume = 0.1;
            jumpSound.play();

        }
        //Let user jump higher if they hold the button down
        if (jumpCount < maxJumpFrames) {
            if (game.input.keyboard.isDown(Phaser.KeyCode.W)) {
                player.body.velocity.y -= jumpVelocity/(maxJumpFrames - 3)
            } else {
                jumpCount = maxJumpFrames;
            }

        }

        jumpCount += 1;
    }  
    
    
    return {
        isJumping: isJumping,
        update: update,
        recentlyJumped: recentlyJumped,
        doJumpPhysics: doJumpPhysics,

    }
};