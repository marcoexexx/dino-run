const $ = (...args) => window.document.querySelector(args);

// Game score
let score = 0;

// Sprites
const SPRITE_SHEET = new Image();
SPRITE_SHEET.src = "/sprite.png";

const DINO_SPRITES = [
  { x: 1337, y: 0, width: 90, height: 96 },
  { x: 1425, y: 0, width: 90, height: 96 },
  { x: 1513, y: 0, width: 90, height: 96 },
  { x: 1602, y: 0, width: 90, height: 96 },
  // { x: 1690, y: 0, width: 90, height: 96 },
];

const TREE_SPRITES = [
  { x: 651, y: 1, width: 53, height: 102 },
  { x: 701, y: 1, width: 53, height: 102 },
  { x: 851, y: 1, width: 102, height: 102 },
];

/** @type{HTMLCanvasElement} */
let canvas = $("#gameCanvas");
if (!canvas) throw new Error("Not found canvas element");

let ctx = canvas.getContext("2d");
if (!ctx) throw new Error("Unable to get context from canvas");

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// Define ECS components and systems
class Entity {
  constructor() {
    this.components = {};
  }

  addComponent(component) {
    this.components[component.constructor.name] = component;
  }

  getComponent(componentClass) {
    return this.components[componentClass.name];
  }
}

class System {
  /** @param {Entity[]} entities  */
  update(entities) {
    throw new Error(`not_impl: ${{ entities }}`);
  }
}

// Components
class Position {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

class Velocity {
  constructor(dx, dy) {
    this.dx = dx;
    this.dy = dy;
  }
}

class Renderable {
  constructor(color, width, height, frames = null) {
    this.color = color;
    this.width = width;
    this.height = height;
    this.frames = frames;
    this.currentFrame = 0;
    this.frameCount = frames ? frames.length : 0;
  }
}

// Systems
class MovementSystem extends System {
  update(entities) {
    entities.forEach(entity => {
      const position = entity.getComponent(Position);
      const velocity = entity.getComponent(Velocity);
      if (position && velocity) {
        position.x += velocity.dx;
        position.y += velocity.dy;
      }
    });
  }
}

class RenderSystem extends System {
  constructor() {
    super();
    this.frameDelay = 5;
    this.frameCounter = 0;
  }

  update(entities) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    entities.forEach(entity => {
      const position = entity.getComponent(Position);
      const renderable = entity.getComponent(Renderable);
      if (position && renderable) {
        if (renderable.frames !== null) {
          const frame = renderable.frames[renderable.currentFrame];
          ctx.drawImage(
            SPRITE_SHEET,
            frame.x,
            frame.y,
            frame.width,
            frame.height,
            position.x,
            position.y,
            renderable.width,
            renderable.height,
          );
        } else {
          ctx.fillStyle = renderable.color;
          ctx.fillRect(position.x, position.y, renderable.width, renderable.height);
        }
      }
    });

    this.frameCounter += 1;
    if (this.frameCounter >= this.frameDelay) {
      entities.forEach(entity => {
        const renderable = entity.getComponent(Renderable);
        if (renderable && renderable.frames) {
          renderable.currentFrame = (renderable.currentFrame + 1) % renderable.frameCount;
        }
      });
      this.frameCounter = 0;
    }
  }
}

class JumpSystem extends System {
  update(entities) {
    entities.forEach(entity => {
      const position = entity.getComponent(Position);
      const velocity = entity.getComponent(Velocity);
      if (position && velocity) {
        if (isJumping) {
          position.y += jumpVelocity;
          jumpVelocity += gravity;
          if (position.y >= canvas.height - 150) {
            position.y = canvas.height - 150;
            isJumping = false;
            jumpVelocity = 0;
          }
        }
      }
    });
  }
}

class CollisionSystem extends System {
  update(entities) {
    const playerPosition = player.getComponent(Position);
    const playerRenderable = player.getComponent(Renderable);

    entities.forEach(entity => {
      if (entity !== player) {
        const position = entity.getComponent(Position);
        const renderable = entity.getComponent(Renderable);
        if (position && renderable) {
          if (
            playerPosition.x < position.x + renderable.width
            && playerPosition.x + playerRenderable.width > position.x
            && playerPosition.y < position.y + renderable.height
            && playerPosition.y + playerRenderable.height > position.y
          ) {
            let tryArain = confirm("Game Over!");
            if (tryArain) {
              window.location.reload();
              score = 0;
            }
          }
        }
      }
    });
  }
}

// Add input handling for jumping
let isJumping = false;
let jumpVelocity = 0;
const gravity = 0.5;

// Create entities
const player = new Entity();
player.addComponent(new Position(500, canvas.height - 150));
player.addComponent(new Velocity(0, 0));
player.addComponent(new Renderable(null, 50, 50, DINO_SPRITES));

const ground = new Entity();
ground.addComponent(new Position(0, canvas.height - 100));
ground.addComponent(new Renderable("brown", canvas.width, 100));

document.addEventListener("keydown", (e) => {
  if (e.code === "Space" && !isJumping) {
    isJumping = true;
    jumpVelocity = -10;
  }
});

// Add obstacle creation and collision detection
function createObstacle() {
  const obstacle = new Entity();
  obstacle.addComponent(new Position(canvas.width, canvas.height - 150));
  obstacle.addComponent(new Velocity(-5, 0));
  obstacle.addComponent(new Renderable(null, 30, 50, [TREE_SPRITES[0]]));
  return obstacle;
}

const obstacles = [];

setInterval(() => {
  obstacles.push(createObstacle());
}, 2000);

// Create systems
const movementSystem = new MovementSystem();
const renderSystem = new RenderSystem();
const jumpSystem = new JumpSystem();
const collisionSystem = new CollisionSystem();

// Game loop
function gameLoop() {
  score += 1;

  movementSystem.update([player, obstacles].flat());
  jumpSystem.update([player]);
  collisionSystem.update([player, obstacles].flat());
  renderSystem.update([player, ground, obstacles].flat());

  requestAnimationFrame(gameLoop);
}

SPRITE_SHEET.onload = () => {
  gameLoop();
};
