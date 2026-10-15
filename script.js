// FoundIt website frontend
const API_CONFIG = { baseUrl: "", listItemsEndpoint: "/api/items", createItemEndpoint: "/api/items" };

const demoItems = [
  {id:"FI-1024",type:"lost",name:"Blue water bottle",category:"other",location:"Main college library",date:"Today",description:"Blue insulated bottle with a small white sticker on the side.",emoji:"🧴",bg:"#e5edff"},
  {id:"FI-1023",type:"found",name:"Black backpack",category:"bags",location:"Computer science block",date:"Today",description:"Black backpack found near the staircase. Owner can identify the contents.",emoji:"🎒",bg:"#e8e8ff"},
  {id:"FI-1022",type:"lost",name:"Wireless earbuds case",category:"electronics",location:"College canteen",date:"Yesterday",description:"White earbuds case. The earbuds may or may not be inside.",emoji:"🎧",bg:"#fff0d7"},
  {id:"FI-1021",type:"found",name:"Student ID card",category:"documents",location:"Near the main entrance",date:"Yesterday",description:"A student ID card was found. Contact the admin desk to verify ownership.",emoji:"🪪",bg:"#dff8ed"},
  {id:"FI-1020",type:"lost",name:"Silver keychain",category:"other",location:"Parking area",date:"12 Oct",description:"Small silver keychain with two keys and a round blue tag.",emoji:"🔑",bg:"#fce8e4"},
  {id:"FI-1019",type:"found",name:"Scientific calculator",category:"electronics",location:"Exam hall corridor",date:"11 Oct",description:"Dark-coloured scientific calculator found after class.",emoji:"🧮",bg:"#e4f4f4"}
];
let items = [...demoItems];
let activeType = "all";
let query = "";
let category = "all";
let selectedPhoto = "";
const MATCH_WATCH_KEY = "foundit-seven-day-watches";
let pollingForMatches = false;

const $ = (id) => document.getElementById(id);
const itemGrid = $("itemGrid");
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const categoryName = (value) => ({electronics:"Electronics",phones:"Mobile phones",chargers:"Chargers",gold_chains:"Gold chains",rings:"Rings",id_cards:"ID cards",water_bottles:"Water bottles",bags:"Bags & accessories",documents:"Documents",other:"Other"}[value] || "Other");

