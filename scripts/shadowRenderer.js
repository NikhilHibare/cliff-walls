export function drawShadowCone(origin, wallPoint, shadow) {
  if (!game.settings.get("cliff-walls", "debugShadows")) return;

  const g = canvas.controls.debug.clear().lineStyle(2, 0x000000, 0.6);

  g.moveTo(origin.x, origin.y);

  const len = canvas.dimensions.maxR * 1.5;

  g.lineTo(
    origin.x + Math.cos(shadow.start) * len,
    origin.y + Math.sin(shadow.start) * len,
  );

  g.moveTo(origin.x, origin.y);

  g.lineTo(
    origin.x + Math.cos(shadow.end) * len,
    origin.y + Math.sin(shadow.end) * len,
  );
}
