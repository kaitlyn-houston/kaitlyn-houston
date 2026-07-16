(function(){
  "use strict";

  const STORAGE_KEY = "macroTracker.entries.v1";
  const GOALS_KEY = "macroTracker.goals.v1";
  const FAVORITES_KEY = "macroTracker.favorites.v1";
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

  // ---------- helpers ----------
  function todayStr(){
    const d = new Date();
    return d.toISOString().slice(0,10);
  }
  function addDays(dateStr, delta){
    const d = new Date(dateStr + "T00:00:00");
    d.setDate(d.getDate() + delta);
    return d.toISOString().slice(0,10);
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

  // ---------- rendering ----------
  function entriesForDate(dateStr){
    return loadEntries().filter(e => e.date === dateStr);
  }

  function render(){
    document.getElementById("dateLabel").textContent = formatDateLabel(currentDate);
    const entries = entriesForDate(currentDate);
    const goals = loadGoals();

    const totals = entries.reduce((acc, e) => {
      acc.calories += num(e.calories);
      acc.protein += num(e.protein);
      acc.carbs += num(e.carbs);
      acc.fat += num(e.fat);
      return acc;
    }, { calories:0, protein:0, carbs:0, fat:0 });

    renderSummary(totals, goals);
    renderMeals(entries);
  }

  function renderSummary(totals, goals){
    document.getElementById("calNum").textContent = Math.round(totals.calories);
    document.getElementById("calGoalLabel").textContent = goals.calories;

    const circumference = 364;
    const pct = goals.calories > 0 ? Math.min(totals.calories / goals.calories, 1) : 0;
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
      empty.textContent = "Nothing logged yet. Tap + to add food.";
      container.appendChild(empty);
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
        card.innerHTML = `
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

  function escapeHtml(str){
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }

  // ---------- entry sheet ----------
  const entryOverlay = document.getElementById("entryOverlay");

  function openAddEntry(){
    editingEntryId = null;
    isFavStarred = false;
    document.getElementById("entrySheetTitle").textContent = "Log food";
    document.getElementById("entryName").value = "";
    document.getElementById("entryMeal").value = guessMealByTime();
    document.getElementById("entryServing").value = "";
    document.getElementById("entryCals").value = "";
    document.getElementById("entryProtein").value = "";
    document.getElementById("entryCarbs").value = "";
    document.getElementById("entryFat").value = "";
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
    isFavStarred = loadFavorites().some(f => f.name.toLowerCase() === e.name.toLowerCase());
    updateFavStarUI();
    renderFavsRow();
    entryOverlay.classList.add("open");
  }

  function closeEntrySheet(){
    entryOverlay.classList.remove("open");
    editingEntryId = null;
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
      date: currentDate
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

  function openCalc(){
    document.getElementById("quizForm").style.display = "block";
    document.getElementById("quizResults").style.display = "none";
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
    const activity = num(document.getElementById("quizActivity").value);
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

    const tdee = bmr * activity;

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
      goalNote
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
      "Maintenance (TDEE) is ~" + results.tdee + " kcal — this target reflects " + results.goalNote + ".";

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
  entryOverlay.addEventListener("click", (e) => { if(e.target === entryOverlay) closeEntrySheet(); });

  document.getElementById("editGoalsBtn").addEventListener("click", openGoals);
  document.getElementById("goalsCancelBtn").addEventListener("click", closeGoals);
  document.getElementById("goalsSaveBtn").addEventListener("click", saveGoalsFromForm);
  goalsOverlay.addEventListener("click", (e) => { if(e.target === goalsOverlay) closeGoals(); });

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
  render();
})();