function filteredItems() {
  const q = query.trim().toLowerCase();
  return items.filter(item => {
    const matchesType = activeType === "all" || item.type === activeType;
    const matchesCategory = category === "all" || item.category === category;
    const haystack = `${item.name} ${item.location} ${item.description} ${item.category}`.toLowerCase();
    return matchesType && matchesCategory && (!q || haystack.includes(q));
  });
}
function renderItems() {
  const visible = filteredItems();
  itemGrid.innerHTML = visible.map(item => `
    <article class="item-card">
      <div class="item-art${item.photo ? " has-photo" : ""}" style="background:${item.bg || "#eef1ff"}">
        <span class="item-status ${item.returned ? "status-returned" : item.type === "lost" ? "status-lost" : "status-found"}">${item.returned ? "returned" : item.type}</span>
        ${item.photo ? `<img class="item-photo" src="${item.photo}" alt="Photo of ${escapeHtml(item.name)}" />` : `<span class="item-emoji" aria-hidden="true">${escapeHtml(item.emoji || "??")}</span>`}
      </div>
      <div class="item-body">
        <div class="item-title-row"><h3 class="item-title">${escapeHtml(item.name)}</h3><span class="item-category">${escapeHtml(categoryName(item.category))}</span></div>
        <div class="item-location"><span>⌖</span>${escapeHtml(item.location)}</div>
        ${item.type === "found" && item.handoffLocation ? `<div class="item-pickup">Pickup: ${escapeHtml(item.handoffLocation)}</div>` : ""}
        <div class="item-date">${escapeHtml(item.date || "Date not specified")}</div>
        <p class="item-description">${escapeHtml(item.description || "No extra description provided.")}</p>
        <div class="card-footer"><span class="ref-code">REF · ${escapeHtml(item.id)}</span><button class="details-btn" data-detail="${escapeHtml(item.id)}">View details ↗</button></div>
      </div>
    </article>`).join("");
  $("emptyState").classList.toggle("hidden", visible.length !== 0);
  itemGrid.classList.toggle("hidden", visible.length === 0);
  $("resultsCount").textContent = `Showing ${visible.length} item${visible.length === 1 ? "" : "s"}`;
  $("allCount").textContent = items.length;
  $("lostCount").textContent = items.filter(i => i.type === "lost").length;
  $("foundCount").textContent = items.filter(i => i.type === "found").length;
}
function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 3000);
}
function matchScore(a, b) {
  if (a.type === b.type) return 0;
  const stopWords = new Set(["the","and","with","from","near","item","found","lost","someone","this","that","for","has","have","was","are"]);
  const words = value => new Set(String(value || "").toLowerCase().match(/[a-z0-9]+/g)?.filter(w => w.length > 2 && !stopWords.has(w)) || []);
  const aWords = words(`${a.name} ${a.description}`), bWords = words(`${b.name} ${b.description}`);
  const overlap = [...aWords].filter(w => bWords.has(w)).length;
  const union = new Set([...aWords, ...bWords]).size;
  let score = union ? overlap / union : 0;
  if (a.category && a.category === b.category) score += 0.2;
  const aName = words(a.name), bName = words(b.name);
  if ([...aName].some(w => bName.has(w))) score += 0.2;
  return Math.min(score, 1);
}
function findMatches(item) {
  return items.filter(other => other.id !== item.id && other.type !== item.type)
    .map(other => ({item: other, score: matchScore(item, other)}))
    .filter(match => match.score >= 0.25)
    .sort((a, b) => b.score - a.score).slice(0, 3);
}
function getLostWatches() {
  try { return JSON.parse(localStorage.getItem(MATCH_WATCH_KEY) || "[]"); }
  catch { return []; }
}
function saveLostWatches(watches) {
  try { localStorage.setItem(MATCH_WATCH_KEY, JSON.stringify(watches)); }
  catch { showToast("Could not save this alert on this browser."); }
}
function watchLostReport(item) {
  const createdAt = Date.parse(item.createdAt) || Date.now();
  const watches = getLostWatches().filter(watch => watch.expiresAt > Date.now());
  if (!watches.some(watch => watch.id === item.id)) {
    watches.push({id:item.id, name:item.name, description:item.description, category:item.category,
      createdAt, expiresAt:createdAt + 7 * 24 * 60 * 60 * 1000, notifiedFoundIds:[]});
  }
  saveLostWatches(watches);
}
function alertLostOwner(watch, found) {
  const message = `Found report “${found.name}” may match your lost ${watch.name}.`;
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      const notification = new Notification("FoundIt: possible match", {body:message, tag:`foundit-${watch.id}-${found.id}`});
      notification.onclick = () => {
        window.focus();
        $("searchInput").value = found.name;
        query = found.name; category = "all"; activeType = "found";
        renderItems();
        document.querySelectorAll(".filter-tab").forEach(btn => btn.classList.toggle("active", btn.dataset.type === "found"));
        $("browse").scrollIntoView({behavior:"smooth"});
        notification.close();
      };
      return;
    } catch (error) { console.warn("Browser notification failed:", error); }
  }
  showToast(message);
}
function checkFoundReports(reports) {
  const now = Date.now();
  const watches = getLostWatches().filter(watch => watch.expiresAt > now);
  let changed = watches.length !== getLostWatches().length;
  for (const watch of watches) {
    watch.notifiedFoundIds ||= [];
    for (const found of reports) {
      const createdAt = Date.parse(found.createdAt || "");
      if (found.type !== "found" || !createdAt || createdAt < watch.createdAt || createdAt > watch.expiresAt ||
          watch.notifiedFoundIds.includes(found.id) || matchScore(watch, found) < 0.25) continue;
      watch.notifiedFoundIds.push(found.id);
      changed = true;
      alertLostOwner(watch, found);
    }
  }
  if (changed) saveLostWatches(watches);
}
async function pollForMatches() {
  if (pollingForMatches) return;
  pollingForMatches = true;
  try {
    const response = await fetch(API_CONFIG.listItemsEndpoint, {cache:"no-store"});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const reports = await response.json();
    if (!Array.isArray(reports)) return;
    items = [...reports, ...demoItems.filter(demo => !reports.some(saved => saved.id === demo.id))];
    renderItems();
    checkFoundReports(reports);
  } catch (error) { console.debug("Match alert check skipped:", error.message); }
  finally { pollingForMatches = false; }
}
function updatePhotoPreview() {
  const wrap = $("photoPreviewWrap");
  wrap.classList.toggle("hidden", !selectedPhoto);
  if (selectedPhoto) $("photoPreview").src = selectedPhoto;
}
function openReport(type = "lost") {
  $("reportModal").classList.remove("hidden");
  const radio = document.querySelector(`input[name="reportType"][value="${type}"]`);
  if (radio) radio.checked = true;
  updatePhoneFields();
  document.body.style.overflow = "hidden";
  setTimeout(() => $("itemName").focus(), 60);
}
function updatePhoneFields() {
  const lost = document.querySelector('input[name="reportType"]:checked').value === "lost";
  $("lostPhoneGroup").classList.toggle("hidden", !lost);
  $("recipientPhoneGroup").classList.toggle("hidden", lost);
  $("handoffLocationGroup").classList.toggle("hidden", lost);
  $("itemRegisteredPhone").required = lost;
  $("itemRecipientPhone").required = !lost;
}
function normalizePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15 ? digits : "";
}
function verifyHandoff(newItem) {
  const found = newItem.type === "found" ? newItem : items.find(item => item.type === "found" && !item.returned && item.recipientPhone);
  const lost = newItem.type === "lost" ? newItem : items.find(item => item.type === "lost" && !item.returned && item.registeredPhone);
  if (!found || !lost || !found.recipientPhone || !lost.registeredPhone || found.recipientPhone !== lost.registeredPhone || matchScore(found, lost) < 0.25) return null;
  found.returned = true;
  lost.returned = true;
  return found === newItem ? lost : found;
}
function closeReport() {
  $("reportModal").classList.add("hidden");
  document.body.style.overflow = "";
}
function applySearch() {
  query = $("searchInput").value;
  category = $("categoryFilter").value;
  renderItems();
}
function useType(type) {
  activeType = type;
  document.querySelectorAll(".filter-tab").forEach(btn => btn.classList.toggle("active", btn.dataset.type === type));
  renderItems();
}

