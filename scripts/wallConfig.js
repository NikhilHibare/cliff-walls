Hooks.on("renderWallConfig", (app, html) => {
  const cliffToggle = `
    <div class="form-group">
      <label>Cliff Wall</label>
      <input type="checkbox" name="flags.cliff-walls.isCliff"/>
    </div>
  `;

  html.find('input[name="top"]').closest(".form-group").after(cliffToggle);
});
