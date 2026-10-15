// Actions for the three interactive cards in the How it works section.
function showSafetyTips() {
  if (document.getElementById("safetyTipsModal")) return;
  const backdrop = document.createElement("div");
  backdrop.id = "safetyTipsModal";
  backdrop.className = "modal-backdrop";
  backdrop.setAttribute("role", "presentation");
  backdrop.innerHTML = `
    <section class="modal safety-modal" role="dialog" aria-modal="true" aria-labelledby="safetyTipsTitle">
      <button class="modal-close" type="button" aria-label="Close">×</button>
      <div class="modal-badge">SAFE HANDOFF</div>
      <h2 id="safetyTipsTitle">Reconnect safely</h2>
      <p class="modal-intro">Take a moment to confirm the item and plan a safe return.</p>
      <ul class="safety-tips">
        <li>Compare the item details and report reference before arranging a handoff.</li>
        <li>Keep registered phone numbers and private contact details off public posts.</li>
        <li>Meet in a public, well-lit place. Bring someone you trust if possible.</li>
        <li>For a high-value item, ask the owner to describe a detail that is not in the public report.</li>
      </ul>
      <button class="btn btn-primary btn-full" type="button" data-close-safety>Got it</button>
    </section>`;
  const onEscape = event => { if (event.key === "Escape") close(); };
  const close = () => {
    backdrop.remove();
    document.removeEventListener("keydown", onEscape);
  };
  backdrop.addEventListener("click", event => { if (event.target === backdrop || event.target.closest(".modal-close, [data-close-safety]")) close(); });
  document.addEventListener("keydown", onEscape);
  document.body.append(backdrop);
  backdrop.querySelector(".modal-close").focus();
}

function activateStep(action) {
  if (action === "report") window.openReport("lost");
  if (action === "browse") document.getElementById("browse").scrollIntoView({behavior:"smooth"});
  if (action === "safety") showSafetyTips();
}

document.querySelectorAll("[data-step-action]").forEach(card => {
  card.addEventListener("click", () => activateStep(card.dataset.stepAction));
  card.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activateStep(card.dataset.stepAction);
    }
  });
});