document.querySelectorAll(".filter-tab").forEach(btn => btn.addEventListener("click", () => useType(btn.dataset.type)));
document.querySelectorAll('input[name="reportType"]').forEach(input => input.addEventListener("change", updatePhoneFields));
$("searchBtn").addEventListener("click", applySearch);
$("searchInput").addEventListener("keydown", e => { if (e.key === "Enter") applySearch(); });
$("categoryFilter").addEventListener("change", applySearch);
$("showAllBtn").addEventListener("click", () => { $("searchInput").value = ""; $("categoryFilter").value = "all"; query = ""; category = "all"; useType("all"); showToast("Showing all demo reports."); });
["reportTopBtn","ctaReportBtn","emptyReportBtn"].forEach(id => $(id).addEventListener("click", () => openReport("lost")));
$("lostHeroBtn").addEventListener("click", () => openReport("lost"));
$("foundHeroBtn").addEventListener("click", () => openReport("found"));
$("closeModal").addEventListener("click", closeReport);
$("reportModal").addEventListener("click", e => { if (e.target === $("reportModal")) closeReport(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeReport(); });
$("signInBtn").addEventListener("click", () => showToast("Sign-in will be available after a backend/auth service is connected."));
$("enableAlertsBtn").addEventListener("click", async () => {
  if (!("Notification" in window)) { showToast("This browser does not support desktop notifications."); return; }
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") showToast("Browser alerts enabled. You can track lost reports for seven days.");
    else showToast("Notifications were not allowed. You will only see alerts while this page is visible.");
  } catch { showToast("Could not enable browser notifications in this browser."); }
});
$("privacyBtn").addEventListener("click", e => { e.preventDefault(); showToast("Reports are saved locally by the Node server; phone and email details are private."); });
$("menuToggle").addEventListener("click", () => $("nav").classList.toggle("open"));
$("itemPhoto").addEventListener("change", e => {
  const file = e.target.files?.[0];
  if (!file) { selectedPhoto = ""; updatePhotoPreview(); return; }
  if (!file.type.startsWith("image/")) { e.target.value = ""; showToast("Please choose an image file."); return; }
  if (file.size > 5 * 1024 * 1024) { e.target.value = ""; showToast("Photo must be 5 MB or smaller."); return; }
  const reader = new FileReader();
  reader.onload = () => { selectedPhoto = String(reader.result || ""); updatePhotoPreview(); };
  reader.onerror = () => showToast("Could not read that photo. Try another image.");
  reader.readAsDataURL(file);
});
$("removePhoto").addEventListener("click", () => { selectedPhoto = ""; $("itemPhoto").value = ""; updatePhotoPreview(); });

