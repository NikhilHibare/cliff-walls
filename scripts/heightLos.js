import { blocksVisionByHeight } from "./losMath.js";

Hooks.once("ready", () => {
  console.log("Cliff Walls | Height-based LOS enabled");

  const originalTest = CONFIG.Canvas.losBackend.prototype.testVisibility;

  CONFIG.Canvas.losBackend.prototype.testVisibility = function (
    visionSource,
    target,
    options = {},
  ) {
    const visible = originalTest.call(this, visionSource, target, options);

    if (!visible) return false;

    const token = visionSource.object;
    if (!token) return visible;

    const actor = token.actor;
    if (!actor) return visible;

    const actorHeight =
      actor.getFlag("cliff-walls", "height") ?? token.document.elevation ?? 10;

    const walls = canvas.walls.placeables;

    for (const wall of walls) {
      const top = wall.document.top;
      if (top === null || top === undefined) continue;

      const distance = canvas.grid.measureDistance(token.center, wall.center);

      const blocked = blocksVisionByHeight({
        actorEyeHeight: actorHeight,
        wallTopHeight: top,
        distanceToWall: distance,
      });

      if (blocked) {
        return false;
      }
    }

    return true;
  };
});
