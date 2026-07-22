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
  const GCAL_CALENDAR_IDS_KEY = "macroTracker.gcalCalendarIds.v1";
  const GCAL_WORKOUT_CALENDAR_IDS_KEY = "macroTracker.gcalWorkoutCalendarIds.v1";
  const FIREBASE_CONFIG_KEY = "macroTracker.firebaseConfig.v1";
  const WEIGHT_KEY = "macroTracker.weight.v1";
  const WEIGHT_UNIT_KEY = "macroTracker.weightUnit.v1";
  const THEME_KEY = "macroTracker.theme.v1";
  const WATER_KEY = "macroTracker.water.v1";
  const WATER_GOAL_KEY = "macroTracker.waterGoal.v1";
  const CAFFEINE_KEY = "macroTracker.caffeine.v1";
  const CAFFEINE_GOAL_KEY = "macroTracker.caffeineGoal.v1";
  const ALCOHOL_KEY = "macroTracker.alcohol.v1";
  const ALCOHOL_GOAL_KEY = "macroTracker.alcoholGoal.v1";
  const TEMPLATES_KEY = "macroTracker.mealTemplates.v1";
  const WEEKDAY_GOALS_KEY = "macroTracker.weekdayGoals.v1";
  const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const WORKOUT_PLAN_KEY = "macroTracker.workoutPlan.v1";
  const WORKOUT_DAY_ABBRS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const WORKOUT_TEMPLATES = {
    fatloss: [
      { name: "Full Body Strength", exercises: "Squats, Push-ups, Bent-over Rows, Plank — 3x10-12" },
      { name: "Cardio Intervals", exercises: "20-25 min HIIT (bike, run, or rower)" },
      { name: "Full Body Strength", exercises: "Deadlifts, Overhead Press, Lunges, Side Plank — 3x10-12" },
      { name: "Steady Cardio", exercises: "30-40 min brisk walk, jog, or cycle" },
      { name: "Full Body Strength", exercises: "Goblet Squats, Bench Press, Rows, Mountain Climbers — 3x10-12" },
      { name: "Active Recovery", exercises: "Yoga or a light mobility walk" }
    ],
    muscle: [
      { name: "Push Day", exercises: "Bench Press, Overhead Press, Triceps Dips — 4x8-10" },
      { name: "Pull Day", exercises: "Deadlifts, Barbell Rows, Bicep Curls — 4x8-10" },
      { name: "Leg Day", exercises: "Squats, Romanian Deadlifts, Calf Raises — 4x8-10" },
      { name: "Push Day", exercises: "Incline Press, Lateral Raises, Triceps Pushdowns — 3x10-12" },
      { name: "Pull Day", exercises: "Pull-ups, Cable Rows, Face Pulls — 3x10-12" },
      { name: "Leg Day", exercises: "Front Squats, Walking Lunges, Leg Press — 3x10-12" }
    ],
    endurance: [
      { name: "Easy Run/Cycle", exercises: "30 min at an easy, conversational pace" },
      { name: "Interval Training", exercises: "6x400m repeats or 20 min HIIT" },
      { name: "Strength Support", exercises: "Squats, Lunges, Core circuit — 3x12" },
      { name: "Long Steady Cardio", exercises: "45-60 min at a steady pace" },
      { name: "Tempo Effort", exercises: "20-30 min at a comfortably hard pace" },
      { name: "Cross-training", exercises: "Swim, row, or hike" }
    ],
    general: [
      { name: "Full Body Strength", exercises: "Squats, Push-ups, Rows, Plank — 3x10-12" },
      { name: "Cardio", exercises: "20-30 min of your choice (walk, bike, swim)" },
      { name: "Mobility / Yoga", exercises: "20-30 min stretching or a yoga flow" },
      { name: "Full Body Strength", exercises: "Lunges, Overhead Press, Deadlifts, Side Plank — 3x10-12" },
      { name: "Cardio", exercises: "20-30 min of your choice" },
      { name: "Active Recovery", exercises: "Light walk or mobility work" }
    ]
  };
  const WORKOUT_DAY_SLOTS = {
    3: [0, 2, 4],
    4: [0, 1, 3, 4],
    5: [0, 1, 2, 4, 5],
    6: [0, 1, 2, 3, 4, 5]
  };
  const WORKOUT_KEYWORDS = [
    "run", "ride", "cycle", "cycling", "bike", "swim", "workout", "training",
    "gym", "yoga", "hiit", "race", "spin", "pilates", "crossfit", "bootcamp",
    "walk", "hike", "strength", "cardio"
  ];
  const NON_WORKOUT_LABELS = [
    "rest", "work", "working", "off", "day off", "off day", "busy",
    "travel", "sick", "vacation", "holiday", "none", "n/a"
  ];
  let lastWorkoutRecommendation = null;
  const DEFAULT_GOALS = { calories: 2000, protein: 150, carbs: 200, fat: 65 };
  const FIBER_GOAL_G = 25;
  const SUGAR_LIMIT_G = 50;
  const SODIUM_LIMIT_MG = 2300;
  const REMINDERS_KEY = "macroTracker.reminders.v1";
  const NOTIFIED_LOG_KEY = "macroTracker.notifiedLog.v1";
  const CHECKIN_LOG_KEY = "macroTracker.checkinLog.v1";
  const DEFAULT_REMINDERS = {
    waterEnabled: false, waterTime: "18:00",
    mealEnabled: false, mealTime: "20:00",
    workoutEnabled: false
  };

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
  function loadGcalCalendarIds(){
    try{
      const raw = localStorage.getItem(GCAL_CALENDAR_IDS_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return (Array.isArray(parsed) && parsed.length > 0) ? parsed : ["primary"];
    }catch(e){ return ["primary"]; }
  }
  function saveGcalCalendarIds(ids){
    localStorage.setItem(GCAL_CALENDAR_IDS_KEY, JSON.stringify(ids));
  }
  function loadGcalWorkoutCalendarIds(){
    try{
      const raw = localStorage.getItem(GCAL_WORKOUT_CALENDAR_IDS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    }catch(e){ return []; }
  }
  function saveGcalWorkoutCalendarIds(ids){
    localStorage.setItem(GCAL_WORKOUT_CALENDAR_IDS_KEY, JSON.stringify(ids));
  }
  function loadFirebaseConfig(){
    try{
      const raw = localStorage.getItem(FIREBASE_CONFIG_KEY);
      return raw ? JSON.parse(raw) : null;
    }catch(e){ return null; }
  }
  function saveFirebaseConfig(config){
    localStorage.setItem(FIREBASE_CONFIG_KEY, JSON.stringify(config));
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
  function loadWater(){
    try{
      const raw = localStorage.getItem(WATER_KEY);
      return raw ? JSON.parse(raw) : {};
    }catch(e){ return {}; }
  }
  function saveWater(map){
    localStorage.setItem(WATER_KEY, JSON.stringify(map));
  }
  function loadWaterGoal(){
    const raw = num(localStorage.getItem(WATER_GOAL_KEY));
    return raw > 0 ? raw : 2000;
  }
  function saveWaterGoal(ml){
    localStorage.setItem(WATER_GOAL_KEY, String(ml));
  }
  function loadCaffeine(){
    try{
      const raw = localStorage.getItem(CAFFEINE_KEY);
      return raw ? JSON.parse(raw) : {};
    }catch(e){ return {}; }
  }
  function saveCaffeine(map){
    localStorage.setItem(CAFFEINE_KEY, JSON.stringify(map));
  }
  function loadCaffeineGoal(){
    const raw = num(localStorage.getItem(CAFFEINE_GOAL_KEY));
    return raw > 0 ? raw : 400;
  }
  function saveCaffeineGoal(mg){
    localStorage.setItem(CAFFEINE_GOAL_KEY, String(mg));
  }
  function loadAlcohol(){
    try{
      const raw = localStorage.getItem(ALCOHOL_KEY);
      return raw ? JSON.parse(raw) : {};
    }catch(e){ return {}; }
  }
  function saveAlcohol(map){
    localStorage.setItem(ALCOHOL_KEY, JSON.stringify(map));
  }
  function loadAlcoholGoal(){
    const raw = num(localStorage.getItem(ALCOHOL_GOAL_KEY));
    return raw > 0 ? raw : 14;
  }
  function saveAlcoholGoal(units){
    localStorage.setItem(ALCOHOL_GOAL_KEY, String(units));
  }
  function loadTemplates(){
    try{
      const raw = localStorage.getItem(TEMPLATES_KEY);
      return raw ? JSON.parse(raw) : [];
    }catch(e){ return []; }
  }
  function saveTemplates(list){
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(list));
  }
  function loadWeekdayGoals(){
    try{
      const raw = localStorage.getItem(WEEKDAY_GOALS_KEY);
      return raw ? JSON.parse(raw) : {};
    }catch(e){ return {}; }
  }
  function saveWeekdayGoals(map){
    localStorage.setItem(WEEKDAY_GOALS_KEY, JSON.stringify(map));
  }
  function getGoalsForDate(dateStr){
    const dow = new Date(dateStr + "T00:00:00").getDay();
    const overrides = loadWeekdayGoals();
    return overrides[dow] || loadGoals();
  }
  function loadWorkoutPlan(){
    try{
      const raw = localStorage.getItem(WORKOUT_PLAN_KEY);
      return raw ? JSON.parse(raw) : {};
    }catch(e){ return {}; }
  }
  function saveWorkoutPlan(map){
    localStorage.setItem(WORKOUT_PLAN_KEY, JSON.stringify(map));
  }
  function loadReminders(){
    try{
      const raw = localStorage.getItem(REMINDERS_KEY);
      return raw ? { ...DEFAULT_REMINDERS, ...JSON.parse(raw) } : { ...DEFAULT_REMINDERS };
    }catch(e){ return { ...DEFAULT_REMINDERS }; }
  }
  function saveReminders(r){
    localStorage.setItem(REMINDERS_KEY, JSON.stringify(r));
  }
  function loadNotifiedLog(){
    try{
      const raw = localStorage.getItem(NOTIFIED_LOG_KEY);
      return raw ? JSON.parse(raw) : {};
    }catch(e){ return {}; }
  }
  function saveNotifiedLog(log){
    const today = todayStr();
    const pruned = {};
    Object.keys(log).forEach(k => { if(k.endsWith(":" + today)) pruned[k] = log[k]; });
    localStorage.setItem(NOTIFIED_LOG_KEY, JSON.stringify(pruned));
  }
  function maybeNotify(key, dateStr, title, body){
    if(!("Notification" in window) || Notification.permission !== "granted") return;
    const log = loadNotifiedLog();
    const logKey = key + ":" + dateStr;
    if(log[logKey]) return;
    try{ new Notification(title, { body, icon: "icons/icon-192.png" }); }catch(e){ return; }
    log[logKey] = true;
    saveNotifiedLog(log);
  }
  function checkReminders(){
    const r = loadReminders();
    const today = todayStr();
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const banner = document.getElementById("reminderBanner");
    let message = null;

    if(r.waterEnabled){
      const [h, m] = r.waterTime.split(":").map(Number);
      if(currentMinutes >= h * 60 + m){
        const ml = loadWater()[today] || 0;
        const goal = loadWaterGoal();
        if(ml < goal * 0.5){
          message = "💧 You're behind on water today — " + ml + " / " + goal + " ml so far.";
          maybeNotify("water", today, "Water reminder", message);
        }
      }
    }
    if(!message && r.mealEnabled){
      const [h, m] = r.mealTime.split(":").map(Number);
      if(currentMinutes >= h * 60 + m){
        if(entriesForDate(today).length === 0){
          message = "🍽️ Nothing logged yet today.";
          maybeNotify("meal", today, "Log your food", message);
        }
      }
    }
    if(!message && r.workoutEnabled){
      const entry = loadWorkoutPlan()[today];
      if(entry && entry.label && !entry.done && !NON_WORKOUT_LABELS.includes(entry.label.trim().toLowerCase())){
        message = "🏋️ Today's planned workout (" + entry.label + ") isn't marked done yet.";
        maybeNotify("workout", today, "Workout reminder", message);
      }
    }

    if(!banner) return;
    if(message){
      banner.textContent = message;
      banner.style.display = "block";
    } else {
      banner.style.display = "none";
    }
  }

  // ---------- reminders sheet ----------
  const remindersOverlay = document.getElementById("remindersOverlay");

  function openRemindersSheet(){
    const r = loadReminders();
    document.getElementById("remWaterEnabled").checked = r.waterEnabled;
    document.getElementById("remWaterTime").value = r.waterTime;
    document.getElementById("remMealEnabled").checked = r.mealEnabled;
    document.getElementById("remMealTime").value = r.mealTime;
    document.getElementById("remWorkoutEnabled").checked = r.workoutEnabled;
    updateNotifPermNote();
    remindersOverlay.classList.add("open");
  }
  function closeRemindersSheet(){
    remindersOverlay.classList.remove("open");
  }
  function updateNotifPermNote(){
    const btn = document.getElementById("remEnableNotifsBtn");
    if(!("Notification" in window)){
      btn.textContent = "Notifications not supported here";
      btn.disabled = true;
      return;
    }
    if(Notification.permission === "granted"){
      btn.textContent = "Notifications enabled ✓";
      btn.disabled = true;
    } else {
      btn.textContent = "Enable notifications";
      btn.disabled = false;
    }
  }
  function requestNotificationPermission(){
    if(!("Notification" in window)) return;
    Notification.requestPermission().then(updateNotifPermNote);
  }
  function saveRemindersFromForm(){
    saveReminders({
      waterEnabled: document.getElementById("remWaterEnabled").checked,
      waterTime: document.getElementById("remWaterTime").value || "18:00",
      mealEnabled: document.getElementById("remMealEnabled").checked,
      mealTime: document.getElementById("remMealTime").value || "20:00",
      workoutEnabled: document.getElementById("remWorkoutEnabled").checked
    });
    closeRemindersSheet();
    checkReminders();
  }

  function currentWeekDates(refDateStr){
    const ref = refDateStr || todayStr();
    const dow = new Date(ref + "T00:00:00").getDay();
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    const monday = addDays(ref, mondayOffset);
    const dates = [];
    for(let i = 0; i < 7; i++) dates.push(addDays(monday, i));
    return dates;
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
      acc.fiber += num(e.fiber);
      acc.sugar += num(e.sugar);
      acc.sodium += num(e.sodium);
      return acc;
    }, { calories:0, protein:0, carbs:0, fat:0, fiber:0, sugar:0, sodium:0 });
  }

  function render(){
    document.getElementById("dateLabel").textContent = formatDateLabel(currentDate);
    const entries = entriesForDate(currentDate);
    const goals = getGoalsForDate(currentDate);
    const totals = totalsForEntries(entries);

    renderSummary(totals, goals);
    renderMeals(entries);
    renderBurnedCard(totals);
    renderWeightCard();
    renderWaterCard();
    renderCaffeineCard();
    renderAlcoholCard();
    renderWorkoutCard();
    renderActivityCard();
    renderCalendarCard();
    renderMicroCard(totals);
    renderInsight(totals, goals);
    scheduleCloudSync();
    checkReminders();
  }

  function renderMicroCard(totals){
    const fiberEl = document.getElementById("fiberVal");
    const sugarEl = document.getElementById("sugarVal");
    const sodiumEl = document.getElementById("sodiumVal");
    fiberEl.textContent = Math.round(totals.fiber) + "g";
    fiberEl.className = "micro-value mono" + (totals.fiber >= FIBER_GOAL_G ? " good" : "");
    sugarEl.textContent = Math.round(totals.sugar) + "g";
    sugarEl.className = "micro-value mono" + (totals.sugar > SUGAR_LIMIT_G ? " warn" : "");
    sodiumEl.textContent = Math.round(totals.sodium) + "mg";
    sodiumEl.className = "micro-value mono" + (totals.sodium > SODIUM_LIMIT_MG ? " warn" : "");
  }

  function renderWaterCard(){
    const ml = loadWater()[currentDate] || 0;
    const goal = loadWaterGoal();
    document.getElementById("waterAmountNum").textContent = ml + " / " + goal + " ml";
    const pct = goal > 0 ? Math.min((ml / goal) * 100, 100) : 0;
    document.getElementById("waterBar").style.width = pct + "%";
  }

  function addWater(deltaMl){
    const map = loadWater();
    const cur = map[currentDate] || 0;
    map[currentDate] = Math.max(cur + deltaMl, 0);
    saveWater(map);
    renderWaterCard();
  }

  function resetWaterToday(){
    if(!confirm("Reset today's water to 0?")) return;
    const map = loadWater();
    map[currentDate] = 0;
    saveWater(map);
    renderWaterCard();
  }

  function promptWaterGoal(){
    const input = prompt("Daily water goal (ml):", String(loadWaterGoal()));
    if(input == null) return;
    const val = num(input);
    if(val > 0){
      saveWaterGoal(Math.round(val));
      renderWaterCard();
    }
  }

  function renderCaffeineCard(){
    const mg = loadCaffeine()[currentDate] || 0;
    const goal = loadCaffeineGoal();
    document.getElementById("caffeineAmountNum").textContent = mg + " / " + goal + " mg";
    const pct = goal > 0 ? Math.min((mg / goal) * 100, 100) : 0;
    const bar = document.getElementById("caffeineBar");
    bar.style.width = pct + "%";
    bar.style.background = mg > goal ? "var(--danger)" : "var(--fat)";
  }

  function addCaffeine(deltaMg){
    const map = loadCaffeine();
    const cur = map[currentDate] || 0;
    map[currentDate] = Math.max(cur + deltaMg, 0);
    saveCaffeine(map);
    renderCaffeineCard();
  }

  function resetCaffeineToday(){
    if(!confirm("Reset today's caffeine to 0?")) return;
    const map = loadCaffeine();
    map[currentDate] = 0;
    saveCaffeine(map);
    renderCaffeineCard();
  }

  function promptCaffeineGoal(){
    const input = prompt("Daily caffeine limit (mg):", String(loadCaffeineGoal()));
    if(input == null) return;
    const val = num(input);
    if(val > 0){
      saveCaffeineGoal(Math.round(val));
      renderCaffeineCard();
    }
  }

  function renderAlcoholCard(){
    const map = loadAlcohol();
    const units = map[currentDate] || 0;
    const goal = loadAlcoholGoal();
    const weekTotal = currentWeekDates(currentDate).reduce((sum, d) => sum + (map[d] || 0), 0);
    document.getElementById("alcoholAmountNum").textContent = units + " units today";
    document.getElementById("alcoholWeekNum").textContent = weekTotal + " / " + goal + " units this week";
    const pct = goal > 0 ? Math.min((weekTotal / goal) * 100, 100) : 0;
    const bar = document.getElementById("alcoholBar");
    bar.style.width = pct + "%";
    bar.style.background = weekTotal > goal ? "var(--danger)" : "var(--protein)";
  }

  function addAlcohol(deltaUnits){
    const map = loadAlcohol();
    const cur = map[currentDate] || 0;
    map[currentDate] = Math.max(cur + deltaUnits, 0);
    saveAlcohol(map);
    renderAlcoholCard();
  }

  function resetAlcoholToday(){
    if(!confirm("Reset today's alcohol to 0?")) return;
    const map = loadAlcohol();
    map[currentDate] = 0;
    saveAlcohol(map);
    renderAlcoholCard();
  }

  function promptAlcoholGoal(){
    const input = prompt("Weekly alcohol limit (units):", String(loadAlcoholGoal()));
    if(input == null) return;
    const val = num(input);
    if(val > 0){
      saveAlcoholGoal(Math.round(val));
      renderAlcoholCard();
    }
  }

  const WORKOUT_WINDOW_START_HOUR = 6;
  const WORKOUT_WINDOW_END_HOUR = 21;
  const MIN_WORKOUT_GAP_MINUTES = 30;

  function formatTimeShort(d){
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }

  function findBestWorkoutWindow(events, dateStr){
    const dayStart = new Date(dateStr + "T00:00:00");
    dayStart.setHours(WORKOUT_WINDOW_START_HOUR, 0, 0, 0);
    const dayEnd = new Date(dateStr + "T00:00:00");
    dayEnd.setHours(WORKOUT_WINDOW_END_HOUR, 0, 0, 0);

    const busy = events
      .filter(ev => ev.start && ev.start.dateTime && ev.end && ev.end.dateTime)
      .map(ev => ({ start: new Date(ev.start.dateTime), end: new Date(ev.end.dateTime) }))
      .filter(b => b.end > dayStart && b.start < dayEnd)
      .map(b => ({
        start: b.start < dayStart ? dayStart : b.start,
        end: b.end > dayEnd ? dayEnd : b.end
      }))
      .sort((a, b) => a.start - b.start);

    const merged = [];
    busy.forEach(b => {
      const last = merged[merged.length - 1];
      if(last && b.start <= last.end){
        if(b.end > last.end) last.end = b.end;
      } else {
        merged.push({ start: b.start, end: b.end });
      }
    });

    const gaps = [];
    let cursor = dayStart;
    merged.forEach(b => {
      if(b.start > cursor) gaps.push({ start: cursor, end: b.start });
      if(b.end > cursor) cursor = b.end;
    });
    if(cursor < dayEnd) gaps.push({ start: cursor, end: dayEnd });

    if(gaps.length === 0) return null;
    const best = gaps.reduce((a, b) => ((b.end - b.start) > (a.end - a.start) ? b : a));
    const minutes = (best.end - best.start) / 60000;
    return minutes >= MIN_WORKOUT_GAP_MINUTES ? best : null;
  }

  async function renderWorkoutCard(){
    const plan = loadWorkoutPlan();
    const viewedDate = currentDate;
    const dates = currentWeekDates(viewedDate);

    const strip = document.getElementById("workoutWeekStrip");
    strip.innerHTML = "";
    dates.forEach((d, idx) => {
      const entry = plan[d];
      let cls = "workout-day-pill";
      if(d === viewedDate) cls += " today";
      if(entry && entry.label && !NON_WORKOUT_LABELS.includes(entry.label.trim().toLowerCase())) cls += " planned";
      if(entry && entry.done) cls += " done";
      const pill = document.createElement("div");
      pill.className = cls;
      pill.textContent = WORKOUT_DAY_ABBRS[idx];
      pill.title = entry && entry.label ? entry.label + (entry.done ? " (done)" : "") : "Nothing planned";
      strip.appendChild(pill);
    });

    const viewedEntry = plan[viewedDate];
    const dayLabel = formatDateLabel(viewedDate);
    const label = document.getElementById("workoutTodayLabel");
    label.textContent = viewedEntry && viewedEntry.label
      ? dayLabel + ": " + viewedEntry.label + (viewedEntry.done ? " ✓" : "")
      : "Nothing planned for " + dayLabel + ".";

    const bestTimeEl = document.getElementById("workoutBestTime");
    bestTimeEl.textContent = "";
    const hasWorkoutPlanned = viewedEntry && viewedEntry.label &&
      !NON_WORKOUT_LABELS.includes(viewedEntry.label.trim().toLowerCase());

    const doneBtn = document.getElementById("workoutDoneBtn");
    if(hasWorkoutPlanned){
      doneBtn.style.display = "block";
      doneBtn.classList.toggle("is-done", !!viewedEntry.done);
      doneBtn.textContent = viewedEntry.done ? "✓ Completed" : "Mark as done";
    } else {
      doneBtn.style.display = "none";
    }

    if(!hasWorkoutPlanned || !gcalAccessToken) return;
    const events = await fetchCalendarEventsForDate(viewedDate);
    if(viewedDate !== currentDate) return; // user navigated away while this was in flight
    if(events === null) return;
    const window = findBestWorkoutWindow(events, viewedDate);
    bestTimeEl.textContent = window
      ? "🕐 Best window " + dayLabel + ": " + formatTimeShort(window.start) + " – " + formatTimeShort(window.end)
      : "🕐 " + dayLabel + " looks packed — no clear " + MIN_WORKOUT_GAP_MINUTES + "+ min opening between " +
        WORKOUT_WINDOW_START_HOUR + "am–" + (WORKOUT_WINDOW_END_HOUR - 12) + "pm.";
  }

  function toggleWorkoutDone(){
    const plan = loadWorkoutPlan();
    const entry = plan[currentDate];
    if(!entry || !entry.label) return;
    entry.done = !entry.done;
    saveWorkoutPlan(plan);
    renderWorkoutCard();
  }

  // ---------- workout plan sheet ----------
  const workoutPlanOverlay = document.getElementById("workoutPlanOverlay");

  function openWorkoutPlanSheet(){
    renderWorkoutPlanForm();
    workoutPlanOverlay.classList.add("open");
  }
  function closeWorkoutPlanSheet(){
    workoutPlanOverlay.classList.remove("open");
  }

  function renderWorkoutPlanForm(){
    const plan = loadWorkoutPlan();
    const dates = currentWeekDates();
    const today = todayStr();
    const container = document.getElementById("workoutPlanList");
    container.innerHTML = "";

    dates.forEach((d, idx) => {
      const entry = plan[d] || { label: "", done: false };
      const dLabel = new Date(d + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
      const row = document.createElement("div");
      row.className = "workout-plan-row" + (d === today ? " today" : "");
      row.innerHTML = `
        <div class="workout-plan-head">
          <span class="workout-plan-day">${WORKOUT_DAY_ABBRS[idx]} · ${dLabel}</span>
          <label class="workout-plan-done">
            <input type="checkbox" class="workout-done-toggle" data-date="${d}" ${entry.done ? "checked" : ""}>
            Done
          </label>
        </div>
        <input type="text" class="mono-input workout-label-input" data-date="${d}" placeholder="e.g. Leg day, Rest, 5k run" value="${escapeHtml(entry.label)}">
      `;
      container.appendChild(row);
    });
  }

  function saveWorkoutPlanFromForm(){
    const plan = loadWorkoutPlan();
    document.querySelectorAll(".workout-label-input").forEach(input => {
      const d = input.dataset.date;
      const label = input.value.trim();
      const doneToggle = document.querySelector('.workout-done-toggle[data-date="' + d + '"]');
      const done = doneToggle ? doneToggle.checked : false;
      if(!label && !done){
        delete plan[d];
      } else {
        plan[d] = { label, done };
      }
    });
    saveWorkoutPlan(plan);
    closeWorkoutPlanSheet();
    renderWorkoutCard();
  }

  // ---------- workout recommendations sheet ----------
  const workoutRecOverlay = document.getElementById("workoutRecOverlay");

  function openWorkoutRecSheet(){
    document.getElementById("workoutRecForm").style.display = "block";
    document.getElementById("workoutRecResults").style.display = "none";
    workoutRecOverlay.classList.add("open");
  }
  function closeWorkoutRecSheet(){
    workoutRecOverlay.classList.remove("open");
  }
  function backToWorkoutRecForm(){
    document.getElementById("workoutRecForm").style.display = "block";
    document.getElementById("workoutRecResults").style.display = "none";
  }

  function eventDurationHours(ev){
    const start = ev.start && ev.start.dateTime ? new Date(ev.start.dateTime) : null;
    const end = ev.end && ev.end.dateTime ? new Date(ev.end.dateTime) : null;
    if(start && end){
      return Math.max((end - start) / 3600000, 0);
    }
    return 2; // all-day / date-only event: no time range, so use a flat estimate
  }

  function isWorkoutEvent(ev){
    if(ev._calendarId && loadGcalWorkoutCalendarIds().includes(ev._calendarId)) return true;
    const title = (ev.summary || "").toLowerCase();
    return WORKOUT_KEYWORDS.some(k => title.includes(k));
  }

  async function computeWeekBusyness(dates){
    if(!gcalAccessToken) return null;
    const results = await Promise.all(dates.map(d => fetchCalendarEventsForDate(d)));
    if(results.every(r => r === null)) return null;
    const map = {};
    dates.forEach((d, i) => {
      const events = results[i] || [];
      const workoutEvents = events.filter(isWorkoutEvent);
      map[d] = {
        hours: events.reduce((sum, ev) => sum + eventDurationHours(ev), 0),
        workoutTitle: workoutEvents.length > 0
          ? workoutEvents.map(ev => ev.summary || "Workout").join(" + ")
          : null
      };
    });
    return map;
  }

  async function generateWorkoutRecommendation(){
    const goal = document.getElementById("recGoalSelect").value;
    const days = parseInt(document.getElementById("recDaysSelect").value, 10);
    const template = WORKOUT_TEMPLATES[goal];
    const dates = currentWeekDates();

    const genBtn = document.getElementById("recGenerateBtn");
    genBtn.disabled = true;
    genBtn.textContent = gcalAccessToken ? "Checking your calendar…" : "Generating…";

    const busyness = await computeWeekBusyness(dates);

    const plan = WORKOUT_DAY_ABBRS.map(() => null);
    const filledIdx = new Set();

    // Lock in days that already have a workout-like event on the calendar — don't suggest over them.
    if(busyness){
      dates.forEach((d, idx) => {
        const info = busyness[d];
        if(info && info.workoutTitle){
          plan[idx] = { name: info.workoutTitle, exercises: "Already on your calendar", fromCalendar: true };
          filledIdx.add(idx);
        }
      });
    }

    const remaining = Math.max(days - filledIdx.size, 0);
    let candidateIdx;
    if(busyness){
      candidateIdx = dates
        .map((d, idx) => ({ idx, hours: busyness[d].hours }))
        .filter(x => !filledIdx.has(x.idx))
        .sort((a, b) => a.hours - b.hours || a.idx - b.idx)
        .slice(0, remaining)
        .map(x => x.idx)
        .sort((a, b) => a - b);
    } else {
      candidateIdx = WORKOUT_DAY_SLOTS[days].filter(idx => !filledIdx.has(idx)).slice(0, remaining);
    }

    let templateCursor = 0;
    candidateIdx.forEach(idx => {
      plan[idx] = template[templateCursor % template.length];
      templateCursor++;
    });
    lastWorkoutRecommendation = plan;

    const list = document.getElementById("workoutRecList");
    list.innerHTML = "";
    plan.forEach((entry, idx) => {
      const row = document.createElement("div");
      row.className = "workout-rec-row";
      const info = busyness ? busyness[dates[idx]] : null;
      if(entry && entry.fromCalendar){
        row.innerHTML = `<div class="workout-rec-day">${WORKOUT_DAY_ABBRS[idx]} — ${escapeHtml(entry.name)} ` +
          `<span class="workout-rec-busy">(from calendar)</span></div>`;
      } else {
        const busyBit = (info && info.hours > 0)
          ? ` <span class="workout-rec-busy">(${round1(info.hours)}h scheduled)</span>`
          : "";
        if(entry){
          row.innerHTML = `<div class="workout-rec-day">${WORKOUT_DAY_ABBRS[idx]} — ${escapeHtml(entry.name)}${busyBit}</div>` +
            `<div class="workout-rec-exercises">${escapeHtml(entry.exercises)}</div>`;
        } else {
          row.innerHTML = `<div class="workout-rec-day rest">${WORKOUT_DAY_ABBRS[idx]} — Rest${busyBit}</div>`;
        }
      }
      list.appendChild(row);
    });

    document.getElementById("workoutRecCalNote").style.display = busyness ? "block" : "none";
    genBtn.disabled = false;
    genBtn.textContent = "Generate plan";
    document.getElementById("workoutRecForm").style.display = "none";
    document.getElementById("workoutRecResults").style.display = "block";
  }

  function applyWorkoutRecommendation(){
    if(!lastWorkoutRecommendation) return;
    const dates = currentWeekDates();
    const plan = loadWorkoutPlan();
    dates.forEach((d, idx) => {
      const entry = lastWorkoutRecommendation[idx];
      const prevDone = (plan[d] && plan[d].done) || false;
      plan[d] = entry ? { label: entry.name, done: prevDone } : { label: "Rest", done: prevDone };
    });
    saveWorkoutPlan(plan);
    closeWorkoutRecSheet();
    closeWorkoutPlanSheet();
    renderWorkoutCard();
  }

  // ---------- daily check-in (conversational) ----------
  const CHECKIN_LEVEL_SCORE = { low: 0, poor: 0, stressed: 0, medium: 1, ok: 1, neutral: 1, high: 2, good: 2 };
  const CHECKIN_QUESTIONS = [
    { key: "energy", text: "How's your energy today?", options: [
      { value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" }
    ]},
    { key: "sleep", text: "How did you sleep last night?", options: [
      { value: "poor", label: "Poor" }, { value: "ok", label: "OK" }, { value: "good", label: "Good" }
    ]},
    { key: "mood", text: "How's your mood / stress?", options: [
      { value: "stressed", label: "Stressed" }, { value: "neutral", label: "Neutral" }, { value: "good", label: "Good" }
    ]},
    { key: "hunger", text: "Hungry right now?", options: [
      { value: "none", label: "Not really" }, { value: "some", label: "A little" }, { value: "very", label: "Very" }
    ]}
  ];
  function loadCheckinLog(){
    try{
      const raw = localStorage.getItem(CHECKIN_LOG_KEY);
      return raw ? JSON.parse(raw) : {};
    }catch(e){ return {}; }
  }
  function saveCheckinLog(log){
    const dates = Object.keys(log).sort();
    while(dates.length > 30){ delete log[dates.shift()]; }
    localStorage.setItem(CHECKIN_LOG_KEY, JSON.stringify(log));
  }
  function seededPick(arr, seed){
    let hash = 0;
    for(let i = 0; i < seed.length; i++){ hash = (hash * 31 + seed.charCodeAt(i)) >>> 0; }
    return arr[hash % arr.length];
  }

  let checkinStep = 0;
  let checkinAnswers = {};
  const savedCheckinToday = loadCheckinLog()[todayStr()];
  if(savedCheckinToday){
    checkinAnswers = {
      energy: savedCheckinToday.energy, sleep: savedCheckinToday.sleep,
      mood: savedCheckinToday.mood, hunger: savedCheckinToday.hunger
    };
    checkinStep = CHECKIN_QUESTIONS.length;
  }

  function generateCheckinSuggestions(answers){
    const { energy, sleep, mood, hunger } = answers;
    const score = CHECKIN_LEVEL_SCORE[energy] + CHECKIN_LEVEL_SCORE[sleep] + CHECKIN_LEVEL_SCORE[mood];
    const today = todayStr();
    const seed = today;

    const log = loadCheckinLog();
    const prev = log[addDays(today, -1)];
    let trendNote = "";
    if(prev && prev.energy === "low" && energy === "low"){
      trendNote = " That's two days of low energy in a row — worth an early night, or if it keeps up, worth looking at iron/B12-rich food.";
    } else if(prev && prev.mood === "stressed" && mood === "stressed"){
      trendNote = " Stress two days running now — worth carving out even 10 minutes today that's just for you.";
    } else if(prev && prev.sleep === "poor" && sleep === "poor"){
      trendNote = " Second rough night in a row — worth protecting tonight's wind-down more than usual.";
    }

    const summaryPool = score <= 2
      ? [
          "Today looks like a recovery day — lean on rest, hydration, and easy nutrition rather than pushing hard.",
          "Sounds like a low-key day is in order — prioritise rest and simple, easy meals over anything demanding."
        ]
      : score <= 4
      ? [
          "You're doing okay. A few deliberate choices — water, a real meal, a short walk — will compound today.",
          "Middling day, nothing alarming — small consistent choices today will do more than one big effort."
        ]
      : [
          "You're in a good place today — a solid day to tackle a harder workout or get ahead on meal prep if you've got the time.",
          "Good conditions across the board — a great day to push a bit harder if that's on your plan."
        ];
    const summary = seededPick(summaryPool, seed + "summary") + trendNote;

    const goals = getGoalsForDate(today);
    const totals = totalsForEntries(entriesForDate(today));
    const calRemaining = Math.round((goals.calories || 0) - totals.calories);
    const waterMl = loadWater()[today] || 0;
    const waterGoal = loadWaterGoal();
    const plan = loadWorkoutPlan()[today];
    const hasPlannedWorkout = plan && plan.label && !NON_WORKOUT_LABELS.includes(plan.label.trim().toLowerCase());

    const foodTips = [];
    const drinkTips = [];
    const exerciseTips = [];

    if(energy === "low"){
      foodTips.push(seededPick([
        "Complex carbs + protein — oats, eggs, or a banana with nut butter — to avoid a sugar-crash cycle.",
        "Go for slow-release energy — porridge or wholegrain toast with eggs — rather than anything sugary that'll dip again."
      ], seed + "energyfood"));
      drinkTips.push("Water first — low energy is often mild dehydration in disguise.");
      exerciseTips.push("Skip anything intense; a 10-15 min walk usually helps more than pushing through a hard session.");
    }
    if(sleep === "poor"){
      foodTips.push("Lean on protein and go easy on heavy or greasy food — harder to digest on little sleep.");
      drinkTips.push("Ease off caffeine after midday so tonight isn't compounded by today.");
      exerciseTips.push("Light movement only — yoga or a walk. Recovery matters more than intensity today.");
    }
    if(mood === "stressed"){
      foodTips.push("Magnesium-rich foods — leafy greens, nuts, dark chocolate — are linked to lower stress reactivity.");
      drinkTips.push(seededPick([
        "Herbal tea (chamomile, peppermint) over more caffeine, which can amplify anxiety.",
        "Skip extra caffeine today — it tends to sharpen stress rather than ease it."
      ], seed + "moodddrink"));
      exerciseTips.push("A steady walk or stretching session tends to lower cortisol better than high-intensity work right now.");
    }
    if(hunger === "very"){
      if(calRemaining >= 300){
        foodTips.push("You're genuinely hungry and have ~" + calRemaining + " kcal left today — good time for a real balanced meal (protein + complex carb + veg).");
      } else if(calRemaining > 0){
        foodTips.push("You're hungry but only ~" + calRemaining + " kcal left in today's goal — go for something high-volume and low-cal (veg, broth, popcorn) to take the edge off.");
      } else {
        foodTips.push("You're hungry but already at today's calorie goal — try water or a low-cal option first before deciding it's genuine hunger.");
      }
    }
    if(energy === "high" && sleep !== "poor" && mood !== "stressed"){
      exerciseTips.push("Good conditions for a harder session today if one's on your plan.");
    }

    if(hasPlannedWorkout){
      if(plan.done){
        exerciseTips.push('Already logged today\'s "' + plan.label + '" — nothing more needed on that front today.');
      } else {
        const advice = (energy === "low" || sleep === "poor")
          ? "worth scaling it back if it's demanding"
          : "conditions look fine to go ahead with it";
        exerciseTips.push('You\'ve got "' + plan.label + '" planned today — ' + advice + '.');
      }
    }

    if(waterMl < waterGoal * 0.5){
      drinkTips.push("Only " + waterMl + " ml logged so far against a " + waterGoal + " ml goal — worth catching up.");
    } else if(waterMl >= waterGoal){
      drinkTips.push("Already hit today's water goal — nice.");
    }

    if(foodTips.length === 0) foodTips.push("Nothing specific stands out — eat to your usual goals today.");
    if(drinkTips.length === 0) drinkTips.push("Stay on top of your water goal as usual.");
    if(exerciseTips.length === 0) exerciseTips.push("Whatever's already planned should suit how you're feeling.");

    return {
      summary,
      areas: [
        { label: "Food", tips: foodTips },
        { label: "Drink", tips: drinkTips },
        { label: "Exercise", tips: exerciseTips }
      ]
    };
  }

  function renderCheckinChat(){
    const log = document.getElementById("checkinChatLog");
    const chips = document.getElementById("checkinChips");
    if(!log || !chips) return;
    log.innerHTML = "";

    for(let i = 0; i < checkinStep; i++){
      const q = CHECKIN_QUESTIONS[i];
      const opt = q.options.find(o => o.value === checkinAnswers[q.key]);
      const row = document.createElement("div");
      row.className = "checkin-msg checkin-msg-done";
      row.textContent = q.text.replace(/\?$/, "") + ": " + (opt ? opt.label : "");
      log.appendChild(row);
    }

    chips.innerHTML = "";

    if(checkinStep < CHECKIN_QUESTIONS.length){
      const q = CHECKIN_QUESTIONS[checkinStep];
      const qEl = document.createElement("div");
      qEl.className = "checkin-msg checkin-msg-bot";
      qEl.textContent = q.text;
      log.appendChild(qEl);

      q.options.forEach(o => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "checkin-chip";
        chip.textContent = o.label;
        chip.addEventListener("click", () => {
          checkinAnswers[q.key] = o.value;
          checkinStep++;
          if(checkinStep === CHECKIN_QUESTIONS.length){
            const log = loadCheckinLog();
            log[todayStr()] = { ...checkinAnswers, ts: Date.now() };
            saveCheckinLog(log);
          }
          renderCheckinChat();
        });
        chips.appendChild(chip);
      });
    } else {
      const { summary, areas } = generateCheckinSuggestions(checkinAnswers);
      const respEl = document.createElement("div");
      respEl.className = "checkin-msg checkin-msg-bot";
      respEl.textContent = summary;
      log.appendChild(respEl);

      areas.forEach(a => {
        const areaEl = document.createElement("div");
        areaEl.className = "checkin-msg checkin-msg-bot checkin-msg-area";
        areaEl.innerHTML = `<strong>${escapeHtml(a.label)}:</strong> ${a.tips.map(escapeHtml).join(" ")}`;
        log.appendChild(areaEl);
      });

      const restartChip = document.createElement("button");
      restartChip.type = "button";
      restartChip.className = "checkin-chip";
      restartChip.textContent = "🔄 Start over";
      restartChip.addEventListener("click", () => {
        checkinStep = 0;
        checkinAnswers = {};
        const log = loadCheckinLog();
        delete log[todayStr()];
        saveCheckinLog(log);
        renderCheckinChat();
      });
      chips.appendChild(restartChip);
    }

    log.scrollTop = log.scrollHeight;
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

  function dayHitsGoal(dateStr){
    const totals = totalsForEntries(entriesForDate(dateStr));
    if(totals.calories === 0) return false;
    const goals = getGoalsForDate(dateStr);
    const burned = loadGarminCalories()[dateStr];
    const net = burned != null ? totals.calories - burned : totals.calories;
    const withinCalories = net >= goals.calories * 0.85 && net <= goals.calories * 1.15;
    const hitProtein = goals.protein > 0 ? totals.protein >= goals.protein * 0.9 : true;
    return withinCalories && hitProtein;
  }

  function computeStreak(){
    const today = todayStr();
    let cursor = dayHitsGoal(today) ? today : addDays(today, -1);
    let streak = 0;
    while(dayHitsGoal(cursor)){
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

    const streak = computeStreak();
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
      header.innerHTML = `<h2>${meal.label}</h2>
        <div class="meal-header-actions">
          <span class="meal-cal">${Math.round(mealCals)} kcal</span>
          <button type="button" class="icon-btn save-template-btn" title="Save as template">💾</button>
        </div>`;
      header.querySelector(".save-template-btn").addEventListener("click", () => saveMealAsTemplate(meal.id, meal.label));
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

  function saveMealAsTemplate(mealId, mealLabel){
    const mealEntries = entriesForDate(currentDate).filter(e => e.meal === mealId);
    if(mealEntries.length === 0) return;
    const name = prompt("Name this template:", mealLabel);
    if(!name || !name.trim()) return;
    const templates = loadTemplates();
    templates.push({
      id: uid(),
      name: name.trim(),
      items: mealEntries.map(e => ({
        name: e.name,
        serving: e.serving,
        calories: num(e.calories),
        protein: num(e.protein),
        carbs: num(e.carbs),
        fat: num(e.fat)
      }))
    });
    saveTemplates(templates);
    alert('Saved "' + name.trim() + '" as a template.');
  }

  // ---------- meal templates sheet ----------
  const templatesOverlay = document.getElementById("templatesOverlay");

  function openTemplatesSheet(){
    renderTemplatesList();
    templatesOverlay.classList.add("open");
  }
  function closeTemplatesSheet(){
    templatesOverlay.classList.remove("open");
  }

  function renderTemplatesList(){
    const templates = loadTemplates();
    const list = document.getElementById("templatesList");
    list.innerHTML = "";

    if(templates.length === 0){
      list.innerHTML = '<div class="garmin-history-empty">No templates yet. Save one from the 💾 button on a meal you\'ve logged.</div>';
      return;
    }

    templates.forEach(t => {
      const totalCal = Math.round(t.items.reduce((s, i) => s + num(i.calories), 0));
      const row = document.createElement("div");
      row.className = "fav-list-row";
      row.innerHTML = `
        <div class="fav-list-info">
          <div class="fav-list-name">${escapeHtml(t.name)}</div>
          <div class="fav-list-meta">${t.items.length} item${t.items.length === 1 ? "" : "s"} · ${totalCal} kcal</div>
        </div>
        <div class="fav-list-actions">
          <button type="button" class="btn btn-secondary" data-id="${t.id}" data-action="log">Log</button>
          <button type="button" class="icon-btn danger" data-id="${t.id}" data-action="del">✕</button>
        </div>
      `;
      list.appendChild(row);
    });

    list.querySelectorAll('button[data-action="log"]').forEach(btn => {
      btn.addEventListener("click", () => logTemplate(btn.dataset.id));
    });
    list.querySelectorAll('button[data-action="del"]').forEach(btn => {
      btn.addEventListener("click", () => {
        saveTemplates(loadTemplates().filter(t => t.id !== btn.dataset.id));
        renderTemplatesList();
      });
    });
  }

  function logTemplate(id){
    const template = loadTemplates().find(t => t.id === id);
    if(!template) return;
    const meal = guessMealByTime();
    const entries = loadEntries();
    template.items.forEach(item => {
      entries.push({
        ...item,
        id: uid(),
        meal,
        date: currentDate,
        photo: null,
        createdAt: Date.now()
      });
    });
    saveEntries(entries);
    closeTemplatesSheet();
    render();
  }

  // ---------- food log search / history sheet ----------
  const historyOverlay = document.getElementById("historyOverlay");

  function openHistorySheet(){
    document.getElementById("historySearchInput").value = "";
    renderHistoryResults("");
    historyOverlay.classList.add("open");
    setTimeout(() => document.getElementById("historySearchInput").focus(), 50);
  }
  function closeHistorySheet(){
    historyOverlay.classList.remove("open");
  }

  function renderHistoryResults(query){
    const q = query.trim().toLowerCase();
    const list = document.getElementById("historyResults");
    const summary = document.getElementById("historySummary");
    list.innerHTML = "";

    if(!q){
      summary.textContent = "Type a food name to search your full log.";
      return;
    }

    const matches = loadEntries()
      .filter(e => e.name.toLowerCase().includes(q))
      .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0));

    if(matches.length === 0){
      summary.textContent = "No matches.";
      return;
    }

    const avgCal = Math.round(matches.reduce((s, e) => s + num(e.calories), 0) / matches.length);
    summary.textContent = matches.length + " match" + (matches.length === 1 ? "" : "es") + " · avg " + avgCal + " kcal";

    matches.slice(0, 100).forEach(e => {
      const row = document.createElement("div");
      row.className = "garmin-history-row";
      row.innerHTML = '<span class="garmin-history-date">' + escapeHtml(formatDateLabel(e.date)) + ' · ' + escapeHtml(e.name) + '</span>' +
        '<span class="garmin-history-cal">' + Math.round(num(e.calories)) + ' kcal</span>';
      list.appendChild(row);
    });
  }

  // ---------- weekday goals sheet ----------
  const weekdayGoalsOverlay = document.getElementById("weekdayGoalsOverlay");

  function openWeekdayGoalsSheet(){
    renderWeekdayGoalsForm();
    weekdayGoalsOverlay.classList.add("open");
  }
  function closeWeekdayGoalsSheet(){
    weekdayGoalsOverlay.classList.remove("open");
  }

  function renderWeekdayGoalsForm(){
    const overrides = loadWeekdayGoals();
    const defaults = loadGoals();
    const container = document.getElementById("weekdayGoalsList");
    container.innerHTML = "";

    WEEKDAY_NAMES.forEach((label, idx) => {
      const existing = overrides[idx];
      const row = document.createElement("div");
      row.className = "weekday-goal-row";
      row.innerHTML = `
        <label class="weekday-goal-head">
          <input type="checkbox" class="weekday-goal-toggle" data-day="${idx}" ${existing ? "checked" : ""}>
          <span>${label}</span>
        </label>
        <div class="weekday-goal-fields" style="display:${existing ? "grid" : "none"};">
          <input type="number" inputmode="decimal" class="mono-input wd-cal" placeholder="Calories" value="${existing ? existing.calories : defaults.calories}">
          <input type="number" inputmode="decimal" class="mono-input wd-protein" placeholder="Protein g" value="${existing ? existing.protein : defaults.protein}">
          <input type="number" inputmode="decimal" class="mono-input wd-carbs" placeholder="Carbs g" value="${existing ? existing.carbs : defaults.carbs}">
          <input type="number" inputmode="decimal" class="mono-input wd-fat" placeholder="Fat g" value="${existing ? existing.fat : defaults.fat}">
        </div>
      `;
      container.appendChild(row);
    });

    container.querySelectorAll(".weekday-goal-toggle").forEach(cb => {
      cb.addEventListener("change", () => {
        cb.closest(".weekday-goal-row").querySelector(".weekday-goal-fields").style.display = cb.checked ? "grid" : "none";
      });
    });
  }

  function saveWeekdayGoalsFromForm(){
    const overrides = {};
    document.querySelectorAll("#weekdayGoalsList .weekday-goal-row").forEach(row => {
      const cb = row.querySelector(".weekday-goal-toggle");
      if(!cb.checked) return;
      overrides[cb.dataset.day] = {
        calories: num(row.querySelector(".wd-cal").value) || DEFAULT_GOALS.calories,
        protein: num(row.querySelector(".wd-protein").value) || DEFAULT_GOALS.protein,
        carbs: num(row.querySelector(".wd-carbs").value) || DEFAULT_GOALS.carbs,
        fat: num(row.querySelector(".wd-fat").value) || DEFAULT_GOALS.fat
      };
    });
    saveWeekdayGoals(overrides);
    closeWeekdayGoalsSheet();
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
      fat: num(document.getElementById("entryFat").value),
      fiber: num(document.getElementById("entryFiber").value),
      sugar: num(document.getElementById("entrySugar").value),
      sodium: num(document.getElementById("entrySodium").value)
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
    document.getElementById("entryFiber").value = "";
    document.getElementById("entrySugar").value = "";
    document.getElementById("entrySodium").value = "";
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
    document.getElementById("entryFiber").value = e.fiber || "";
    document.getElementById("entrySugar").value = e.sugar || "";
    document.getElementById("entrySodium").value = e.sodium || "";
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
    document.getElementById("entryFiber").value = f.fiber || "";
    document.getElementById("entrySugar").value = f.sugar || "";
    document.getElementById("entrySodium").value = f.sodium || "";
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
      fat: payload.fat,
      fiber: payload.fiber,
      sugar: payload.sugar,
      sodium: payload.sodium
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
      fiber: num(document.getElementById("entryFiber").value),
      sugar: num(document.getElementById("entrySugar").value),
      sodium: num(document.getElementById("entrySodium").value),
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
        fiber: ln.fiber ? ln.fiber.value : 0,
        sugar: ln.sugars ? ln.sugars.value : 0,
        sodium: ln.sodium ? ln.sodium.value : 0,
        serving: (food.servingSize && food.servingSizeUnit)
          ? (food.servingSize + food.servingSizeUnit)
          : (food.householdServingFullText || "")
      };
    }
    const nutrients = food.foodNutrients || [];
    const find = (...names) => {
      for(const name of names){
        const n = nutrients.find(x => x.nutrientName === name);
        if(n) return num(n.value);
      }
      return 0;
    };
    return {
      calories: find("Energy"),
      protein: find("Protein"),
      carbs: find("Carbohydrate, by difference"),
      fat: find("Total lipid (fat)"),
      fiber: find("Fiber, total dietary"),
      sugar: find("Sugars, total including NLEA", "Sugars, total"),
      sodium: find("Sodium, Na"),
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
    document.getElementById("entryFiber").value = Math.round(macros.fiber || 0);
    document.getElementById("entrySugar").value = Math.round(macros.sugar || 0);
    document.getElementById("entrySodium").value = Math.round(macros.sodium || 0);
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
        fiber: num(n["fiber_100g"]),
        sugar: num(n["sugars_100g"]),
        sodium: num(n["sodium_100g"]) * 1000,
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
    weightUnit: WEIGHT_UNIT_KEY,
    water: WATER_KEY,
    waterGoal: WATER_GOAL_KEY,
    caffeine: CAFFEINE_KEY,
    caffeineGoal: CAFFEINE_GOAL_KEY,
    alcohol: ALCOHOL_KEY,
    alcoholGoal: ALCOHOL_GOAL_KEY,
    templates: TEMPLATES_KEY,
    weekdayGoals: WEEKDAY_GOALS_KEY,
    workoutPlan: WORKOUT_PLAN_KEY,
    checkinLog: CHECKIN_LOG_KEY
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

  // ---------- account & cloud sync ----------
  const accountOverlay = document.getElementById("accountOverlay");
  let fbApp = null;
  let fbAuth = null;
  let fbDb = null;
  let fbUser = null;
  let syncDebounceTimer = null;

  function whenFirebaseReady(cb, attemptsLeft){
    if(typeof attemptsLeft !== "number") attemptsLeft = 25;
    if(typeof firebase !== "undefined"){
      cb();
      return;
    }
    if(attemptsLeft <= 0) return;
    setTimeout(() => whenFirebaseReady(cb, attemptsLeft - 1), 200);
  }

  function initFirebase(){
    const config = loadFirebaseConfig();
    if(!config || typeof firebase === "undefined") return false;
    if(!fbApp){
      try{
        fbApp = firebase.apps && firebase.apps.length ? firebase.apps[0] : firebase.initializeApp(config);
        fbAuth = firebase.auth();
        fbDb = firebase.firestore();
        fbAuth.onAuthStateChanged(handleAuthStateChanged);
      }catch(e){
        fbApp = null; fbAuth = null; fbDb = null;
        return false;
      }
    }
    return true;
  }

  async function handleAuthStateChanged(user){
    fbUser = user;
    updateAccountStatusUI();
    if(user){
      await pullStateFromCloud();
      render();
      renderFavsRow();
    }
  }

  function updateAccountStatusUI(){
    const note = document.getElementById("acctStatusNote");
    const setupSection = document.getElementById("acctSetupSection");
    const manageSection = document.getElementById("acctManageSection");
    if(fbUser){
      note.textContent = "Signed in as " + fbUser.email;
      setupSection.style.display = "none";
      manageSection.style.display = "block";
    } else {
      note.textContent = loadFirebaseConfig() ? "Signed out." : "Not set up.";
      setupSection.style.display = "block";
      manageSection.style.display = "none";
    }
  }

  function updateSyncNote(msg){
    const el = document.getElementById("acctSyncNote");
    if(el) el.textContent = msg;
  }

  function gatherSyncData(){
    const data = {};
    Object.keys(BACKUP_KEYS).forEach(name => {
      const raw = localStorage.getItem(BACKUP_KEYS[name]);
      if(raw !== null){
        try{ data[name] = JSON.parse(raw); }catch(e){ data[name] = raw; }
      }
    });
    // Meal photos aren't synced — they're base64 and would blow past Firestore's
    // 1MB document limit fast. Strip them before pushing; applySyncData() re-attaches
    // whatever photo already exists locally when pulling back down.
    if(Array.isArray(data.entries)){
      data.entries = data.entries.map(e => {
        if(!e.photo) return e;
        const stripped = { ...e };
        delete stripped.photo;
        return stripped;
      });
    }
    return data;
  }

  function applySyncData(data){
    Object.keys(BACKUP_KEYS).forEach(name => {
      if(!Object.prototype.hasOwnProperty.call(data, name)) return;
      if(name === "entries" && Array.isArray(data.entries)){
        const localPhotoById = {};
        loadEntries().forEach(e => { if(e.photo) localPhotoById[e.id] = e.photo; });
        const merged = data.entries.map(e =>
          (!e.photo && localPhotoById[e.id]) ? { ...e, photo: localPhotoById[e.id] } : e
        );
        saveEntries(merged);
      } else {
        localStorage.setItem(BACKUP_KEYS[name], JSON.stringify(data[name]));
      }
    });
  }

  async function pushStateToCloud(){
    if(!fbUser || !fbDb) return;
    updateSyncNote("Syncing…");
    try{
      await fbDb.collection("users").doc(fbUser.uid).set({
        data: gatherSyncData(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      updateSyncNote("Synced just now.");
    }catch(e){
      updateSyncNote("Sync failed — will retry on your next change.");
    }
  }

  async function pullStateFromCloud(){
    if(!fbUser || !fbDb) return;
    try{
      const doc = await fbDb.collection("users").doc(fbUser.uid).get();
      if(doc.exists && doc.data().data){
        applySyncData(doc.data().data);
        updateSyncNote("Synced from your account.");
      } else {
        updateSyncNote("No cloud data yet — syncing this device up.");
        await pushStateToCloud();
      }
    }catch(e){
      updateSyncNote("Couldn't reach your account. Using what's on this device.");
    }
  }

  function scheduleCloudSync(){
    if(!fbUser) return;
    clearTimeout(syncDebounceTimer);
    syncDebounceTimer = setTimeout(pushStateToCloud, 2500);
  }

  function openAccountSheet(){
    const config = loadFirebaseConfig();
    if(config) document.getElementById("acctConfigInput").value = JSON.stringify(config, null, 2);
    initFirebase();
    updateAccountStatusUI();
    accountOverlay.classList.add("open");
  }
  function closeAccountSheet(){
    accountOverlay.classList.remove("open");
  }

  function normalizeFirebaseConfigInput(raw){
    // Firebase's console shows this as a bare JS object (const firebaseConfig = {...};),
    // not valid JSON — pull out the {...} body, quote its bare keys, and drop trailing commas
    // so pasting the snippet exactly as shown still works.
    const match = raw.match(/\{[\s\S]*\}/);
    let cleaned = match ? match[0] : raw;
    cleaned = cleaned.replace(/([{,]\s*)([A-Za-z_$][A-Za-z0-9_$]*)\s*:/g, '$1"$2":');
    cleaned = cleaned.replace(/,(\s*[}\]])/g, "$1");
    return cleaned;
  }

  function saveConfigFromForm(){
    const raw = document.getElementById("acctConfigInput").value.trim();
    if(!raw) return;
    let config;
    try{
      config = JSON.parse(raw);
    }catch(e){
      try{
        config = JSON.parse(normalizeFirebaseConfigInput(raw));
      }catch(e2){
        alert("Couldn't read that config. Paste the firebaseConfig object exactly as shown in your Firebase project settings.");
        return;
      }
    }
    saveFirebaseConfig(config);
    fbApp = null; fbAuth = null; fbDb = null;
    const ok = initFirebase();
    updateAccountStatusUI();
    alert(ok ? "Firebase config saved." : "Saved, but couldn't connect — double check your config and try again.");
  }

  function signUpAccount(){
    if(!initFirebase()){ alert("Save your Firebase config first."); return; }
    const email = document.getElementById("acctEmailInput").value.trim();
    const password = document.getElementById("acctPasswordInput").value;
    if(!email || password.length < 6){ alert("Enter an email and a password of at least 6 characters."); return; }
    fbAuth.createUserWithEmailAndPassword(email, password).catch(err => alert(err.message));
  }
  function logInAccount(){
    if(!initFirebase()){ alert("Save your Firebase config first."); return; }
    const email = document.getElementById("acctEmailInput").value.trim();
    const password = document.getElementById("acctPasswordInput").value;
    if(!email || !password){ alert("Enter your email and password."); return; }
    fbAuth.signInWithEmailAndPassword(email, password).catch(err => alert(err.message));
  }
  function signOutAccount(){
    if(fbAuth) fbAuth.signOut();
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
    document.getElementById("gcalConnectSection").style.display = gcalAccessToken ? "none" : "block";
    document.getElementById("gcalManageSection").style.display = gcalAccessToken ? "block" : "none";
  }

  async function renderCalendarPicker(){
    if(!gcalAccessToken) return;
    const list = document.getElementById("gcalCalendarList");
    list.innerHTML = '<div class="garmin-history-empty">Loading your calendars…</div>';
    const calendars = await fetchCalendarList();
    if(calendars.length === 0){
      list.innerHTML = '<div class="garmin-history-empty">Couldn\'t load your calendars.</div>';
      return;
    }
    const selected = loadGcalCalendarIds();
    const workoutIds = loadGcalWorkoutCalendarIds();
    list.innerHTML = "";
    calendars.forEach(cal => {
      const row = document.createElement("div");
      row.className = "gcal-calendar-row";
      const checked = selected.includes(cal.id) ? "checked" : "";
      const workoutChecked = workoutIds.includes(cal.id) ? "checked" : "";
      const color = cal.backgroundColor || "#9C8F82";
      row.innerHTML = `
        <label class="gcal-calendar-main">
          <input type="checkbox" class="gcal-calendar-toggle" value="${escapeHtml(cal.id)}" ${checked}>
          <span class="gcal-calendar-dot" style="background:${color};"></span>
          <span class="gcal-calendar-name">${escapeHtml(cal.summary || cal.id)}</span>
        </label>
        <label class="gcal-workout-flag" title="Treat every event on this calendar as a workout">
          <input type="checkbox" class="gcal-workout-toggle" value="${escapeHtml(cal.id)}" ${workoutChecked}> 🏋️
        </label>
      `;
      list.appendChild(row);
    });
  }

  function saveCalendarSelectionFromForm(){
    const ids = Array.from(document.querySelectorAll(".gcal-calendar-toggle:checked")).map(cb => cb.value);
    saveGcalCalendarIds(ids.length > 0 ? ids : ["primary"]);
    const workoutIds = Array.from(document.querySelectorAll(".gcal-workout-toggle:checked")).map(cb => cb.value);
    saveGcalWorkoutCalendarIds(workoutIds);
    renderCalendarCard();
    renderWorkoutCard();
    alert("Calendar selection saved.");
  }

  function openCalendarSheet(){
    document.getElementById("gcalClientIdInput").value = loadGcalClientId();
    updateGcalStatus();
    if(gcalAccessToken) renderCalendarPicker();
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
          renderCalendarPicker();
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

  let reconnectingGcal = false;
  function attemptSilentReconnect(){
    if(reconnectingGcal || !loadGcalClientId()) return;
    reconnectingGcal = true;
    whenGoogleReady(() => {
      const client = ensureGcalTokenClient(true);
      if(client) client.requestAccessToken({ prompt: "" });
      reconnectingGcal = false;
    });
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

  async function fetchCalendarList(){
    if(!gcalAccessToken) return [];
    try{
      const res = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
        headers: { Authorization: "Bearer " + gcalAccessToken }
      });
      if(!res.ok) return [];
      const data = await res.json();
      return data.items || [];
    }catch(e){
      return [];
    }
  }

  async function fetchEventsFromCalendar(calendarId, timeMin, timeMax){
    const url = "https://www.googleapis.com/calendar/v3/calendars/" + encodeURIComponent(calendarId) + "/events" +
      "?timeMin=" + encodeURIComponent(timeMin) +
      "&timeMax=" + encodeURIComponent(timeMax) +
      "&singleEvents=true&orderBy=startTime";
    try{
      const res = await fetch(url, { headers: { Authorization: "Bearer " + gcalAccessToken } });
      if(res.status === 401){
        gcalAccessToken = null;
        clearGcalToken();
        updateGcalStatus();
        attemptSilentReconnect();
        return null;
      }
      if(!res.ok) return null;
      const data = await res.json();
      return (data.items || []).map(ev => ({ ...ev, _calendarId: calendarId }));
    }catch(e){
      return null;
    }
  }

  function eventBelongsToDate(ev, dateStr){
    if(ev.start && ev.start.dateTime){
      return dateToStr(new Date(ev.start.dateTime)) === dateStr;
    }
    if(ev.start && ev.start.date){
      // All-day events are timezone-naive on Google's side, so the timeMin/timeMax
      // window can pull in the adjacent day's all-day event when the local offset
      // is non-zero. Only keep it if dateStr actually falls within the event's
      // [start, end) range — end.date is exclusive per the Calendar API, and
      // multi-day all-day events (e.g. a training block) span more than one day.
      const start = ev.start.date;
      const end = (ev.end && ev.end.date) ? ev.end.date : start;
      return dateStr >= start && dateStr < end;
    }
    return false;
  }

  async function fetchCalendarEventsForDate(dateStr){
    if(!gcalAccessToken) return null;
    const timeMin = new Date(dateStr + "T00:00:00").toISOString();
    const timeMax = new Date(dateStr + "T23:59:59").toISOString();
    const calendarIds = loadGcalCalendarIds();

    const results = await Promise.all(calendarIds.map(id => fetchEventsFromCalendar(id, timeMin, timeMax)));
    if(results.every(r => r === null)) return null;

    const merged = results.filter(r => r).flat().filter(ev => eventBelongsToDate(ev, dateStr));
    merged.sort((a, b) => {
      const aStart = (a.start && (a.start.dateTime || a.start.date)) || "";
      const bStart = (b.start && (b.start.dateTime || b.start.date)) || "";
      return aStart.localeCompare(bStart);
    });
    return merged;
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
      { num: Math.round(avg("carbs")) + "g / " + Math.round(avg("fat")) + "g", lbl: "Avg carbs / fat" },
      { num: Math.round(avg("fiber")) + "g", lbl: "Avg fiber (aim " + FIBER_GOAL_G + "g)" },
      { num: Math.round(avg("sugar")) + "g / " + Math.round(avg("sodium")) + "mg", lbl: "Avg sugar / sodium" }
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
    document.getElementById("entryFiber").value = Math.round(entryBaseline.fiber * ratio);
    document.getElementById("entrySugar").value = Math.round(entryBaseline.sugar * ratio);
    document.getElementById("entrySodium").value = Math.round(entryBaseline.sodium * ratio);
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

  document.getElementById("viewTemplatesBtn").addEventListener("click", openTemplatesSheet);
  document.getElementById("templatesCloseBtn").addEventListener("click", closeTemplatesSheet);
  templatesOverlay.addEventListener("click", (e) => { if(e.target === templatesOverlay) closeTemplatesSheet(); });

  document.getElementById("viewHistoryBtn").addEventListener("click", openHistorySheet);
  document.getElementById("historyCloseBtn").addEventListener("click", closeHistorySheet);
  historyOverlay.addEventListener("click", (e) => { if(e.target === historyOverlay) closeHistorySheet(); });
  document.getElementById("historySearchInput").addEventListener("input", (e) => renderHistoryResults(e.target.value));

  document.getElementById("weekdayGoalsBtn").addEventListener("click", openWeekdayGoalsSheet);
  document.getElementById("weekdayGoalsCloseBtn").addEventListener("click", closeWeekdayGoalsSheet);
  document.getElementById("weekdayGoalsSaveBtn").addEventListener("click", saveWeekdayGoalsFromForm);
  weekdayGoalsOverlay.addEventListener("click", (e) => { if(e.target === weekdayGoalsOverlay) closeWeekdayGoalsSheet(); });

  document.querySelectorAll(".water-btn").forEach(btn => {
    btn.addEventListener("click", () => addWater(num(btn.dataset.ml)));
  });
  document.getElementById("waterResetBtn").addEventListener("click", resetWaterToday);
  document.getElementById("waterGoalBtn").addEventListener("click", promptWaterGoal);

  document.querySelectorAll(".caffeine-btn").forEach(btn => {
    btn.addEventListener("click", () => addCaffeine(num(btn.dataset.mg)));
  });
  document.getElementById("caffeineResetBtn").addEventListener("click", resetCaffeineToday);
  document.getElementById("caffeineGoalBtn").addEventListener("click", promptCaffeineGoal);

  document.querySelectorAll(".alcohol-btn").forEach(btn => {
    btn.addEventListener("click", () => addAlcohol(num(btn.dataset.units)));
  });
  document.getElementById("alcoholResetBtn").addEventListener("click", resetAlcoholToday);
  document.getElementById("alcoholGoalBtn").addEventListener("click", promptAlcoholGoal);

  document.getElementById("connectCalendarBtn").addEventListener("click", openCalendarSheet);
  document.getElementById("calendarCloseBtn").addEventListener("click", closeCalendarSheet);
  document.getElementById("gcalSaveClientIdBtn").addEventListener("click", saveGcalClientIdFromForm);
  document.getElementById("gcalSignInBtn").addEventListener("click", signInGoogleCalendar);
  document.getElementById("gcalSignOutBtn").addEventListener("click", signOutGoogleCalendar);
  document.getElementById("gcalSaveCalendarsBtn").addEventListener("click", saveCalendarSelectionFromForm);
  calendarOverlay.addEventListener("click", (e) => { if(e.target === calendarOverlay) closeCalendarSheet(); });
  document.getElementById("calendarMoreBtn").addEventListener("click", () => {
    const list = document.getElementById("calendarCardList");
    list.style.display = list.style.display === "flex" ? "none" : "flex";
  });

  document.getElementById("menuBtn").addEventListener("click", openDrawer);
  document.getElementById("drawerCloseBtn").addEventListener("click", closeDrawer);
  drawerOverlay.addEventListener("click", (e) => { if(e.target === drawerOverlay) closeDrawer(); });
  ["editGoalsBtn", "weekdayGoalsBtn", "calcMacrosBtn", "viewFavoritesBtn", "viewTemplatesBtn", "viewHistoryBtn", "logWeightBtn", "planWorkoutsBtn", "importGarminBtn", "viewGarminHistoryBtn", "connectCalendarBtn", "backupDataBtn", "accountSyncBtn", "remindersBtn"].forEach(id => {
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

  document.getElementById("accountSyncBtn").addEventListener("click", openAccountSheet);
  document.getElementById("accountCloseBtn").addEventListener("click", closeAccountSheet);
  accountOverlay.addEventListener("click", (e) => { if(e.target === accountOverlay) closeAccountSheet(); });
  document.getElementById("acctSaveConfigBtn").addEventListener("click", saveConfigFromForm);
  document.getElementById("acctSignUpBtn").addEventListener("click", signUpAccount);
  document.getElementById("acctLogInBtn").addEventListener("click", logInAccount);
  document.getElementById("acctSignOutBtn").addEventListener("click", signOutAccount);
  document.getElementById("acctSyncNowBtn").addEventListener("click", pushStateToCloud);

  document.getElementById("remindersBtn").addEventListener("click", openRemindersSheet);
  document.getElementById("remindersCloseBtn").addEventListener("click", closeRemindersSheet);
  document.getElementById("remindersSaveBtn").addEventListener("click", saveRemindersFromForm);
  document.getElementById("remEnableNotifsBtn").addEventListener("click", requestNotificationPermission);
  remindersOverlay.addEventListener("click", (e) => { if(e.target === remindersOverlay) closeRemindersSheet(); });

  document.getElementById("logWeightBtn").addEventListener("click", openWeightSheet);
  document.getElementById("weightCancelBtn").addEventListener("click", closeWeightSheet);
  document.getElementById("weightSaveBtn").addEventListener("click", saveWeightFromForm);
  weightOverlay.addEventListener("click", (e) => { if(e.target === weightOverlay) closeWeightSheet(); });
  document.querySelectorAll("#weightUnitsToggle button").forEach(btn => {
    btn.addEventListener("click", () => setWeightSheetUnit(btn.dataset.unit));
  });

  document.getElementById("planWorkoutsBtn").addEventListener("click", openWorkoutPlanSheet);
  document.getElementById("workoutCardEditBtn").addEventListener("click", openWorkoutPlanSheet);
  document.getElementById("workoutDoneBtn").addEventListener("click", toggleWorkoutDone);
  document.getElementById("workoutPlanCloseBtn").addEventListener("click", closeWorkoutPlanSheet);
  document.getElementById("workoutPlanSaveBtn").addEventListener("click", saveWorkoutPlanFromForm);
  workoutPlanOverlay.addEventListener("click", (e) => { if(e.target === workoutPlanOverlay) closeWorkoutPlanSheet(); });

  document.getElementById("workoutRecOpenBtn").addEventListener("click", openWorkoutRecSheet);
  document.getElementById("workoutRecCloseBtn").addEventListener("click", closeWorkoutRecSheet);
  document.getElementById("recGenerateBtn").addEventListener("click", generateWorkoutRecommendation);
  document.getElementById("recBackBtn").addEventListener("click", backToWorkoutRecForm);
  document.getElementById("recApplyBtn").addEventListener("click", applyWorkoutRecommendation);
  workoutRecOverlay.addEventListener("click", (e) => { if(e.target === workoutRecOverlay) closeWorkoutRecSheet(); });

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
  renderCheckinChat();
  initGoogleCalendarOnLoad();
  whenFirebaseReady(() => initFirebase());
  setInterval(checkReminders, 60000);

  if("serviceWorker" in navigator && location.protocol !== "file:"){
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }
})();