// The prototype adds reports in memory only; refreshing the page resets them.
$("reportForm").addEventListener("submit", async e => {
  e.preventDefault();
  const type = document.querySelector('input[name="reportType"]:checked').value;
  const name = $("itemName").value.trim();
  const location = $("itemLocation").value.trim();
  if (!name || !location) { showToast("Please enter the item name and location."); return; }
  const dateValue = $("itemDate").value;
  const date = dateValue ? new Date(`${dateValue}T12:00:00`).toLocaleDateString(undefined,{day:"numeric",month:"short"}) : "Date not specified";
  const item = {
    id: `FI-${Math.floor(1000 + Math.random()*9000)}`,
    type, name, location, date, category: $("itemCategory").value,
    handoffLocation: type === "found" ? $("itemHandoffLocation").value.trim() : "",
    description: $("itemDescription").value.trim() || "No extra description provided.",
    photo: selectedPhoto,
    contact: $("itemContact").value.trim(),
    registeredPhone: type === "lost" ? normalizePhone($("itemRegisteredPhone").value) : "",
    recipientPhone: type === "found" ? normalizePhone($("itemRecipientPhone").value) : "",
    emoji: ({electronics:"\u{1F3A7}",phones:"\u{1F4F1}",chargers:"\u{1F50C}",gold_chains:"\u{1F4FF}",rings:"\u{1F48D}",id_cards:"\u{1FAA9}",water_bottles:"\u{1F9F4}",bags:"\u{1F45C}",documents:"\u{1F4C4}",other:"\u{1F4E6}"}[$("itemCategory").value]),
    bg: ({electronics:"#fff0d7",phones:"#e5edff",chargers:"#fff0d7",gold_chains:"#fff4d9",rings:"#fff0e9",id_cards:"#dff8ed",water_bottles:"#e4f4f4",bags:"#e8e8ff",documents:"#dff8ed",other:"#e5edff"}[$("itemCategory").value])
  };
  if ((type === "lost" && !item.registeredPhone) || (type === "found" && !item.recipientPhone)) {
    showToast("Enter a valid phone number (7?15 digits) for return verification."); return;
  }
  const matches = findMatches(item);
  let saved;
  try {
    const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.createItemEndpoint}`, {
      method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(item)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not save the report.");
    saved = result;
  } catch (error) {
    showToast(`Could not save report: ${error.message}. Start the Node server and try again.`);
    return;
  }
  const handedOffItem = saved.handoffVerified;
  if (handedOffItem && saved.matchedItem) {
    const previous = items.find(existing => existing.id === saved.matchedItem.id);
    if (previous) previous.returned = true;
  }
  items.unshift(saved.item);
  if (type === "lost" && !handedOffItem) watchLostReport(saved.item);
  $("reportForm").reset();
  selectedPhoto = ""; updatePhotoPreview();
  closeReport();
  query = ""; category = "all"; $("searchInput").value = ""; $("categoryFilter").value = "all";
  useType("all");
  $("browse").scrollIntoView({behavior:"smooth"});
  const matchMessage = matches.length ? ` Possible match: ${matches[0].item.type} ${matches[0].item.name} (${Math.round(matches[0].score * 100)}% keyword match).` : " No likely match yet; future reports will be checked against it.";
  const handoffMessage = handedOffItem ? " Registered number and item details matched; both reports are marked returned." : "";
  const watchMessage = type === "lost" && !handedOffItem ? " Match alerts will run for seven days while this page is open." : "";
  showToast(`Report saved · ${saved.item.id}.${matchMessage}${handoffMessage}${watchMessage}`);
});

// Optional integration starting point. No network request is made until you add a base URL and endpoints.
async function loadItemsFromBackend() {
  try {
    const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.listItemsEndpoint}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (Array.isArray(data)) {
      items = [...data, ...demoItems.filter(demo => !data.some(saved => saved.id === demo.id))];
      renderItems();
      checkFoundReports(data);
    }
  } catch (error) {
    console.error("Could not load backend items:", error);
    showToast("Backend unavailable. Start server.js to load and save reports.");
  }
}
renderItems();
loadItemsFromBackend();
setInterval(pollForMatches, 15000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) pollForMatches(); });
