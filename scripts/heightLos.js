import { computeShadowInterval } from "./losMath.js";
import { drawShadowCone } from "./shadowRenderer.js";

Hooks.once("ready", () => {
  const VisionSource = CONFIG.Canvas.visionSourceClass;
  const originalCreatePolygon = VisionSource.prototype._createPolygon;

  VisionSource.prototype._createPolygon = function () {
    const polygon = originalCreatePolygon.call(this);
    const token = this.object;
    if (!token || !token.actor) return polygon;

    // ✅ STRICT LOS HEIGHT RULE
    const elevation = token.document.elevation ?? 0;
    if (elevation <= 0) return polygon; // FULL BLOCK, no shadow math

    const eyeHeight = token.actor.getFlag("cliff-walls", "height") ?? 6;

    const actorEyeHeight = elevation + eyeHeight;

    const walls = canvas.walls.placeables.filter(
      (w) => w.document.flags["cliff-walls"]?.isCliff,
    );

    for (const wall of walls) {
      // ✅ READ WALL HEIGHT FROM FLAGS
      const top = wall.document.flags["cliff-walls"]?.top ?? 0;
      const bottom = wall.document.flags["cliff-walls"]?.bottom ?? 0;

      // 🔴 HARD BLOCK: actor below wall top
      if (actorEyeHeight <= top) {
        polygon.clipWall(wall);
        continue;
      }

      const distance = canvas.grid.measureDistance(token.center, wall.center);

      const shadow = computeShadowInterval({
        actorEyeHeight,
        wallTop: top,
        wallBottom: bottom,
        distance,
        token,
        wall,
      });

      if (!shadow) continue;

      polygon.clipAngle(shadow.start, shadow.end);

      // Optional debug rendering
      drawShadowCone(token.center, wall.center, shadow);
    }

    return polygon;
  };
});
