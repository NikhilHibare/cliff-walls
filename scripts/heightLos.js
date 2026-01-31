import { computeShadowInterval } from "./losMath.js";
import { drawShadowCone } from "./shadowRenderer.js";

Hooks.once("ready", () => {
  const originalCreatePolygon =
    CONFIG.Canvas.visionSourceClass.prototype._createPolygon;

  CONFIG.Canvas.visionSourceClass.prototype._createPolygon = function () {
    const polygon = originalCreatePolygon.call(this);
    const token = this.object;
    if (!token || !token.actor) return polygon;

    const actorEyeHeight =
      token.actor.getFlag("cliff-walls", "height") ??
      token.document.elevation ??
      10;

    const walls = canvas.walls.placeables.filter(
      (w) => w.document.flags["cliff-walls"]?.isCliff,
    );

    for (const wall of walls) {
      const top = wall.document.top ?? 0;
      const bottom = wall.document.bottom ?? 0;

      const distance = canvas.grid.measureDistance(token.center, wall.center);

      const shadow = computeShadowInterval({
        actorEyeHeight,
        wallTop: top,
        wallBottom: bottom,
        distance,
      });

      if (!shadow) continue;

      // Clip vision polygon
      polygon.clipAngle(shadow.start, shadow.end);

      // Optional debug rendering
      drawShadowCone(token.center, wall.center, shadow);
    }

    return polygon;
  };
});
