Hooks.once("init", () => {
  console.log("Cliff Walls | Initializing module");

  game.settings.register("cliff-walls", "debugShadows", {
    name: "Debug Shadow Cones",
    hint: "Draws height-based shadow cones for cliff walls (debug / performance cost).",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
  });
});

Hooks.once("ready", () => {
  console.log("Cliff Walls | Ready");
});
