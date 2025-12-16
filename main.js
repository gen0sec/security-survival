class GameScene extends Phaser.Scene {
    create() {
        initThreeWorld();
        initInputHandlers();

        // Keep Phaser's canvas from intercepting input meant for Three.js/DOM
        const canvas = this.game.canvas;
        if (canvas) {
            canvas.style.position = "absolute";
            canvas.style.top = "0";
            canvas.style.left = "0";
            canvas.style.width = "100%";
            canvas.style.height = "100%";
            canvas.style.pointerEvents = "none";
        }
    }

    update(time, delta) {
        const deltaSeconds = delta / 1000;
        tick(deltaSeconds);
    }
}

const phaserConfig = {
    type: Phaser.WEBGL,
    parent: "canvas-container",
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: "rgba(0,0,0,0)",
    transparent: true,
    fps: {
        min: 10,
        target: 60,
    },
    scene: [GameScene],
};

window.PHASER_GAME = new Phaser.Game(phaserConfig);
