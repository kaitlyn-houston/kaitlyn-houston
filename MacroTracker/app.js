(function(){
  "use strict";

  const STORAGE_KEY = "macroTracker.entries.v1";
  const GOALS_KEY = "macroTracker.goals.v1";
  const FAVORITES_KEY = "macroTracker.favorites.v1";
  const API_KEY_STORAGE = "macroTracker.usdaApiKey.v1";
  const GARMIN_KEY = "macroTracker.garminCalories.v1";
  const GARMIN_ACTIVITIES_KEY = "macroTracker.garminActivities.v1";
  const GCAL_CLIENT_ID_KEY = "macroTracker.gcalClientId.v1";
  const GCAL_TOKEN_KEY = "macroTracker.gcalToken.v1";
  const WEIGHT_KEY = "macroTracker.weight.v1";
  const WEIGHT_UNIT_KEY = "macroTracker.weightUnit.v1";
  const THEME_KEY = "macroTracker.theme.v1";
  const DEFAULT_GOALS = { calories: 2000, protein: 150, carbs: 200, fat: 65 };

  const MEALS = [
    { id: "breakfast", label: "Breakfast" },
    { id: "lunch", label: "Lunch" },
    { id: "dinner", label: "Dinner" },
    { id: "snack", label: "Snack" }
  ];

  let currentDate = todayStr();
  let editingEntryId = null;
  let isFavStarred = false;
  let entryBaseline = null;
  let entryPhotoDataUrl = null;

  // ---------- storage ----------
  function loadEntries(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    }catch(e){ return []; }
  }
  function saveEntries(entries){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }
  function loadGoals(){
    try{
      const raw = localStorage.getItem(GOALS_KEY);
      return raw ? JSON.parse(raw) : { ...DEFAULT_GOALS };
    }catch(e){ return { ...DEFAULT_GOALS }; }
  }
  function saveGoals(goals){
    localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
  }
  function loadFavorites(){
    try{
      const raw = localStorage.getItem(FAVORITES_KEY);
      return raw ? JSON.parse(raw) : [];
    }catch(e){ return []; }
  }
  function saveFavorites(favs){
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
  }
  function loadApiKey(){
    return localStorage.getItem(API_KEY_STORAGE) || "";
  }
  function saveApiKey(key){
    localStorage.setItem(API_KEY_STORAGE, key);
  }
  function loadGarminCalories(){
    try{
      const raw = localStorage.getItem(GARMIN_KEY);
      return raw ? JSON.parse(raw) : {};
    }catch(e){ return {}; }
  }
  function saveGarminCalories(map){
    localStorage.setItem(GARMIN_KEY, JSON.stringify(map));
  }
  function loadGarminActivities(){
    try{
      const raw = localStorage.getItem(GARMIN_ACTIVITIES_KEY);
      return raw ? JSON.parse(raw) : [];
    }catch(e){ return []; }
  }
  function saveGarminActivities(list){
    localStorage.setItem(GARMIN_ACTIVITIES_KEY, JSON.stringify(list));
  }
  function loadGcalClientId(){
    return localStorage.getItem(GCAL_CLIENT_ID_KEY) || "";
  }
  function saveGcalClientId(id){
    localStorage.setItem(GCAL_CLIENT_ID_KEY, id);
  }
  function loadGcalToken(){
    try{
      const raw = localStorage.getItem(GCAL_TOKEN_KEY);
      if(!raw) return null;
      const parsed = JSON.parse(raw);
      if(!parsed.access_token || !parsed.expiresAt) return null;
      if(Date.now() >= parsed.expiresAt) return null;
      return parsed;
    }catch(e){ return null; }
  }
  function saveGcalToken(accessToken, expiresInSeconds){
    const expiresAt = Date.now() + (Math.max(expiresInSeconds || 3600, 60) * 1000) - 60000;
    localStorage.setItem(GCAL_TOKEN_KEY, JSON.stringify({ access_token: accessToken, expiresAt }));
  }
  function clearGcalToken(){
    localStorage.removeItem(GCAL_TOKEN_KEY);
  }
  function loadWeights(){
    try{
      const raw = localStorage.getItem(WEIGHT_KEY);
      return raw ? JSON.parse(raw) : {};
    }catch(e){ return {}; }
  }
  function saveWeights(map){
    localStorage.setItem(WEIGHT_KEY, JSON.stringify(map));
  }
  function loadWeightUnit(){
    return localStorage.getItem(WEIGHT_UNIT_KEY) || "kg";
  }
  function saveWeightUnit(unit){
    localStorage.setItem(WEIGHT_UNIT_KEY, unit);
  }
  function loadTheme(){
    return localStorage.getItem(THEME_KEY) || "dark";
  }
  function saveTheme(theme){
    localStorage.setItem(THEME_KEY, theme);
  }
  function applyTheme(theme){
    document.documentElement.setAttribute("data-theme", theme);
    const btn = document.getElementById("themeToggleBtn");
    if(btn) btn.textContent = theme === "light" ? "☀️" : "🌙";
  }
  function toggleTheme(){
    const next = loadTheme() === "light" ? "dark" : "light";
    saveTheme(next);
    applyTheme(next);
  }

  // ---------- helpers ----------
  function dateToStr(d){
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }
  function todayStr(){
    return dateToStr(new Date());
  }
  function addDays(dateStr, delta){
    const d = new Date(dateStr + "T00:00:00");
    d.setDate(d.getDate() + delta);
    return dateToStr(d);
  }
  function formatDateLabel(dateStr){
    const t = todayStr();
    const y = addDays(t, -1);
    if(dateStr === t) return "Today";
    if(dateStr === y) return "Yesterday";
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  function uid(){
    return Date.now().toString(36) + Math.random().toString(36).slice(2,8);
  }
  function num(v){
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }
  function kgToLb(kg){ return kg * 2.20462; }
  function lbToKg(lb){ return lb / 2.20462; }
  function round1(n){ return Math.round(n * 10) / 10; }
  function recalcCaloriesFromMacros(proteinId, carbsId, fatId, calsId){
    const p = num(document.getElementById(proteinId).value);
    const c = num(document.getElementById(carbsId).value);
    const f = num(document.getElementById(fatId).value);
    document.getElementById(calsId).value = Math.round(p * 4 + c * 4 + f * 9);
  }
  function parseServingQty(str){
    if(!str) return null;
    const m = String(str).match(/[\d.]+/);
    if(!m) return null;
    const n = parseFloat(m[0]);
    return isNaN(n) ? null : n;
  }

  // ---------- rendering ----------
  function entriesForDate(dateStr){
    return loadEntries().filter(e => e.date === dateStr);
  }

  function totalsForEntries(entries){
    return entries.reduce((acc, e) => {
      acc.calories += num(e.calories);
      acc.protein += num(e.protein);
      acc.carbs += num(e.carbs);
      acc.fat += num(e.fat);
      return acc;
    }, { calories:0, protein:0, carbs:0, fat:0 });
  }

  function render(){
    document.getElementById("dateLabel").textContent = formatDateLabel(currentDate);
    const entries = entriesForDate(currentDate);
    const goals = loadGoals();
    const totals = totalsForEntries(entries);

    renderSummary(totals, goals);
    renderMeals(entries);
    renderBurnedCard(totals);
    renderWeightCard();
    renderActivityCard();
    renderCalendarCard();
    renderInsight(totals, goals);
  }

  function renderActivityCard(){
    const activities = loadGarminActivities();
    const card = document.getElementById("activityCard");
    if(activities.length === 0){
      card.style.display = "none";
      return;
    }
    card.style.display = "block";
    buildGarminActivityRows("activityCardList", 3);
  }

  function renderWeightCard(){
    const map = loadWeights();
    const card = document.getElementById("weightCard");
    const kg = map[currentDate];
    if(kg == null){
      card.style.display = "none";
      return;
    }

    const unit = loadWeightUnit();
    const displayVal = unit === "kg" ? kg : kgToLb(kg);
    document.getElementById("weightCardNum").textContent = round1(displayVal) + " " + unit;

    const priorDates = Object.keys(map).filter(d => d < currentDate).sort((a, b) => b.localeCompare(a));
    const deltaEl = document.getElementById("weightCardDelta");
    if(priorDates.length === 0){
      deltaEl.textContent = "First logged weight";
      deltaEl.className = "dash-tile-sub";
    } else {
      const priorKg = map[priorDates[0]];
      const deltaKg = kg - priorKg;
      const deltaDisplay = unit === "kg" ? deltaKg : kgToLb(deltaKg);
      const rounded = round1(deltaDisplay);
      const sign = rounded > 0 ? "+" : "";
      deltaEl.textContent = sign + rounded + " " + unit + " vs " + formatDateLabel(priorDates[0]);
      deltaEl.className = "dash-tile-sub " + (rounded < 0 ? "down" : rounded > 0 ? "up" : "");
    }
    card.style.display = "block";
  }

  function renderBurnedCard(totals){
    const burned = loadGarminCalories()[currentDate];
    const card = document.getElementById("burnedCard");
    if(burned == null){
      card.style.display = "none";
      return;
    }
    const net = Math.round(totals.calories - burned);
    card.style.display = "block";
    document.getElementById("burnedCardNum").textContent = Math.round(burned) + " kcal";
    document.getElementById("burnedCardNet").textContent = "net " + net + " kcal today";
  }

  function dayHitsGoal(dateStr, goals){
    const totals = totalsForEntries(entriesForDate(dateStr));
    if(totals.calories === 0) return false;
    const burned = loadGarminCalories()[dateStr];
    const net = burned != null ? totals.calories - burned : totals.calories;
    const withinCalories = net >= goals.calories * 0.85 && net <= goals.calories * 1.15;
    const hitProtein = goals.protein > 0 ? totals.protein >= goals.protein * 0.9 : true;
    return withinCalories && hitProtein;
  }

  function computeStreak(goals){
    const today = todayStr();
    let cursor = dayHitsGoal(today, goals) ? today : addDays(today, -1);
    let streak = 0;
    while(dayHitsGoal(cursor, goals)){
      streak++;
      cursor = addDays(cursor, -1);
    }
    return streak;
  }

  function renderInsight(totals, goals){
    const el = document.getElementById("insightBanner");
    if(currentDate !== todayStr()){
      el.style.display = "none";
      return;
    }

    const burned = loadGarminCalories()[currentDate];
    const hasBurned = burned != null;
    const net = hasBurned ? totals.calories - burned : totals.calories;
    const remaining = Math.round(goals.calories - net);
    const proteinRemaining = Math.round(Math.max(goals.protein - totals.protein, 0));
    const proteinPct = goals.protein > 0 ? totals.protein / goals.protein : 1;
    const burnedNote = hasBurned ? " (net of " + Math.round(burned) + " kcal burned)" : "";

    let msg;
    if(totals.calories === 0 && !hasBurned){
      msg = "Nothing logged yet today — log a meal to get a personalized suggestion.";
    } else if(remaining < -50){
      msg = "You're about " + Math.abs(remaining) + " kcal over your goal" + burnedNote +
        ". Consider lighter options for your next meal.";
    } else if(remaining <= 150){
      msg = "You're right around your calorie goal" + burnedNote +
        " — a light, protein-forward choice fits best from here.";
    } else if(proteinPct < 0.5 && remaining > 300){
      msg = "You have about " + remaining + " kcal left" + burnedNote + " and are still low on protein (" +
        proteinRemaining + "g to go) — a protein-rich meal would use that budget well.";
    } else {
      msg = "You have about " + remaining + " kcal left today" + burnedNote + ". You're on track.";
    }

    const streak = computeStreak(goals);
    const streakBit = streak >= 2
      ? '<div class="insight-streak">🔥 ' + streak + '-day streak of hitting your goals</div>'
      : "";

    el.style.display = "block";
    el.innerHTML = streakBit + '<span class="insight-label">✨ Suggestion — </span>' + escapeHtml(msg);
  }

  function renderSummary(totals, goals){
    const burned = loadGarminCalories()[currentDate];
    const effectiveGoal = goals.calories + (burned != null ? Math.round(burned) : 0);

    document.getElementById("calNum").textContent = Math.round(totals.calories);
    document.getElementById("calGoalLabel").textContent = effectiveGoal;

    const circumference = 364;
    const pct = effectiveGoal > 0 ? Math.min(totals.calories / effectiveGoal, 1) : 0;
    document.getElementById("calRing").style.strokeDashoffset = String(circumference * (1 - pct));

    setBar("protein", totals.protein, goals.protein);
    setBar("carbs", totals.carbs, goals.carbs);
    setBar("fat", totals.fat, goals.fat);
  }

  function setBar(key, val, goal){
    document.getElementById(key + "Val").textContent = Math.round(val) + " / " + Math.round(goal) + "g";
    const pct = goal > 0 ? Math.min((val / goal) * 100, 100) : 0;
    document.getElementById(key + "Bar").style.width = pct + "%";
  }

  function renderMeals(entries){
    const container = document.getElementById("mealsContainer");
    container.innerHTML = "";

    if(entries.length === 0){
      const empty = document.createElement("div");
      empty.className = "empty-day";
      const hasPrevDay = entriesForDate(addDays(currentDate, -1)).length > 0;
      if(hasPrevDay){
        empty.innerHTML = 'Nothing logged yet. Tap + to add food, or ' +
          '<button type="button" class="link-btn" id="copyPrevDayBtn">copy the previous day\'s log</button>.';
        container.appendChild(empty);
        document.getElementById("copyPrevDayBtn").addEventListener("click", copyPreviousDayToToday);
      } else {
        empty.textContent = "Nothing logged yet. Tap + to add food.";
        container.appendChild(empty);
      }
      return;
    }

    MEALS.forEach(meal => {
      const mealEntries = entries.filter(e => e.meal === meal.id);
      if(mealEntries.length === 0) return;

      const mealCals = mealEntries.reduce((s,e) => s + num(e.calories), 0);

      const section = document.createElement("div");
      section.className = "meal-section";

      const header = document.createElement("div");
      header.className = "meal-header";
      header.innerHTML = `<h2>${meal.label}</h2><span class="meal-cal">${Math.round(mealCals)} kcal</span>`;
      section.appendChild(header);

      mealEntries.forEach(e => {
        const card = document.createElement("div");
        card.className = "entry-card";
        const servingBit = e.serving ? `<span>${escapeHtml(e.serving)}</span>` : "";
        const thumbBit = e.photo ? `<img src="${e.photo}" class="entry-thumb" alt="">` : "";
        card.innerHTML = `
          ${thumbBit}
          <div class="entry-info">
            <div class="entry-name">${escapeHtml(e.name)}</div>
            <div class="entry-macros">
              <span>${Math.round(num(e.calories))} kcal</span>
              <span>P ${Math.round(num(e.protein))}g</span>
              <span>C ${Math.round(num(e.carbs))}g</span>
              <span>F ${Math.round(num(e.fat))}g</span>
              ${servingBit}
            </div>
          </div>
          <div class="entry-actions">
            <button class="icon-btn edit-btn" data-id="${e.id}">✎</button>
            <button class="icon-btn danger del-btn" data-id="${e.id}">✕</button>
          </div>
        `;
        section.appendChild(card);
      });

      container.appendChild(section);
    });

    container.querySelectorAll(".edit-btn").forEach(btn => {
      btn.addEventListener("click", () => openEditEntry(btn.dataset.id));
    });
    container.querySelectorAll(".del-btn").forEach(btn => {
      btn.addEventListener("click", () => deleteEntry(btn.dataset.id));
    });
  }

  function copyPreviousDayToToday(){
    const prevEntries = entriesForDate(addDays(currentDate, -1));
    if(prevEntries.length === 0) return;
    const entries = loadEntries();
    prevEntries.forEach(e => {
      entries.push({
        ...e,
        id: uid(),
        date: currentDate,
        createdAt: Date.now()
      });
    });
    saveEntries(entries);
    render();
  }

  function escapeHtml(str){
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }

  // ---------- entry sheet ----------
  const entryOverlay = document.getElementById("entryOverlay");

  function setEntryBaselineFromForm(){
    entryBaseline = {
      qty: parseServingQty(document.getElementById("entryServing").value),
      calories: num(document.getElementById("entryCals").value),
      protein: num(document.getElementById("entryProtein").value),
      carbs: num(document.getElementById("entryCarbs").value),
      fat: num(document.getElementById("entryFat").value)
    };
  }

  function openAddEntry(){
    editingEntryId = null;
    isFavStarred = false;
    entryBaseline = null;
    entryPhotoDataUrl = null;
    hideEntryPhotoPreview();
    document.getElementById("entrySheetTitle").textContent = "Log food";
    document.getElementById("entryName").value = "";
    document.getElementById("entryMeal").value = guessMealByTime();
    document.getElementById("entryServing").value = "";
    document.getElementById("entryCals").value = "";
    document.getElementById("entryProtein").value = "";
    document.getElementById("entryCarbs").value = "";
    document.getElementById("entryFat").value = "";
    document.getElementById("foodSearchInput").value = "";
    document.getElementById("foodSearchResults").innerHTML = "";
    updateFavStarUI();
    renderFavsRow();
    entryOverlay.classList.add("open");
    setTimeout(() => document.getElementById("entryName").focus(), 50);
  }

  function guessMealByTime(){
    const h = new Date().getHours();
    if(h < 11) return "breakfast";
    if(h < 15) return "lunch";
    if(h < 21) return "dinner";
    return "snack";
  }

  function openEditEntry(id){
    const entries = loadEntries();
    const e = entries.find(x => x.id === id);
    if(!e) return;
    editingEntryId = id;
    document.getElementById("entrySheetTitle").textContent = "Edit food";
    document.getElementById("entryName").value = e.name;
    document.getElementById("entryMeal").value = e.meal;
    document.getElementById("entryServing").value = e.serving || "";
    document.getElementById("entryCals").value = e.calories;
    document.getElementById("entryProtein").value = e.protein;
    document.getElementById("entryCarbs").value = e.carbs;
    document.getElementById("entryFat").value = e.fat;
    document.getElementById("foodSearchInput").value = "";
    document.getElementById("foodSearchResults").innerHTML = "";
    setEntryBaselineFromForm();
    entryPhotoDataUrl = e.photo || null;
    if(entryPhotoDataUrl) showEntryPhotoPreview(entryPhotoDataUrl); else hideEntryPhotoPreview();
    isFavStarred = loadFavorites().some(f => f.name.toLowerCase() === e.name.toLowerCase());
    updateFavStarUI();
    renderFavsRow();
    entryOverlay.classList.add("open");
  }

  function closeEntrySheet(){
    entryOverlay.classList.remove("open");
    editingEntryId = null;
  }

  function showEntryPhotoPreview(url){
    document.getElementById("entryPhotoImg").src = url;
    document.getElementById("entryPhotoPreview").style.display = "flex";
    document.getElementById("entryPhotoBtn").textContent = "🔄 Replace photo";
  }
  function hideEntryPhotoPreview(){
    document.getElementById("entryPhotoPreview").style.display = "none";
    document.getElementById("entryPhotoImg").src = "";
    document.getElementById("entryPhotoBtn").textContent = "📷 Add photo";
  }
  function resizeImageFile(file, maxDim, quality){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          let width = img.width, height = img.height;
          if(width > height && width > maxDim){
            height = Math.round(height * (maxDim / width));
            width = maxDim;
          } else if(height >= width && height > maxDim){
            width = Math.round(width * (maxDim / height));
            height = maxDim;
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d").drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.onerror = () => reject(new Error("Couldn't read that image."));
        img.src = reader.result;
      };
      reader.onerror = () => reject(new Error("Couldn't read that file."));
      reader.readAsDataURL(file);
    });
  }

  function updateFavStarUI(){
    const btn = document.getElementById("favStarBtn");
    btn.textContent = isFavStarred ? "★" : "☆";
    btn.classList.toggle("active", isFavStarred);
  }

  function renderFavsRow(){
    const favs = loadFavorites();
    const section = document.getElementById("favsSection");
    const divider = document.getElementById("favsDivider");
    const scroll = document.getElementById("favsScroll");
    scroll.innerHTML = "";

    if(favs.length === 0){
      section.style.display = "none";
      divider.style.display = "none";
      return;
    }
    section.style.display = "block";
    divider.style.display = "block";

    favs.forEach(f => {
      const chip = document.createElement("div");
      chip.className = "fav-chip";
      chip.innerHTML = `<div class="fav-name">${escapeHtml(f.name)}</div><div class="fav-cal">${Math.round(num(f.calories))} kcal</div>`;
      chip.addEventListener("click", () => applyFavoriteToForm(f));
      scroll.appendChild(chip);
    });
  }

  function applyFavoriteToForm(f){
    document.getElementById("entryName").value = f.name;
    document.getElementById("entryServing").value = f.serving || "";
    document.getElementById("entryCals").value = f.calories;
    document.getElementById("entryProtein").value = f.protein;
    document.getElementById("entryCarbs").value = f.carbs;
    document.getElementById("entryFat").value = f.fat;
    setEntryBaselineFromForm();
    isFavStarred = true;
    updateFavStarUI();
  }

  function upsertFavorite(payload){
    let favs = loadFavorites();
    const idx = favs.findIndex(f => f.name.toLowerCase() === payload.name.toLowerCase());
    const favData = {
      name: payload.name,
      serving: payload.serving,
      calories: payload.calories,
      protein: payload.protein,
      carbs: payload.carbs,
      fat: payload.fat
    };
    if(idx >= 0){ favs[idx] = favData; } else { favs.push(favData); }
    saveFavorites(favs);
  }

  function removeFavoriteByName(name){
    let favs = loadFavorites();
    favs = favs.filter(f => f.name.toLowerCase() !== name.toLowerCase());
    saveFavorites(favs);
  }

  // ---------- favorites sheet ----------
  const favoritesOverlay = document.getElementById("favoritesOverlay");

  function openFavoritesSheet(){
    renderFavoritesList();
    favoritesOverlay.classList.add("open");
  }
  function closeFavoritesSheet(){
    favoritesOverlay.classList.remove("open");
  }
  function renderFavoritesList(){
    const favs = loadFavorites();
    const list = document.getElementById("favoritesList");
    list.innerHTML = "";

    if(favs.length === 0){
      list.innerHTML = '<div class="garmin-history-empty">No favorites saved yet. Star a food when logging it to add one.</div>';
      return;
    }

    favs.forEach(f => {
      const row = document.createElement("div");
      row.className = "fav-list-row";
      const servingBit = f.serving ? " · " + escapeHtml(f.serving) : "";
      row.innerHTML = `
        <div class="fav-list-info">
          <div class="fav-list-name">${escapeHtml(f.name)}</div>
          <div class="fav-list-meta">${Math.round(num(f.calories))} kcal · P${Math.round(num(f.protein))} C${Math.round(num(f.carbs))} F${Math.round(num(f.fat))}${servingBit}</div>
        </div>
        <div class="fav-list-actions">
          <button class="icon-btn danger" data-name="${escapeHtml(f.name)}">✕</button>
        </div>
      `;
      row.querySelector("button").addEventListener("click", () => {
        removeFavoriteByName(f.name);
        renderFavoritesList();
      });
      list.appendChild(row);
    });
  }

  function saveEntry(){
    const name = document.getElementById("entryName").value.trim();
    if(!name){
      document.getElementById("entryName").focus();
      return;
    }
    const payload = {
      name,
      meal: document.getElementById("entryMeal").value,
      serving: document.getElementById("entryServing").value.trim(),
      calories: num(document.getElementById("entryCals").value),
      protein: num(document.getElementById("entryProtein").value),
      carbs: num(document.getElementById("entryCarbs").value),
      fat: num(document.getElementById("entryFat").value),
      date: currentDate,
      photo: entryPhotoDataUrl || null
    };

    let entries = loadEntries();
    if(editingEntryId){
      entries = entries.map(e => e.id === editingEntryId ? { ...e, ...payload } : e);
    } else {
      payload.id = uid();
      payload.createdAt = Date.now();
      entries.push(payload);
    }
    saveEntries(entries);

    if(isFavStarred){
      upsertFavorite(payload);
    } else {
      removeFavoriteByName(payload.name);
    }

    closeEntrySheet();
    render();
  }

  function deleteEntry(id){
    let entries = loadEntries();
    entries = entries.filter(e => e.id !== id);
    saveEntries(entries);
    render();
  }

  // ---------- food search (USDA FoodData Central) ----------
  function extractMacros(food){
    if(food.labelNutrients){
      const ln = food.labelNutrients;
      return {
        calories: ln.calories ? ln.calories.value : 0,
        protein: ln.protein ? ln.protein.value : 0,
        carbs: ln.carbohydrates ? ln.carbohydrates.value : 0,
        fat: ln.fat ? ln.fat.value : 0,
        serving: (food.servingSize && food.servingSizeUnit)
          ? (food.servingSize + food.servingSizeUnit)
          : (food.householdServingFullText || "")
      };
    }
    const nutrients = food.foodNutrients || [];
    const find = (name) => {
      const n = nutrients.find(x => x.nutrientName === name);
      return n ? num(n.value) : 0;
    };
    return {
      calories: find("Energy"),
      protein: find("Protein"),
      carbs: find("Carbohydrate, by difference"),
      fat: find("Total lipid (fat)"),
      serving: "100 g"
    };
  }

  function renderFoodSearchResults(foods){
    const container = document.getElementById("foodSearchResults");
    container.innerHTML = "";
    if(!foods || foods.length === 0){
      container.innerHTML = `<div class="food-search-empty">No results found.</div>`;
      return;
    }
    foods.forEach(food => {
      const macros = extractMacros(food);
      const item = document.createElement("div");
      item.className = "food-search-item";
      const servingBit = macros.serving ? " · " + escapeHtml(macros.serving) : "";
      item.innerHTML = `
        <div class="food-search-name">${escapeHtml(food.description)}</div>
        <div class="food-search-meta">${Math.round(macros.calories)} kcal · P${Math.round(macros.protein)} C${Math.round(macros.carbs)} F${Math.round(macros.fat)}${servingBit}</div>
      `;
      item.addEventListener("click", () => applySearchResultToForm(food.description, macros));
      container.appendChild(item);
    });
  }

  function applySearchResultToForm(name, macros){
    document.getElementById("entryName").value = name;
    document.getElementById("entryServing").value = macros.serving || "";
    document.getElementById("entryCals").value = Math.round(macros.calories);
    document.getElementById("entryProtein").value = Math.round(macros.protein);
    document.getElementById("entryCarbs").value = Math.round(macros.carbs);
    document.getElementById("entryFat").value = Math.round(macros.fat);
    document.getElementById("foodSearchResults").innerHTML = "";
    document.getElementById("foodSearchInput").value = "";
    setEntryBaselineFromForm();
  }

  function showApiKeyPrompt(message){
    const resultsEl = document.getElementById("foodSearchResults");
    resultsEl.innerHTML = `<div class="food-search-empty">${message} <button type="button" class="link-btn" id="inlineSetApiKeyBtn">Set API key</button></div>`;
    document.getElementById("inlineSetApiKeyBtn").addEventListener("click", openApiKeySheet);
  }

  async function performFoodSearch(){
    const query = document.getElementById("foodSearchInput").value.trim();
    const resultsEl = document.getElementById("foodSearchResults");
    if(!query) return;

    const apiKey = loadApiKey();
    if(!apiKey){
      showApiKeyPrompt("Add your USDA API key to search.");
      return;
    }

    resultsEl.innerHTML = `<div class="food-search-empty">Searching…</div>`;
    try{
      const url = "https://api.nal.usda.gov/fdc/v1/foods/search?api_key=" + encodeURIComponent(apiKey) +
        "&query=" + encodeURIComponent(query) + "&pageSize=8";
      const res = await fetch(url);
      if(res.status === 401 || res.status === 403){
        showApiKeyPrompt("That API key was rejected.");
        return;
      }
      if(!res.ok){
        resultsEl.innerHTML = `<div class="food-search-empty">Search failed (${res.status}). Try again.</div>`;
        return;
      }
      const data = await res.json();
      renderFoodSearchResults(data.foods || []);
    }catch(e){
      resultsEl.innerHTML = `<div class="food-search-empty">Search failed. Check your connection and try again.</div>`;
    }
  }

  // ---------- barcode scanner ----------
  const scannerOverlay = document.getElementById("scannerOverlay");
  const scannerVideo = document.getElementById("scannerVideo");
  const scannerStatus = document.getElementById("scannerStatus");
  let scannerStream = null;
  let nativeScanTimer = null;
  let zxingReader = null;
  let zxingScriptPromise = null;

  function loadZxingScript(){
    if(typeof ZXing !== "undefined") return Promise.resolve();
    if(zxingScriptPromise) return zxingScriptPromise;
    zxingScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/@zxing/library@0.20.0/umd/index.min.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load barcode scanner library."));
      document.head.appendChild(script);
    });
    return zxingScriptPromise;
  }

  function startNativeScan(onResult){
    let detector;
    try{
      detector = new BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"] });
    }catch(e){
      detector = new BarcodeDetector();
    }
    nativeScanTimer = setInterval(() => {
      detector.detect(scannerVideo).then(codes => {
        if(codes && codes.length > 0){
          clearInterval(nativeScanTimer);
          nativeScanTimer = null;
          onResult(codes[0].rawValue);
        }
      }).catch(() => {});
    }, 300);
  }

  function startZxingScan(onResult){
    loadZxingScript().then(() => {
      zxingReader = new ZXing.BrowserMultiFormatReader();
      zxingReader.decodeFromVideoDevice(undefined, scannerVideo, (result) => {
        if(result) onResult(result.getText());
      }).catch(() => {
        scannerStatus.textContent = "Couldn't start camera scanning on this browser.";
      });
    }).catch(() => {
      scannerStatus.textContent = "Couldn't load barcode scanner. Check your connection.";
    });
  }

  function stopScanning(){
    if(nativeScanTimer){ clearInterval(nativeScanTimer); nativeScanTimer = null; }
    if(zxingReader){
      try{ zxingReader.reset(); }catch(e){}
      zxingReader = null;
    }
    if(scannerStream){
      scannerStream.getTracks().forEach(t => t.stop());
      scannerStream = null;
    }
    scannerVideo.srcObject = null;
  }

  function openScanner(){
    document.getElementById("foodSearchResults").innerHTML = "";
    scannerStatus.textContent = "Point your camera at a barcode…";
    scannerOverlay.classList.add("open");

    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
      scannerStatus.textContent = "Camera access isn't available in this browser.";
      return;
    }

    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      .then(stream => {
        scannerStream = stream;
        scannerVideo.srcObject = stream;
        scannerVideo.play();
        if(typeof BarcodeDetector !== "undefined"){
          startNativeScan(handleScanResult);
        } else {
          startZxingScan(handleScanResult);
        }
      })
      .catch(() => {
        scannerStatus.textContent = "Camera access denied or unavailable.";
      });
  }

  function closeScanner(){
    scannerOverlay.classList.remove("open");
    stopScanning();
  }

  async function handleScanResult(code){
    closeScanner();
    const resultsEl = document.getElementById("foodSearchResults");
    resultsEl.innerHTML = `<div class="food-search-empty">Looking up barcode ${escapeHtml(code)}…</div>`;
    try{
      const url = "https://world.openfoodfacts.org/api/v2/product/" + encodeURIComponent(code) +
        ".json?fields=product_name,brands,nutriments,serving_size";
      const res = await fetch(url);
      if(!res.ok){
        resultsEl.innerHTML = `<div class="food-search-empty">Barcode lookup failed. Try again.</div>`;
        return;
      }
      const data = await res.json();
      if(data.status !== 1 || !data.product){
        resultsEl.innerHTML = `<div class="food-search-empty">No product found for that barcode. Try searching by name instead.</div>`;
        return;
      }
      const p = data.product;
      const n = p.nutriments || {};
      let calories = num(n["energy-kcal_100g"]);
      if(!calories && n["energy_100g"]) calories = num(n["energy_100g"]) / 4.184;
      const macros = {
        calories,
        protein: num(n["proteins_100g"]),
        carbs: num(n["carbohydrates_100g"]),
        fat: num(n["fat_100g"]),
        serving: p.serving_size || "100 g"
      };
      const name = p.product_name ? (p.brands ? `${p.product_name} (${p.brands})` : p.product_name) : "Scanned item";
      resultsEl.innerHTML = "";
      applySearchResultToForm(name, macros);
    }catch(e){
      resultsEl.innerHTML = `<div class="food-search-empty">Barcode lookup failed. Check your connection and try again.</div>`;
    }
  }

  // ---------- backup / restore ----------
  const backupOverlay = document.getElementById("backupOverlay");
  const BACKUP_KEYS = {
    entries: STORAGE_KEY,
    goals: GOALS_KEY,
    favorites: FAVORITES_KEY,
    garminCalories: GARMIN_KEY,
    garminActivities: GARMIN_ACTIVITIES_KEY,
    weight: WEIGHT_KEY,
    weightUnit: WEIGHT_UNIT_KEY
  };

  function openBackupSheet(){
    document.getElementById("backupStatusNote").textContent = "";
    backupOverlay.classList.add("open");
  }
  function closeBackupSheet(){
    backupOverlay.classList.remove("open");
  }

  function exportBackup(){
    const data = { exportedAt: new Date().toISOString(), version: 1, data: {} };
    Object.keys(BACKUP_KEYS).forEach(name => {
      const raw = localStorage.getItem(BACKUP_KEYS[name]);
      if(raw !== null){
        try{ data.data[name] = JSON.parse(raw); }catch(e){ data.data[name] = raw; }
      }
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "macro-tracker-backup-" + todayStr() + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    document.getElementById("backupStatusNote").textContent = "Backup file downloaded.";
  }

  function restoreBackupFromFile(file){
    const statusEl = document.getElementById("backupStatusNote");
    const reader = new FileReader();
    reader.onload = () => {
      let parsed;
      try{
        parsed = JSON.parse(reader.result);
      }catch(e){
        statusEl.textContent = "That file isn't a valid backup (couldn't parse JSON).";
        return;
      }
      if(!parsed || typeof parsed.data !== "object"){
        statusEl.textContent = "That file isn't a valid Macro Tracker backup.";
        return;
      }
      const confirmed = confirm("Restoring will overwrite your current food log, goals, favorites, weight history, and Garmin data in this browser. Continue?");
      if(!confirmed) return;

      Object.keys(BACKUP_KEYS).forEach(name => {
        if(Object.prototype.hasOwnProperty.call(parsed.data, name)){
          localStorage.setItem(BACKUP_KEYS[name], JSON.stringify(parsed.data[name]));
        }
      });
      statusEl.textContent = "Restore complete.";
      render();
      renderFavsRow();
      setTimeout(closeBackupSheet, 800);
    };
    reader.onerror = () => {
      statusEl.textContent = "Couldn't read that file.";
    };
    reader.readAsText(file);
  }

  // ---------- API key sheet ----------
  const apiKeyOverlay = document.getElementById("apiKeyOverlay");

  function openApiKeySheet(){
    document.getElementById("apiKeyInput").value = loadApiKey();
    apiKeyOverlay.classList.add("open");
  }
  function closeApiKeySheet(){
    apiKeyOverlay.classList.remove("open");
  }
  function saveApiKeyFromForm(){
    const key = document.getElementById("apiKeyInput").value.trim();
    saveApiKey(key);
    closeApiKeySheet();
  }

  // ---------- Garmin CSV import ----------
  function parseCsv(text){
    const rows = [];
    let row = [], field = "", inQuotes = false;
    for(let i = 0; i < text.length; i++){
      const ch = text[i];
      if(inQuotes){
        if(ch === '"'){
          if(text[i + 1] === '"'){ field += '"'; i++; }
          else inQuotes = false;
        } else field += ch;
      } else {
        if(ch === '"') inQuotes = true;
        else if(ch === ','){ row.push(field); field = ""; }
        else if(ch === "\n" || ch === "\r"){
          if(ch === "\r" && text[i + 1] === "\n") i++;
          row.push(field);
          field = "";
          if(row.length > 1 || row[0] !== ""){ rows.push(row); }
          row = [];
        } else field += ch;
      }
    }
    if(field.length > 0 || row.length > 0){ row.push(field); rows.push(row); }
    return rows;
  }

  function parseGarminActivities(text){
    const rows = parseCsv(text);
    if(rows.length < 2) return null;
    const headers = rows[0].map(h => h.trim().toLowerCase());
    const dateIdx = headers.findIndex(h => h === "date" || h.includes("date"));
    const calIdx = headers.findIndex(h => h.includes("calorie"));
    if(dateIdx === -1 || calIdx === -1) return null;
    const typeIdx = headers.findIndex(h => h.includes("activity type") || h === "type");
    const titleIdx = headers.findIndex(h => h.includes("title") || h.includes("name"));

    const activities = [];
    for(let i = 1; i < rows.length; i++){
      const r = rows[i];
      if(!r || r.length <= Math.max(dateIdx, calIdx)) continue;
      const rawDate = r[dateIdx];
      const rawCal = r[calIdx];
      let dateStr = null;
      let sortKey = null;
      const m = String(rawDate).match(/^(\d{4})-(\d{2})-(\d{2})/);
      const parsedFull = new Date(rawDate);
      if(m){
        dateStr = m[1] + "-" + m[2] + "-" + m[3];
        sortKey = !isNaN(parsedFull.getTime()) ? parsedFull.toISOString() : dateStr;
      } else if(!isNaN(parsedFull.getTime())){
        dateStr = dateToStr(parsedFull);
        sortKey = parsedFull.toISOString();
      }
      if(!dateStr) continue;
      const cal = parseFloat(String(rawCal).replace(/,/g, ""));
      if(isNaN(cal)) continue;

      activities.push({
        dateStr,
        sortKey,
        type: typeIdx !== -1 ? (r[typeIdx] || "").trim() : "",
        title: titleIdx !== -1 ? (r[titleIdx] || "").trim() : "",
        calories: cal
      });
    }
    return activities;
  }

  function aggregateDailyTotals(activities){
    const totals = {};
    activities.forEach(a => {
      totals[a.dateStr] = (totals[a.dateStr] || 0) + a.calories;
    });
    return totals;
  }

  function activityKey(a){
    return a.sortKey + "|" + a.title + "|" + a.type + "|" + a.calories;
  }

  function mergeGarminActivities(existing, incoming){
    const map = new Map();
    existing.forEach(a => map.set(activityKey(a), a));
    incoming.forEach(a => map.set(activityKey(a), a));
    return Array.from(map.values())
      .sort((a, b) => String(b.sortKey).localeCompare(String(a.sortKey)))
      .slice(0, 200);
  }

  function importGarminCsv(file){
    const reader = new FileReader();
    reader.onload = () => {
      const activities = parseGarminActivities(String(reader.result));
      if(activities === null){
        alert("Couldn't find Date/Calories columns in that file. Make sure it's a Garmin Connect activities CSV export.");
        return;
      }
      if(activities.length === 0){
        alert("No calorie data found in that file.");
        return;
      }

      const totals = aggregateDailyTotals(activities);
      saveGarminCalories({ ...loadGarminCalories(), ...totals });
      saveGarminActivities(mergeGarminActivities(loadGarminActivities(), activities));

      render();
      alert("Imported " + activities.length + " activit" + (activities.length === 1 ? "y" : "ies") +
        " across " + Object.keys(totals).length + " day(s).");
    };
    reader.onerror = () => alert("Couldn't read that file.");
    reader.readAsText(file);
  }

  // ---------- Garmin history sheet ----------
  const garminHistoryOverlay = document.getElementById("garminHistoryOverlay");

  function openGarminHistory(){
    buildGarminActivityRows("garminRecentList", 3);
    renderGarminHistory();
    garminHistoryOverlay.classList.add("open");
  }
  function closeGarminHistory(){
    garminHistoryOverlay.classList.remove("open");
  }
  function buildGarminActivityRows(containerId, count){
    const activities = loadGarminActivities();
    const list = document.getElementById(containerId);
    list.innerHTML = "";

    if(activities.length === 0){
      list.innerHTML = '<div class="garmin-history-empty">No activities imported yet.</div>';
      return;
    }

    activities.slice(0, count).forEach(a => {
      const row = document.createElement("div");
      row.className = "garmin-history-row";
      const name = a.title || a.type || "Activity";
      row.innerHTML = '<span class="garmin-history-date">' + escapeHtml(name) + ' · ' +
        escapeHtml(formatDateLabel(a.dateStr)) + '</span><span class="garmin-history-cal">' +
        Math.round(a.calories) + ' kcal</span>';
      list.appendChild(row);
    });
  }
  function renderGarminHistory(){
    const map = loadGarminCalories();
    const dates = Object.keys(map).sort((a, b) => b.localeCompare(a));
    const list = document.getElementById("garminHistoryList");
    list.innerHTML = "";

    if(dates.length === 0){
      list.innerHTML = '<div class="garmin-history-empty">No Garmin data imported yet.</div>';
      return;
    }

    dates.forEach(dateStr => {
      const row = document.createElement("div");
      row.className = "garmin-history-row";
      row.innerHTML = '<span class="garmin-history-date">' + escapeHtml(formatDateLabel(dateStr)) +
        '</span><span class="garmin-history-cal">' + Math.round(map[dateStr]) + ' kcal burned</span>';
      list.appendChild(row);
    });
  }

  // ---------- Google Calendar ----------
  const calendarOverlay = document.getElementById("calendarOverlay");
  let gcalTokenClient = null;
  let gcalAccessToken = null;

  function updateGcalStatus(){
    const note = document.getElementById("gcalStatusNote");
    note.textContent = gcalAccessToken
      ? "Connected — reconnects automatically while you stay signed into Google."
      : "Not connected.";
  }

  function openCalendarSheet(){
    document.getElementById("gcalClientIdInput").value = loadGcalClientId();
    updateGcalStatus();
    calendarOverlay.classList.add("open");
  }
  function closeCalendarSheet(){
    calendarOverlay.classList.remove("open");
  }
  function saveGcalClientIdFromForm(){
    const id = document.getElementById("gcalClientIdInput").value.trim();
    saveGcalClientId(id);
    gcalTokenClient = null;
    alert("Client ID saved.");
  }

  function ensureGcalTokenClient(silent){
    const clientId = loadGcalClientId();
    if(!clientId){
      if(!silent) alert("Add your Google OAuth Client ID first, then save it.");
      return null;
    }
    if(typeof google === "undefined" || !google.accounts || !google.accounts.oauth2){
      if(!silent) alert("Google sign-in hasn't loaded yet. Check your connection and try again.");
      return null;
    }
    if(!gcalTokenClient){
      gcalTokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "https://www.googleapis.com/auth/calendar.readonly",
        callback: (tokenResponse) => {
          if(tokenResponse.error){
            updateGcalStatus();
            return;
          }
          gcalAccessToken = tokenResponse.access_token;
          saveGcalToken(tokenResponse.access_token, tokenResponse.expires_in);
          updateGcalStatus();
          renderCalendarCard();
        }
      });
    }
    return gcalTokenClient;
  }

  function whenGoogleReady(cb, attemptsLeft){
    if(typeof attemptsLeft !== "number") attemptsLeft = 25;
    if(typeof google !== "undefined" && google.accounts && google.accounts.oauth2){
      cb();
      return;
    }
    if(attemptsLeft <= 0) return;
    setTimeout(() => whenGoogleReady(cb, attemptsLeft - 1), 200);
  }

  function initGoogleCalendarOnLoad(){
    const stored = loadGcalToken();
    if(stored){
      gcalAccessToken = stored.access_token;
      updateGcalStatus();
      renderCalendarCard();
      return;
    }
    if(!loadGcalClientId()) return;
    whenGoogleReady(() => {
      const client = ensureGcalTokenClient(true);
      if(client) client.requestAccessToken({ prompt: "" });
    });
  }

  function signInGoogleCalendar(){
    const client = ensureGcalTokenClient();
    if(client) client.requestAccessToken();
  }

  function signOutGoogleCalendar(){
    if(gcalAccessToken && typeof google !== "undefined" && google.accounts && google.accounts.oauth2){
      google.accounts.oauth2.revoke(gcalAccessToken, () => {});
    }
    gcalAccessToken = null;
    clearGcalToken();
    updateGcalStatus();
    renderCalendarCard();
  }

  async function fetchCalendarEventsForDate(dateStr){
    if(!gcalAccessToken) return null;
    const timeMin = new Date(dateStr + "T00:00:00").toISOString();
    const timeMax = new Date(dateStr + "T23:59:59").toISOString();
    const url = "https://www.googleapis.com/calendar/v3/calendars/primary/events" +
      "?timeMin=" + encodeURIComponent(timeMin) +
      "&timeMax=" + encodeURIComponent(timeMax) +
      "&singleEvents=true&orderBy=startTime";
    try{
      const res = await fetch(url, { headers: { Authorization: "Bearer " + gcalAccessToken } });
      if(res.status === 401){
        gcalAccessToken = null;
        clearGcalToken();
        updateGcalStatus();
        return null;
      }
      if(!res.ok) return null;
      const data = await res.json();
      return data.items || [];
    }catch(e){
      return null;
    }
  }

  function eventTimeLabel(ev){
    const start = ev.start && ev.start.dateTime ? new Date(ev.start.dateTime) : null;
    return start ? start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "All day";
  }

  function renderCalendarEventList(events){
    const list = document.getElementById("calendarCardList");
    list.innerHTML = "";
    events.forEach(ev => {
      const row = document.createElement("div");
      row.className = "garmin-history-row";
      row.innerHTML = '<span class="garmin-history-date">' + escapeHtml(ev.summary || "(untitled)") +
        '</span><span class="garmin-history-cal">' + escapeHtml(eventTimeLabel(ev)) + '</span>';
      list.appendChild(row);
    });
  }

  async function renderCalendarCard(){
    const card = document.getElementById("calendarCard");
    if(!gcalAccessToken){
      card.style.display = "none";
      return;
    }
    const dateForFetch = currentDate;
    const events = await fetchCalendarEventsForDate(dateForFetch);
    if(dateForFetch !== currentDate) return; // user navigated away before this resolved
    if(events === null){
      card.style.display = "none";
      return;
    }

    document.getElementById("calendarCardLabel").textContent =
      formatDateLabel(currentDate) + "'s schedule";

    const nextEl = document.getElementById("calendarNextEvent");
    const moreBtn = document.getElementById("calendarMoreBtn");
    const list = document.getElementById("calendarCardList");
    list.innerHTML = "";
    list.style.display = "none";
    moreBtn.style.display = "none";
    renderCalendarEventList(events);

    if(events.length === 0){
      nextEl.className = "calendar-next-event empty";
      nextEl.textContent = "No events.";
      card.style.display = "block";
      return;
    }

    const isToday = currentDate === todayStr();
    const now = new Date();
    let nextIdx = 0;
    if(isToday){
      nextIdx = events.findIndex(ev => {
        const start = ev.start && ev.start.dateTime ? new Date(ev.start.dateTime) : null;
        return start && start >= now;
      });
    }

    if(nextIdx === -1){
      nextEl.className = "calendar-next-event empty";
      nextEl.textContent = "No more events today.";
      moreBtn.textContent = "Show " + events.length + " earlier event" + (events.length === 1 ? "" : "s");
      moreBtn.style.display = "inline";
    } else {
      const next = events[nextIdx];
      nextEl.className = "calendar-next-event";
      nextEl.innerHTML = '<div class="cal-next-title">' + escapeHtml(next.summary || "(untitled)") + '</div>' +
        '<div class="cal-next-time">' + escapeHtml(eventTimeLabel(next)) + '</div>';

      const remaining = events.length - nextIdx - 1;
      if(remaining > 0){
        moreBtn.textContent = "+" + remaining + " more today";
        moreBtn.style.display = "inline";
      }
    }

    card.style.display = "block";
  }

  // ---------- drawer menu ----------
  const drawerOverlay = document.getElementById("drawerOverlay");
  function openDrawer(){
    drawerOverlay.classList.add("open");
  }
  function closeDrawer(){
    drawerOverlay.classList.remove("open");
  }

  // ---------- weight sheet ----------
  const weightOverlay = document.getElementById("weightOverlay");
  let weightSheetUnit = "kg";

  function openWeightSheet(){
    weightSheetUnit = loadWeightUnit();
    document.querySelectorAll("#weightUnitsToggle button").forEach(b => {
      b.classList.toggle("active", b.dataset.unit === weightSheetUnit);
    });
    document.getElementById("weightFieldLabel").textContent = "Weight (" + weightSheetUnit + ")";

    const existingKg = loadWeights()[currentDate];
    document.getElementById("weightInput").value = existingKg != null
      ? round1(weightSheetUnit === "kg" ? existingKg : kgToLb(existingKg))
      : "";
    document.getElementById("weightDateNote").textContent = "Logging for " + formatDateLabel(currentDate) + ".";
    weightOverlay.classList.add("open");
  }
  function closeWeightSheet(){
    weightOverlay.classList.remove("open");
  }
  function setWeightSheetUnit(unit){
    if(unit === weightSheetUnit) return;
    const raw = num(document.getElementById("weightInput").value);
    if(raw > 0){
      const converted = unit === "kg" ? lbToKg(raw) : kgToLb(raw);
      document.getElementById("weightInput").value = round1(converted);
    }
    weightSheetUnit = unit;
    saveWeightUnit(unit);
    document.querySelectorAll("#weightUnitsToggle button").forEach(b => {
      b.classList.toggle("active", b.dataset.unit === unit);
    });
    document.getElementById("weightFieldLabel").textContent = "Weight (" + unit + ")";
  }
  function saveWeightFromForm(){
    const raw = num(document.getElementById("weightInput").value);
    if(raw <= 0){
      document.getElementById("weightInput").focus();
      return;
    }
    const kg = weightSheetUnit === "kg" ? raw : lbToKg(raw);
    const map = loadWeights();
    map[currentDate] = kg;
    saveWeights(map);
    closeWeightSheet();
    render();
  }

  // ---------- trends ----------
  const trendsOverlay = document.getElementById("trendsOverlay");
  let trendsRangeDays = 7;

  function openTrends(){
    renderTrends();
    trendsOverlay.classList.add("open");
  }
  function closeTrends(){
    trendsOverlay.classList.remove("open");
  }

  function getDateRange(days){
    const dates = [];
    for(let i = days - 1; i >= 0; i--){
      dates.push(addDays(todayStr(), -i));
    }
    return dates;
  }

  function trendDayLabel(dateStr){
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString(undefined, { month: "numeric", day: "numeric" });
  }

  function renderTrends(){
    const dates = getDateRange(trendsRangeDays);
    const goals = loadGoals();
    const allEntries = loadEntries();
    const garmin = loadGarminCalories();
    const weights = loadWeights();

    const dayData = dates.map(dateStr => {
      const entries = allEntries.filter(e => e.date === dateStr);
      return {
        dateStr,
        totals: totalsForEntries(entries),
        hasEntries: entries.length > 0,
        burned: garmin[dateStr],
        weightKg: weights[dateStr]
      };
    });

    renderTrendChart(dayData, goals);
    renderTrendStats(dayData, goals);
  }

  function renderTrendChart(dayData, goals){
    const chart = document.getElementById("trendChart");
    chart.innerHTML = "";

    const maxCal = Math.max(goals.calories * 1.3, ...dayData.map(d => d.totals.calories), 1);
    const goalPct = Math.min((goals.calories / maxCal) * 100, 100);

    const goalLine = document.createElement("div");
    goalLine.className = "trend-goal-line";
    goalLine.style.bottom = goalPct + "%";
    chart.appendChild(goalLine);

    dayData.forEach(d => {
      const col = document.createElement("div");
      col.className = "trend-bar-col";

      const track = document.createElement("div");
      track.className = "trend-bar-track";

      const fill = document.createElement("div");
      const pct = d.hasEntries ? Math.max((d.totals.calories / maxCal) * 100, 2) : 3;
      fill.className = "trend-bar-fill" +
        (!d.hasEntries ? " empty" : (goals.calories > 0 && d.totals.calories > goals.calories ? " over" : ""));
      fill.style.height = pct + "%";
      fill.title = Math.round(d.totals.calories) + " kcal";
      track.appendChild(fill);

      const label = document.createElement("div");
      label.className = "trend-bar-label";
      label.textContent = trendDayLabel(d.dateStr);

      col.appendChild(track);
      col.appendChild(label);
      chart.appendChild(col);
    });
  }

  function renderTrendStats(dayData, goals){
    const loggedDays = dayData.filter(d => d.hasEntries);
    const container = document.getElementById("trendStats");
    container.innerHTML = "";

    if(loggedDays.length === 0){
      container.innerHTML = '<div class="garmin-history-empty">No entries logged in this range yet.</div>';
      return;
    }

    const avg = (key) => loggedDays.reduce((s, d) => s + d.totals[key], 0) / loggedDays.length;

    const stats = [
      { num: Math.round(avg("calories")) + " kcal", lbl: "Avg calories (goal " + goals.calories + ")" },
      { num: loggedDays.length + " / " + dayData.length, lbl: "Days logged" },
      { num: Math.round(avg("protein")) + "g", lbl: "Avg protein (goal " + goals.protein + "g)" },
      { num: Math.round(avg("carbs")) + "g / " + Math.round(avg("fat")) + "g", lbl: "Avg carbs / fat" }
    ];

    const burnedDays = dayData.filter(d => d.burned != null);
    if(burnedDays.length > 0){
      const avgBurned = burnedDays.reduce((s, d) => s + d.burned, 0) / burnedDays.length;
      stats.push({
        num: Math.round(avgBurned) + " kcal",
        lbl: "Avg burned (Garmin, " + burnedDays.length + " day" + (burnedDays.length === 1 ? "" : "s") + ")"
      });
    }

    const weightEntries = dayData.filter(d => d.weightKg != null);
    if(weightEntries.length > 0){
      const unit = loadWeightUnit();
      const latest = weightEntries[weightEntries.length - 1];
      const latestDisplay = unit === "kg" ? latest.weightKg : kgToLb(latest.weightKg);
      stats.push({
        num: round1(latestDisplay) + " " + unit,
        lbl: "Latest weight (" + trendDayLabel(latest.dateStr) + ")"
      });
      if(weightEntries.length > 1){
        const first = weightEntries[0];
        const deltaKg = latest.weightKg - first.weightKg;
        const deltaDisplay = unit === "kg" ? deltaKg : kgToLb(deltaKg);
        const rounded = round1(deltaDisplay);
        const sign = rounded > 0 ? "+" : "";
        stats.push({
          num: sign + rounded + " " + unit,
          lbl: "Weight change over range"
        });
      }
    }

    stats.forEach(s => {
      const box = document.createElement("div");
      box.className = "trend-stat";
      box.innerHTML = '<div class="num mono">' + escapeHtml(String(s.num)) +
        '</div><div class="lbl">' + escapeHtml(s.lbl) + '</div>';
      container.appendChild(box);
    });
  }

  // ---------- goals sheet ----------
  const goalsOverlay = document.getElementById("goalsOverlay");

  function openGoals(){
    const g = loadGoals();
    document.getElementById("goalCals").value = g.calories;
    document.getElementById("goalProtein").value = g.protein;
    document.getElementById("goalCarbs").value = g.carbs;
    document.getElementById("goalFat").value = g.fat;
    goalsOverlay.classList.add("open");
  }
  function closeGoals(){
    goalsOverlay.classList.remove("open");
  }
  function saveGoalsFromForm(){
    const goals = {
      calories: num(document.getElementById("goalCals").value) || DEFAULT_GOALS.calories,
      protein: num(document.getElementById("goalProtein").value) || DEFAULT_GOALS.protein,
      carbs: num(document.getElementById("goalCarbs").value) || DEFAULT_GOALS.carbs,
      fat: num(document.getElementById("goalFat").value) || DEFAULT_GOALS.fat
    };
    saveGoals(goals);
    closeGoals();
    render();
  }

  // ---------- macro calculator quiz ----------
  const calcOverlay = document.getElementById("calcOverlay");
  let quizUnits = "metric";
  let quizSex = "female";
  let lastCalcResults = null;

  function getGarminStats(){
    const map = loadGarminCalories();
    const values = Object.values(map);
    if(values.length === 0) return null;
    const sum = values.reduce((a, b) => a + b, 0);
    return { avg: sum / values.length, days: values.length };
  }

  function updateGarminActivityOption(){
    const select = document.getElementById("quizActivity");
    const existing = select.querySelector('option[value="garmin"]');
    const stats = getGarminStats();
    if(!stats){
      if(existing) existing.remove();
      return;
    }
    const label = "Use my Garmin data (avg " + Math.round(stats.avg) + " kcal/day active, " +
      stats.days + " day" + (stats.days === 1 ? "" : "s") + " logged)";
    if(existing){
      existing.textContent = label;
    } else {
      const opt = document.createElement("option");
      opt.value = "garmin";
      opt.textContent = label;
      select.insertBefore(opt, select.firstChild);
    }
    select.value = "garmin";
  }

  function prefillQuizWeightFromLog(){
    const map = loadWeights();
    const dates = Object.keys(map).sort((a, b) => b.localeCompare(a));
    if(dates.length === 0) return;
    const latestKg = map[dates[0]];
    const displayVal = quizUnits === "metric" ? latestKg : kgToLb(latestKg);
    document.getElementById("quizWeight").value = round1(displayVal);
  }

  function openCalc(){
    document.getElementById("quizForm").style.display = "block";
    document.getElementById("quizResults").style.display = "none";
    updateGarminActivityOption();
    prefillQuizWeightFromLog();
    calcOverlay.classList.add("open");
  }
  function closeCalc(){
    calcOverlay.classList.remove("open");
  }

  function setUnits(units){
    quizUnits = units;
    document.querySelectorAll("#unitsToggle button").forEach(b => {
      b.classList.toggle("active", b.dataset.units === units);
    });
    const metricOn = units === "metric";
    document.getElementById("quizWeightLabel").textContent = metricOn ? "Weight (kg)" : "Weight (lb)";
    document.getElementById("quizHeightMetricField").style.display = metricOn ? "block" : "none";
    document.getElementById("quizHeightImperialField").style.display = metricOn ? "none" : "grid";
  }
  function setSex(sex){
    quizSex = sex;
    document.querySelectorAll("#sexToggle button").forEach(b => {
      b.classList.toggle("active", b.dataset.sex === sex);
    });
  }

  function calculateMacros(){
    const age = num(document.getElementById("quizAge").value);
    const activityValue = document.getElementById("quizActivity").value;
    const goal = document.getElementById("quizGoal").value;

    let weightKg, heightCm;
    if(quizUnits === "metric"){
      weightKg = num(document.getElementById("quizWeight").value);
      heightCm = num(document.getElementById("quizHeightCm").value);
    } else {
      const weightLb = num(document.getElementById("quizWeight").value);
      const ft = num(document.getElementById("quizHeightFt").value);
      const inch = num(document.getElementById("quizHeightIn").value);
      weightKg = weightLb * 0.453592;
      heightCm = (ft * 12 + inch) * 2.54;
    }

    if(age <= 0 || weightKg <= 0 || heightCm <= 0){
      alert("Please fill in age, weight, and height to calculate your macros.");
      return null;
    }

    // Mifflin-St Jeor BMR
    const bmr = quizSex === "male"
      ? (10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5
      : (10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161;

    let tdee, tdeeSource;
    if(activityValue === "garmin"){
      const stats = getGarminStats();
      const avgBurn = stats ? stats.avg : 0;
      tdee = bmr + avgBurn;
      tdeeSource = "your BMR plus your average logged Garmin activity burn (" +
        Math.round(avgBurn) + " kcal/day over " + (stats ? stats.days : 0) + " day" +
        (stats && stats.days === 1 ? "" : "s") + ")";
    } else {
      const activity = num(activityValue);
      tdee = bmr * activity;
      tdeeSource = "the Mifflin-St Jeor formula with your selected activity level";
    }

    let calories = tdee;
    let goalNote = "maintenance";
    if(goal === "lose"){
      calories = tdee - 500;
      goalNote = "a ~500 kcal deficit for ~0.5kg/week loss";
    } else if(goal === "gain"){
      calories = tdee + 350;
      goalNote = "a ~350 kcal surplus for steady weight gain";
    }
    calories = Math.max(calories, 1200);

    // Protein: higher when losing (muscle preservation), moderate otherwise, g per kg bodyweight
    const proteinPerKg = goal === "lose" ? 2.2 : goal === "gain" ? 1.8 : 1.8;
    const proteinG = weightKg * proteinPerKg;
    const proteinCals = proteinG * 4;

    // Fat: ~28% of total calories
    const fatCals = calories * 0.28;
    const fatG = fatCals / 9;

    // Carbs: remainder
    const carbCals = Math.max(calories - proteinCals - fatCals, 0);
    const carbG = carbCals / 4;

    return {
      calories: Math.round(calories),
      protein: Math.round(proteinG),
      carbs: Math.round(carbG),
      fat: Math.round(fatG),
      tdee: Math.round(tdee),
      goalNote,
      tdeeSource
    };
  }

  function submitQuiz(){
    const results = calculateMacros();
    if(!results) return;
    lastCalcResults = results;

    document.getElementById("resCalories").textContent = results.calories;
    document.getElementById("resProtein").textContent = results.protein + "g";
    document.getElementById("resCarbs").textContent = results.carbs + "g";
    document.getElementById("resFat").textContent = results.fat + "g";
    document.getElementById("resTdeeNote").textContent =
      "Maintenance (TDEE) is ~" + results.tdee + " kcal, estimated from " + results.tdeeSource +
      " — this target reflects " + results.goalNote + ".";

    document.getElementById("quizForm").style.display = "none";
    document.getElementById("quizResults").style.display = "block";
  }

  function applyCalcResults(){
    if(!lastCalcResults) return;
    saveGoals({
      calories: lastCalcResults.calories,
      protein: lastCalcResults.protein,
      carbs: lastCalcResults.carbs,
      fat: lastCalcResults.fat
    });
    closeCalc();
    render();
  }

  // ---------- events ----------
  document.getElementById("prevDay").addEventListener("click", () => {
    currentDate = addDays(currentDate, -1);
    render();
  });
  document.getElementById("nextDay").addEventListener("click", () => {
    currentDate = addDays(currentDate, 1);
    render();
  });
  document.getElementById("addFab").addEventListener("click", openAddEntry);
  document.getElementById("favStarBtn").addEventListener("click", () => {
    isFavStarred = !isFavStarred;
    updateFavStarUI();
  });
  document.getElementById("entryCancelBtn").addEventListener("click", closeEntrySheet);
  document.getElementById("entrySaveBtn").addEventListener("click", saveEntry);

  document.getElementById("entryPhotoBtn").addEventListener("click", () => {
    document.getElementById("entryPhotoInput").click();
  });
  document.getElementById("entryPhotoInput").addEventListener("change", (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if(!file) return;
    resizeImageFile(file, 480, 0.6).then(dataUrl => {
      entryPhotoDataUrl = dataUrl;
      showEntryPhotoPreview(dataUrl);
    }).catch(() => {
      alert("Couldn't process that photo.");
    });
  });
  document.getElementById("entryPhotoRemoveBtn").addEventListener("click", () => {
    entryPhotoDataUrl = null;
    hideEntryPhotoPreview();
  });
  entryOverlay.addEventListener("click", (e) => { if(e.target === entryOverlay) closeEntrySheet(); });

  ["entryProtein", "entryCarbs", "entryFat"].forEach(id => {
    document.getElementById(id).addEventListener("input", () => {
      recalcCaloriesFromMacros("entryProtein", "entryCarbs", "entryFat", "entryCals");
      setEntryBaselineFromForm();
    });
  });
  document.getElementById("entryCals").addEventListener("input", setEntryBaselineFromForm);

  document.getElementById("entryServing").addEventListener("input", () => {
    if(!entryBaseline || !entryBaseline.qty || entryBaseline.qty <= 0) return;
    const newQty = parseServingQty(document.getElementById("entryServing").value);
    if(newQty === null || newQty <= 0) return;
    const ratio = newQty / entryBaseline.qty;
    document.getElementById("entryCals").value = Math.round(entryBaseline.calories * ratio);
    document.getElementById("entryProtein").value = Math.round(entryBaseline.protein * ratio);
    document.getElementById("entryCarbs").value = Math.round(entryBaseline.carbs * ratio);
    document.getElementById("entryFat").value = Math.round(entryBaseline.fat * ratio);
  });

  document.getElementById("foodSearchBtn").addEventListener("click", performFoodSearch);
  document.getElementById("foodSearchInput").addEventListener("keydown", (e) => {
    if(e.key === "Enter"){ e.preventDefault(); performFoodSearch(); }
  });
  document.getElementById("scanBarcodeBtn").addEventListener("click", openScanner);
  document.getElementById("scannerCloseBtn").addEventListener("click", closeScanner);
  document.getElementById("setApiKeyLink").addEventListener("click", openApiKeySheet);
  document.getElementById("apiKeyCancelBtn").addEventListener("click", closeApiKeySheet);
  document.getElementById("apiKeySaveBtn").addEventListener("click", saveApiKeyFromForm);
  apiKeyOverlay.addEventListener("click", (e) => { if(e.target === apiKeyOverlay) closeApiKeySheet(); });

  document.getElementById("importGarminBtn").addEventListener("click", () => {
    document.getElementById("garminFileInput").click();
  });
  document.getElementById("garminFileInput").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if(file) importGarminCsv(file);
    e.target.value = "";
  });
  document.getElementById("viewGarminHistoryBtn").addEventListener("click", openGarminHistory);
  document.getElementById("garminHistoryCloseBtn").addEventListener("click", closeGarminHistory);
  garminHistoryOverlay.addEventListener("click", (e) => { if(e.target === garminHistoryOverlay) closeGarminHistory(); });

  document.getElementById("viewFavoritesBtn").addEventListener("click", openFavoritesSheet);
  document.getElementById("favoritesCloseBtn").addEventListener("click", closeFavoritesSheet);
  favoritesOverlay.addEventListener("click", (e) => { if(e.target === favoritesOverlay) closeFavoritesSheet(); });

  document.getElementById("connectCalendarBtn").addEventListener("click", openCalendarSheet);
  document.getElementById("calendarCloseBtn").addEventListener("click", closeCalendarSheet);
  document.getElementById("gcalSaveClientIdBtn").addEventListener("click", saveGcalClientIdFromForm);
  document.getElementById("gcalSignInBtn").addEventListener("click", signInGoogleCalendar);
  document.getElementById("gcalSignOutBtn").addEventListener("click", signOutGoogleCalendar);
  calendarOverlay.addEventListener("click", (e) => { if(e.target === calendarOverlay) closeCalendarSheet(); });
  document.getElementById("calendarMoreBtn").addEventListener("click", () => {
    const list = document.getElementById("calendarCardList");
    list.style.display = list.style.display === "flex" ? "none" : "flex";
  });

  document.getElementById("menuBtn").addEventListener("click", openDrawer);
  document.getElementById("drawerCloseBtn").addEventListener("click", closeDrawer);
  drawerOverlay.addEventListener("click", (e) => { if(e.target === drawerOverlay) closeDrawer(); });
  ["editGoalsBtn", "calcMacrosBtn", "viewFavoritesBtn", "logWeightBtn", "importGarminBtn", "viewGarminHistoryBtn", "connectCalendarBtn", "backupDataBtn"].forEach(id => {
    document.getElementById(id).addEventListener("click", closeDrawer);
  });

  document.getElementById("backupDataBtn").addEventListener("click", openBackupSheet);
  document.getElementById("backupCloseBtn").addEventListener("click", closeBackupSheet);
  backupOverlay.addEventListener("click", (e) => { if(e.target === backupOverlay) closeBackupSheet(); });
  document.getElementById("backupExportBtn").addEventListener("click", exportBackup);
  document.getElementById("backupImportBtn").addEventListener("click", () => {
    document.getElementById("backupFileInput").click();
  });
  document.getElementById("backupFileInput").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if(file) restoreBackupFromFile(file);
    e.target.value = "";
  });

  document.getElementById("logWeightBtn").addEventListener("click", openWeightSheet);
  document.getElementById("weightCancelBtn").addEventListener("click", closeWeightSheet);
  document.getElementById("weightSaveBtn").addEventListener("click", saveWeightFromForm);
  weightOverlay.addEventListener("click", (e) => { if(e.target === weightOverlay) closeWeightSheet(); });
  document.querySelectorAll("#weightUnitsToggle button").forEach(btn => {
    btn.addEventListener("click", () => setWeightSheetUnit(btn.dataset.unit));
  });

  document.getElementById("themeToggleBtn").addEventListener("click", toggleTheme);
  document.getElementById("trendsBtn").addEventListener("click", openTrends);
  document.getElementById("trendsCloseBtn").addEventListener("click", closeTrends);
  trendsOverlay.addEventListener("click", (e) => { if(e.target === trendsOverlay) closeTrends(); });
  document.querySelectorAll("#trendsRangeToggle button").forEach(btn => {
    btn.addEventListener("click", () => {
      trendsRangeDays = parseInt(btn.dataset.days, 10);
      document.querySelectorAll("#trendsRangeToggle button").forEach(b => b.classList.toggle("active", b === btn));
      renderTrends();
    });
  });

  document.getElementById("editGoalsBtn").addEventListener("click", openGoals);
  document.getElementById("goalsCancelBtn").addEventListener("click", closeGoals);
  document.getElementById("goalsSaveBtn").addEventListener("click", saveGoalsFromForm);
  goalsOverlay.addEventListener("click", (e) => { if(e.target === goalsOverlay) closeGoals(); });

  ["goalProtein", "goalCarbs", "goalFat"].forEach(id => {
    document.getElementById(id).addEventListener("input", () => {
      recalcCaloriesFromMacros("goalProtein", "goalCarbs", "goalFat", "goalCals");
    });
  });

  document.getElementById("calcMacrosBtn").addEventListener("click", openCalc);
  document.getElementById("calcCancelBtn").addEventListener("click", closeCalc);
  document.getElementById("calcBackBtn").addEventListener("click", () => {
    document.getElementById("quizForm").style.display = "block";
    document.getElementById("quizResults").style.display = "none";
  });
  document.getElementById("calcSubmitBtn").addEventListener("click", submitQuiz);
  document.getElementById("calcApplyBtn").addEventListener("click", applyCalcResults);
  calcOverlay.addEventListener("click", (e) => { if(e.target === calcOverlay) closeCalc(); });

  document.querySelectorAll("#unitsToggle button").forEach(btn => {
    btn.addEventListener("click", () => setUnits(btn.dataset.units));
  });
  document.querySelectorAll("#sexToggle button").forEach(btn => {
    btn.addEventListener("click", () => setSex(btn.dataset.sex));
  });

  // ---------- init ----------
  applyTheme(loadTheme());
  render();
  initGoogleCalendarOnLoad();

  if("serviceWorker" in navigator && location.protocol !== "file:"){
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }
})();
