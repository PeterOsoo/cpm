const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const CODES = ['KE', 'NP', 'CO', 'PH', 'US'];

let state = {
    mode: 'volume',
    shiftMode: 'number',
    globalAHTUnit: 'sec',
    activeMonth: new Date().getMonth(),
    selectedCountries: ['KE', 'NP', 'CO', 'PH', 'US'],
    allHolidays: {},
    workDays: 5,
    workHolidays: false,
    intensity: 1,
    activeTab: 'weekly'
};

function toggleAcc(id) {
    document.getElementById(`sec-${id}`).classList.toggle('open');
    document.getElementById(`arrow-${id}`).classList.toggle('rotate-180');
}

function switchTab(tabId) {
    state.activeTab = tabId;
    document.querySelectorAll('.tab-view').forEach(v => v.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active', 'border-b-2'));
    document.getElementById(`view-${tabId}`).classList.remove('hidden');
    document.getElementById(`tab-${tabId}`).classList.add('active', 'border-b-2');
}

function distributeInteger(total, count) {
    let base = Math.floor(total / count);
    let rem = Math.round(total % count);
    let arr = new Array(count).fill(base);
    for (let i = 0; i < rem; i++) arr[i]++;
    return arr;
}

async function init() {
    const mSel = document.getElementById('targetMonth');
    MONTHS.forEach((m, i) => mSel.innerHTML += `<option value="${i}" ${i === state.activeMonth ? 'selected' : ''}>${m} 2026</option>`);
    const cG = document.getElementById('countryGrid');
    CODES.forEach(code => {
        cG.innerHTML += `<button onclick="toggleCountry('${code}')" id="tag-${code}" class="px-3 py-1.5 rounded-xl text-[10px] font-black border bg-blue-600 text-white border-blue-200 shadow-sm">${code}</button>`;
        fetchHolidays(code);
    });
    syncAll();
    setTimeout(() => lucide.createIcons(), 200);
}

function setWorkDays(d) {
    state.workDays = d;
    [5, 6, 7].forEach(v => document.getElementById('wd' + v).className = 'btn-toggle flex-1' + (v === d ? ' active' : ''));
    document.getElementById('intensityBox').style.display = d > 5 ? 'block' : 'none';
    runAnalysis();
}

function setHolWork(b) {
    state.workHolidays = b;

    // Update visual states
    const btnYes = document.getElementById('holYes');
    const btnNo = document.getElementById('holNo');

    if (b) {
        btnYes.classList.add('active');
        btnNo.classList.remove('active');
    } else {
        btnNo.classList.add('active');
        btnYes.classList.remove('active');
    }

    runAnalysis(); // Re-run the Round-Robin logic based on new availability
}

function updateIntensity(v) {
    state.intensity = v / 100;
    document.getElementById('intVal').innerText = v + '%';
    runAnalysis();
}

function syncAll() {
    renderRoster();
    renderUCs();
    renderShifts();
    runAnalysis();
}

async function fetchHolidays(code) {
    try {
        const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/2026/${code}`);
        const data = await res.json();
        // Save both date and name
        state.allHolidays[code] = data.map(h => ({ date: h.date, name: h.localName }));
        runAnalysis();
    } catch (e) { }
}

function toggleCountry(code) {
    const btn = document.getElementById(`tag-${code}`);
    if (state.selectedCountries.includes(code)) {
        state.selectedCountries = state.selectedCountries.filter(c => c !== code);
        btn.className = "px-3 py-1.5 rounded-xl text-[10px] font-black border bg-white text-slate-400 border-slate-200";
    } else {
        state.selectedCountries.push(code);
        btn.className = "px-3 py-1.5 rounded-xl text-[10px] font-black border bg-blue-600 text-white border-blue-200 shadow-sm";
    }
    runAnalysis();
}
function setMode(m) {
    // 1. Update the Global State
    state.mode = m;

    // 2. Update the Basics Labels
    // This changes the text above your main input box
    document.getElementById('label-dailyTarget').innerText =
        m === 'volume' ? 'Target Daily Volume (Tasks)' : 'Target Daily Hours';

    // 3. Toggle Visibility of Volume-only tools
    // We hide the TPT (Tasks Per Hour) box if we are just working with raw hours
    document.getElementById('tptContainer').style.display = m === 'volume' ? 'block' : 'none';
    document.getElementById('shiftStratSec').style.display = 'block';

    // 4. Style the "Mode" Buttons (Volume vs Hours)
    // This makes the active button white/blue and the inactive one grey
    const btnVol = document.getElementById('btn-vol');
    const btnHrs = document.getElementById('btn-hrs');

    const activeClass = 'flex-1 py-2 text-[10px] font-black rounded-xl bg-white text-blue-600 shadow-sm uppercase transition-all';
    const inactiveClass = 'flex-1 py-2 text-[10px] font-black rounded-xl text-slate-500 uppercase transition-all';

    btnVol.className = m === 'volume' ? activeClass : inactiveClass;
    btnHrs.className = m === 'hours' ? activeClass : inactiveClass;

    // 5. THE "CRUISING" ADDITION: Force the Shift Strategy back to Number mode
    // This prevents the "quack" math where 100 hours suddenly becomes 100%
    state.shiftMode = 'number';

    // 6. Trigger the cascade of updates
    renderShifts(); // Updates the "Confirmed Hours" vs "Vol/Num" labels
    renderUCs();    // Updates the Use Case columns (3 vs 4 columns)
    syncAll();      // Re-runs all the math for the dashboard
}
function setShiftMode(m) {
    const target = parseFloat(document.getElementById('dailyInput').value) || 1;
    const inputs = document.querySelectorAll('.shift-input');

    inputs.forEach(inp => {
        let val = parseFloat(inp.value) || 0;
        // If switching TO percent FROM numbers
        if (m === 'percent' && state.shiftMode === 'number') {
            inp.value = ((val / target) * 100).toFixed(1);
        }
        // If switching TO numbers FROM percent
        else if (m === 'number' && state.shiftMode === 'percent') {
            inp.value = ((val / 100) * target).toFixed(0);
        }
    });

    state.shiftMode = m;

    // Update button colors
    const nBtn = document.getElementById('sModeNum');
    const pBtn = document.getElementById('sModePerc');
    if (m === 'number') {
        nBtn.className = 'flex-1 py-1 text-[9px] font-black rounded-lg bg-white text-purple-600 shadow-sm';
        pBtn.className = 'flex-1 py-1 text-[9px] font-black rounded-lg text-slate-500';
    } else {
        pBtn.className = 'flex-1 py-1 text-[9px] font-black rounded-lg bg-white text-purple-600 shadow-sm';
        nBtn.className = 'flex-1 py-1 text-[9px] font-black rounded-lg text-slate-500';
    }

    renderShifts(); // Refresh the labels
}

function renderRoster() {
    let countInput = document.getElementById('rosterCount');
    let count = parseInt(countInput.value) || 1;
    if (count > 8) { count = 8; countInput.value = 8; }
    const cont = document.getElementById('rosterContainer');
    const existingRows = cont.querySelectorAll('.roster-row');
    const targetHC = parseInt(document.getElementById('totalCWHeadcount').value) || 0;
    if (existingRows.length > count) { for (let i = existingRows.length; i > count; i--) existingRows[i - 1].remove(); }
    else if (existingRows.length < count) {
        const dist = distributeInteger(targetHC, count);
        for (let i = existingRows.length; i < count; i++) {
            const div = document.createElement('div');
            div.className = "roster-row flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100";
            div.innerHTML = `<div class="flex-1"><input type="number" value="${8 - i}" oninput="validateRoster()" class="roster-hrs-val w-full input-pill p-1.5 text-xs text-emerald-600 font-black"></div><div class="flex-1 text-center font-black text-slate-300">×</div><div class="flex-1"><input type="number" value="${dist[i]}" oninput="validateRoster()" class="roster-hc-val w-full input-pill p-1.5 text-xs text-slate-900 font-black"></div>`;
            cont.appendChild(div);
        }
    }
    validateRoster();
}

function validateRoster() {
    const targetHC = parseInt(document.getElementById('totalCWHeadcount').value) || 0;
    const forfeit = parseFloat(document.getElementById('forfeit').value) / 100;
    const tpt = parseFloat(document.getElementById('globalTPT').value) || 1;
    const dailyInput = parseFloat(document.getElementById('dailyInput').value) || 0;

    const dailyTargetHrs = (state.mode === 'volume') ? (dailyInput / tpt) : dailyInput;
    const hcInputs = document.querySelectorAll('.roster-hc-val');
    const hrInputs = document.querySelectorAll('.roster-hrs-val');

    let sumHC = 0; let grossHrs = 0;
    hcInputs.forEach((inp, i) => {
        let hc = parseInt(inp.value) || 0;
        let hr = parseFloat(hrInputs[i].value) || 0;
        sumHC += hc; grossHrs += (hc * hr);
    });

    const netHrsAvailable = grossHrs * (1 - forfeit);
    const diff = netHrsAvailable - dailyTargetHrs;
    const fteGap = Math.abs(diff / 8).toFixed(1);

    const summaryList = document.getElementById('rosterSummaryList');
    summaryList.innerHTML = `
        <div class="flex justify-between items-center text-[10px] font-black uppercase"><span class="text-slate-400 tracking-widest">Headcount Alignment:</span><span>${sumHC} / ${targetHC} CWs</span></div>
        <div class="flex justify-between items-center text-[10px] font-black uppercase border-t pt-2"><span class="text-slate-400 tracking-widest">Daily Target:</span><span class="text-blue-600">${dailyTargetHrs.toFixed(1)} HRS</span></div>
        <div class="flex justify-between items-center text-[10px] font-black uppercase"><span class="text-slate-400 tracking-widest">Net Available:</span><span class="text-emerald-600">${netHrsAvailable.toFixed(1)} HRS</span></div>
        <div class="flex justify-between items-center text-[10px] font-black uppercase border-t pt-2">
            <span class="text-slate-400 tracking-widest">${diff >= 0 ? 'Surplus' : 'Deficit'}:</span>
            <span class="${diff >= 0 ? 'text-emerald-600' : 'text-red-500'} font-black">${Math.abs(diff).toFixed(1)} HRS</span>
        </div>
        <div class="p-4 bg-slate-900 rounded-[1.5rem] text-[10px] font-black text-white uppercase mt-2 text-center italic tracking-tight leading-tight">
            ${diff >= 0 ? `You have ${fteGap} more FT employees` : `You have ${fteGap} less FT employees`}
        </div>
    `;

    runAnalysis();
}

function renderUCs() {
    let countInput = document.getElementById('ucCount');
    let count = parseInt(countInput.value) || 1;
    const cont = document.getElementById('ucContainer');
    const target = parseFloat(document.getElementById('dailyInput').value) || 0;

    // Unit Switcher (Only for Volume Mode)
    let unitHtml = state.mode === 'volume' ? `
        <div class="bg-blue-50/50 p-2 rounded-xl border border-blue-100 mb-3 flex justify-between items-center px-4">
            <span class="text-[8px] font-black text-blue-400 uppercase italic">AHT Unit:</span>
            <div class="flex bg-white rounded-lg p-0.5 border shadow-sm">
                <button onclick="setAHTUnit('sec')" class="px-3 py-1 text-[8px] font-black rounded-md ${state.globalAHTUnit === 'sec' ? 'bg-blue-600 text-white' : 'text-slate-400'}">SEC</button>
                <button onclick="setAHTUnit('min')" class="px-3 py-1 text-[8px] font-black rounded-md ${state.globalAHTUnit === 'min' ? 'bg-blue-600 text-white' : 'text-slate-400'}">MIN</button>
                <button onclick="setAHTUnit('hr')" class="px-3 py-1 text-[8px] font-black rounded-md ${state.globalAHTUnit === 'hr' ? 'bg-blue-600 text-white' : 'text-slate-400'}">HRS</button>
            </div>
        </div>` : '';

    let html = unitHtml;
    const dist = distributeInteger(target, count);

    for (let i = 0; i < count; i++) {
        // Grid changes from grid-cols-4 to grid-cols-3
        const gridCols = state.mode === 'volume' ? 'grid-cols-4' : 'grid-cols-3';

        html += `
            <div class="uc-row p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 mb-2">
                <input type="text" value="Use Case ${i + 1}" oninput="runAnalysis()" class="uc-name-input w-full bg-transparent text-[10px] font-black text-blue-600 uppercase italic outline-none input-edit px-1">
                <div class="grid ${gridCols} gap-2">
                    <div class="space-y-1">
                        <label class="text-[7px] font-black text-slate-400 uppercase ml-1">${state.mode === 'volume' ? 'Vol' : 'Raw Hrs'}</label>
                        <input type="number" value="${dist[i]}" oninput="runAnalysis()" class="uc-vol-input p-2 text-[11px] font-black border rounded-xl outline-none text-center bg-white shadow-sm w-full">
                    </div>
                    
                    ${state.mode === 'volume' ? `
                    <div class="space-y-1">
                        <label class="text-[7px] font-black text-slate-400 uppercase ml-1">Throughput</label>
                        <input type="number" value="120" oninput="runAnalysis()" class="uc-aht-input p-2 text-[11px] font-black border rounded-xl outline-none text-center bg-white shadow-sm w-full">
                    </div>` : ''}

                    <div class="space-y-1">
                        <label class="text-[7px] font-black text-slate-400 uppercase ml-1">Hrs/CW</label>
                        <input type="number" value="8" oninput="runAnalysis()" class="uc-shift-input p-2 text-[11px] font-black border border-blue-100 text-blue-600 rounded-xl outline-none text-center bg-white shadow-sm w-full">
                    </div>

                    <div class="space-y-1">
                        <label class="text-[7px] font-black text-slate-400 uppercase ml-1">Buf %</label>
                        <input type="number" value="10" oninput="runAnalysis()" class="uc-buf-input p-2 text-[11px] font-black border rounded-xl outline-none text-center bg-white shadow-sm w-full">
                    </div>
                </div>
            </div>`;
    }
    cont.innerHTML = html;
    runAnalysis();
}
function setMode(m) {
    state.mode = m;
    document.getElementById('btn-vol').className = m === 'volume' ? 'flex-1 py-2 text-[10px] font-black rounded-xl transition-all bg-white text-blue-600 shadow-sm uppercase' : 'flex-1 py-2 text-[10px] font-black rounded-xl transition-all text-slate-500 uppercase';
    document.getElementById('btn-hrs').className = m === 'hours' ? 'flex-1 py-2 text-[10px] font-black rounded-xl bg-white text-blue-600 shadow-sm uppercase' : 'flex-1 py-2 text-[10px] font-black rounded-xl transition-all text-slate-500 uppercase';

    document.getElementById('label-dailyTarget').innerText = m === 'volume' ? 'Target Daily Volume (Tasks)' : 'Target Daily Hours';

    // CHANGE: Ensure Shift Strategy Section is ALWAYS visible regardless of mode
    document.getElementById('shiftStratSec').style.display = 'block';

    document.getElementById('tptContainer').style.display = m === 'volume' ? 'block' : 'none';
    syncAll();
}

// Ensure the renderShifts logic uses the correct basis for distributionfunction renderShifts() {
function renderShifts() {
    let countInput = document.getElementById('shiftBlockCount');
    let count = parseInt(countInput.value) || 1;
    const cont = document.getElementById('shiftStratContainer');
    const target = parseFloat(document.getElementById('dailyInput').value) || 0;

    const nBtn = document.getElementById('sModeNum');
    const pBtn = document.getElementById('sModePerc');

    if (state.mode === 'hours') {
        nBtn.innerText = "Hours";
        pBtn.innerText = "Percent %";
    } else {
        nBtn.innerText = "Numbers";
        pBtn.innerText = "Percent %";
    }

    let columnLabel = (state.shiftMode === 'percent') ? "Percent %" : (state.mode === 'hours' ? "Confirmed Hours" : "Volume / Num");

    // NEW GRID: Added a column for Hrs/CW
    cont.innerHTML = `
        <div class="grid grid-cols-12 gap-1 px-2 text-[7px] font-black text-slate-400 uppercase italic text-center mb-1">
            <div class="col-span-3 text-left">Shift Name</div>
            <div class="col-span-4 text-purple-600">${columnLabel}</div>
            <div class="col-span-2 text-blue-500">Hrs per CW</div>
            <div class="col-span-3 text-emerald-500">Buf %</div>
        </div>
    `;

    const distValue = (state.shiftMode === 'percent') ? (100 / count).toFixed(1) : (target / count).toFixed(1);

    for (let i = 0; i < count; i++) {
        const div = document.createElement('div');
        div.className = "shift-row grid grid-cols-12 items-center gap-1 p-2 bg-slate-50 rounded-xl border border-slate-100 mb-2";
        div.innerHTML = `
            <div class="col-span-3">
                <input type="text" value="Shift ${i + 1}" oninput="runAnalysis()" class="shift-name-input text-[9px] font-black text-purple-600 uppercase w-full bg-transparent outline-none italic px-1">
            </div>
            <div class="col-span-4">
                <input type="number" value="${distValue}" oninput="validateShifts()" class="shift-input w-full bg-white p-1 text-xs font-black border rounded-lg outline-none text-center shadow-sm">
            </div>
            <div class="col-span-2">
                <input type="number" value="8" oninput="runAnalysis()" class="shift-len-input w-full bg-blue-50 p-1 text-xs font-black border border-blue-100 text-blue-600 rounded-lg outline-none text-center shadow-sm">
            </div>
            <div class="col-span-3">
                <input type="number" value="10" oninput="runAnalysis()" class="shift-buffer-input w-full bg-white p-1 text-xs font-black border border-emerald-100 text-emerald-600 rounded-lg outline-none text-center shadow-sm">
            </div>`;
        cont.appendChild(div);
    }
    validateShifts();
}

function validateShifts() {
    const target = parseFloat(document.getElementById('dailyInput').value) || 0;
    const inputs = document.querySelectorAll('.shift-input');
    let sum = 0;
    inputs.forEach(inp => sum += (parseFloat(inp.value) || 0));

    const box = document.getElementById('shiftValidation');

    // Set the Goal: Is it 100% or the Daily Number?
    const goal = (state.shiftMode === 'percent') ? 100 : target;
    const diff = goal - sum;

    // Set the Unit Label
    let unit = "";
    if (state.shiftMode === 'percent') {
        unit = "%";
    } else {
        unit = (state.mode === 'hours') ? "HRS" : "Tasks";
    }

    if (Math.abs(diff) < 0.1) {
        box.innerHTML = `<span>Balanced (${sum}${unit})</span> <i data-lucide="check-circle" class="w-3 h-3 text-emerald-500"></i>`;
        box.className = "p-3 rounded-xl text-[10px] font-black flex items-center justify-between bg-emerald-50 text-emerald-600 mt-2 border border-emerald-100";
    } else {
        const status = diff > 0 ? "Remaining" : "Over";
        box.innerHTML = `<span>${status}: ${Math.abs(diff).toFixed(1)}${unit}</span> <i data-lucide="alert-circle" class="w-3 h-3 pulse-red text-red-500"></i>`;
        box.className = "p-3 rounded-xl text-[10px] font-black flex items-center justify-between bg-red-50 text-red-600 mt-2 border border-red-100";
    }

    lucide.createIcons();
    runAnalysis();
}
function runAnalysis() {
    const dailyInput = parseFloat(document.getElementById('dailyInput').value) || 0;
    const tpt = parseFloat(document.getElementById('globalTPT').value) || 1;
    const forfeit = parseFloat(document.getElementById('forfeit').value) / 100;
    const targetMonth = parseInt(document.getElementById('targetMonth').value);
    const weeks = getStrictWeeks(2026, targetMonth);

    // 1. Demand Calculation
    const baseDailyHrs = (state.mode === 'volume') ? (dailyInput / tpt) : dailyInput;

    // 2. Supply Calculation
    let netGlobalSupplyHrs = 0;
    const rosterRows = document.querySelectorAll('.roster-row');
    const rowArray = Array.from(rosterRows);

    document.querySelectorAll('.roster-hrs-val').forEach((inp, idx) => {
        let h = parseFloat(inp.value) || 0;
        let c = parseFloat(document.querySelectorAll('.roster-hc-val')[idx].value) || 0;
        netGlobalSupplyHrs += (h * c) * (1 - forfeit);
    });

    const variance = netGlobalSupplyHrs - baseDailyHrs;

    // --- POPULATE TAB 3: WEEKLY ROADMAP (CALENDAR LOGIC) ---
    const weeklyBody = document.getElementById('weeklyBreakdownBody');
    const strategyText = document.getElementById('monthlyStrategyText');
    let totalMonthHrs = 0;
    let totalWorkDays = 0;

    if (weeklyBody) {
        weeklyBody.innerHTML = '';
        weeks.forEach((w, i) => {
            let netWeekDays = 0;
            w.days.forEach(d => {
                // Determine if day is active based on 5/6/7 toggle
                let isActive = (state.workDays === 5 && d.dayNum >= 1 && d.dayNum <= 5) ||
                    (state.workDays === 6 && d.dayNum >= 1 && d.dayNum <= 6) ||
                    (state.workDays === 7);

                // Subtract Regional Holidays if "Work Holidays" is NO
                let isHoliday = !state.workHolidays && state.selectedCountries.some(code =>
                    state.allHolidays[code]?.includes(d.dateStr)
                );

                if (isActive && !isHoliday) netWeekDays++;
            });

            // Math: Base Daily Need vs. What is available in the Roster
            const weekDemand = baseDailyHrs * netWeekDays;
            const weekSupply = netGlobalSupplyHrs * netWeekDays;
            const weekGap = weekSupply - weekDemand;

            totalMonthHrs += weekDemand;
            totalWorkDays += netWeekDays;

            weeklyBody.innerHTML += `
                <tr class="hover:bg-slate-50 border-b">
                    <td class="px-10 py-6 font-black italic text-slate-700 uppercase">Week ${i + 1} (${w.label})</td>
                    <td class="px-10 py-6 text-center font-black text-slate-600 uppercase">${netWeekDays} Working Days</td>
                    <td class="px-10 py-6 text-center font-mono font-black text-blue-600 uppercase">${Math.round(weekDemand)} HRS</td>
                    <td class="px-10 py-6 text-right font-black ${weekGap < 0 ? 'text-red-500' : 'text-emerald-600'} uppercase">
                        ${weekGap < 0 ? 'Deficit ' + Math.abs(weekGap).toFixed(0) + ' HRS' : 'Covered'}
                    </td>
                </tr>`;
        });

        // Update the strategy header with the monthly totals
        if (strategyText) {
            strategyText.innerText = `Strategic Roadmap: Total Monthly demand is ${Math.round(totalMonthHrs)} HRS across ${totalWorkDays} net working days.`;
        }
    }

    // --- STYLED HOLIDAY RISK ASSESSMENT ---
    const holidayRiskBox = document.getElementById('summaryHolidayRisk');
    const monthPadded = (targetMonth + 1).toString().padStart(2, '0');
    let monthHolidays = [];

    state.selectedCountries.forEach(code => {
        const hols = state.allHolidays[code] || [];
        hols.forEach(h => {
            if (h.date.startsWith(`2026-${monthPadded}`)) {
                monthHolidays.push({ ...h, country: code });
            }
        });
    });

    if (holidayRiskBox) {
        if (monthHolidays.length > 0) {
            // Sort holidays by date
            monthHolidays.sort((a, b) => a.date.localeCompare(b.date));

            holidayRiskBox.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                    ${monthHolidays.map(h => `
                        <div class="flex items-center justify-between bg-slate-800/50 p-3 rounded-2xl border border-slate-700 group hover:border-amber-500/50 transition-all">
                            <div class="flex items-center gap-4">
                                <div class="flex flex-col items-center justify-center bg-slate-900 h-10 w-10 rounded-xl border border-slate-700 shadow-inner">
                                    <span class="text-[8px] font-black text-amber-500 leading-none uppercase">${MONTHS[targetMonth].substring(0, 3)}</span>
                                    <span class="text-sm font-black text-white leading-none mt-0.5">${h.date.split('-')[2]}</span>
                                </div>
                                <div>
                                    <p class="text-[10px] font-black text-slate-100 uppercase tracking-tight line-clamp-1">${h.name}</p>
                                    <p class="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mt-0.5">Territory: ${h.country}</p>
                                </div>
                            </div>
                            <div class="bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                                <span class="text-[8px] font-black text-amber-500 uppercase italic">Impact High</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            holidayRiskBox.innerHTML = `
                <div class="py-4 text-center">
                    <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">No regional holidays detected for ${MONTHS[targetMonth]} 2026</p>
                </div>`;
        }
    }

    // --- ROUND-ROBIN DISTRIBUTION LOGIC ---
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';

    // Calculate how many WHOLE people are needed globally
    // We use the first block as the reference for "standard" shift length
    const refHrs = parseFloat(rowArray[0]?.querySelector('.roster-hrs-val').value) || 8;
    let totalPeopleToDistribute = Math.ceil(Math.abs(variance) / (refHrs || 1));
    const isDeficit = variance < 0;

    // Initialize an array to track adjustments per row
    let adjustments = new Array(rowArray.length).fill(0);

    // Round-Robin Loop: Give 1 person to each row, then loop back, until pool is empty
    if (Math.abs(variance) > 0.5) {
        let i = 0;
        while (totalPeopleToDistribute > 0) {
            adjustments[i]++;
            totalPeopleToDistribute--;
            i = (i + 1) % rowArray.length; // Loop back to 0 after the last row
        }
    }

    rowArray.forEach((row, index) => {
        const hrsVal = parseFloat(row.querySelector('.roster-hrs-val').value) || 0;
        const hcVal = parseFloat(row.querySelector('.roster-hc-val').value) || 0;
        const blockSupply = (hrsVal * hcVal) * (1 - forfeit);

        let adjText = "";
        let adjColor = "text-slate-400";

        if (adjustments[index] === 0) {
            adjText = "STABLE";
            adjColor = "text-emerald-500 font-black";
        } else {
            adjText = isDeficit ? `ADD ${adjustments[index]} CW(s)` : `SURPLUS ${adjustments[index]} CW(s)`;
            adjColor = isDeficit ? "text-red-500 font-black" : "text-blue-600 font-black";
        }

        tableBody.innerHTML += `
            <tr class="hover:bg-slate-50 border-b">
                <td class="px-10 py-5 font-black italic uppercase text-slate-700">Sequence Block ${index + 1} (${hrsVal} HRS)</td>
                <td class="px-10 py-5 text-center text-xs font-black uppercase text-slate-500">${hcVal} CWs</td>
                <td class="px-10 py-5 text-center font-mono font-black text-blue-600 uppercase">${blockSupply.toFixed(1)} HRS</td>
                <td class="px-10 py-5 text-right px-10 ${adjColor}">${adjText}</td>
            </tr>`;
    });

    // --- STRATEGIC NOTES ---
    tableBody.innerHTML += `
        <tr>
            <td colspan="4" class="p-8 bg-slate-50/50 border-t-2 border-slate-200">
                <div class="space-y-4">
                    <h4 class="text-[11px] font-black uppercase tracking-[0.3em] text-blue-600 italic">Sequential Roster Scaling</h4>
                    <div class="space-y-1 text-[11px] font-black uppercase tracking-tight text-slate-700">
                        <p>Total Demand: <span class="text-slate-900">${baseDailyHrs.toFixed(1)} HRS</span></p>
                        <p>Total Supply: <span class="text-emerald-600">${netGlobalSupplyHrs.toFixed(1)} HRS</span></p>
                        <p>Variance: <span class="${variance >= 0 ? 'text-blue-600' : 'text-red-500'} underline">${Math.abs(variance).toFixed(1)} HRS ${variance >= 0 ? 'SURPLUS' : 'DEFICIT'}</span></p>
                    </div>
                    <p class="text-[11px] font-black italic uppercase leading-relaxed text-slate-500 pt-2 border-t border-slate-200">
                        Strategy: Distribution follows a round-robin sequence. Each active block is assigned one whole Cloudworker per cycle until the total hour variance is satisfied.
                    </p>
                </div>
            </td>
        </tr>
    `;

    // --- RESTORED BY USE CASE TAB (Unchanged) ---
    // --- UPDATED BY USE CASE TAB: CAPABILITY ANALYSIS ---
    const ucListCont = document.getElementById('uc-list-container');
    const ucValidation = document.getElementById('ucValidation'); // Sidebar Paragraph Target

    if (ucListCont) {
        ucListCont.innerHTML = '';
        let xTotalDemandHrs = 0;
        let capableUCs = [];
        let unableUCs = [];
        let runningSupply = netGlobalSupplyHrs;
        const ucRows = document.querySelectorAll('.uc-row');

        let cardsHtml = '';
        ucRows.forEach((row) => {
            const name = row.querySelector('.uc-name-input').value;
            const val = parseFloat(row.querySelector('.uc-vol-input').value) || 0;
            const shiftHrs = parseFloat(row.querySelector('.uc-shift-input').value) || 8;
            const buf = parseFloat(row.querySelector('.uc-buf-input').value) || 0;

            let streamHrs = 0;
            if (state.mode === 'volume') {
                const aht = parseFloat(row.querySelector('.uc-aht-input').value) || 0;
                let mult = state.globalAHTUnit === 'min' ? 60 : (state.globalAHTUnit === 'hr' ? 3600 : 1);
                streamHrs = ((val * (aht * mult)) / 3600) * (1 + (buf / 100));
            } else {
                streamHrs = val * (1 + (buf / 100));
            }

            const peopleNeeded = streamHrs / shiftHrs;
            xTotalDemandHrs += streamHrs;

            if (runningSupply >= streamHrs) {
                capableUCs.push(name);
                runningSupply -= streamHrs;
            } else {
                unableUCs.push(name);
            }

            cardsHtml += `
                <div class="p-6 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm flex justify-between items-center">
                    <div>
                        <h5 class="text-xs font-black italic uppercase text-blue-600">${name}</h5>
                        <div class="flex gap-4 mt-1">
                            <p class="text-[9px] text-slate-400 font-black uppercase italic tracking-tighter">Demand: <span class="text-slate-900">${streamHrs.toFixed(1)} HRS</span></p>
                            <p class="text-[9px] text-slate-400 font-black uppercase italic tracking-tighter border-l pl-4">Shift: <span class="text-slate-900">${shiftHrs} HR</span></p>
                        </div>
                    </div>
                    <div class="bg-blue-50 px-3 py-1 rounded-xl text-[10px] font-black text-blue-600 uppercase font-mono">
                        ${peopleNeeded.toFixed(1)} CWs
                    </div>
                </div>`;
        });

        const diff = netGlobalSupplyHrs - xTotalDemandHrs;
        const isDeficit = diff < 0;

        // --- SIDEBAR PARAGRAPH (The one you asked for) ---
        if (ucValidation) {
            ucValidation.innerHTML = `
                <div class="space-y-2 w-full text-left">
                    <p class="text-[10px] font-medium leading-relaxed lowercase text-slate-500 first-letter:uppercase tracking-tight">
                        Total hours needed is <span class="font-black text-slate-900 font-mono">${xTotalDemandHrs.toFixed(1)} hours</span>. 
                        Shift availability has <span class="font-black text-blue-600 font-mono">${netGlobalSupplyHrs.toFixed(1)} hrs</span>.
                    </p>
                    <div class="pt-2 border-t border-slate-100">
                        <p class="text-[9px] font-black uppercase italic tracking-wider ${isDeficit ? 'text-red-500' : 'text-emerald-600'}">
                            ${isDeficit
                    ? `⚠️ Deficit: Short ${Math.abs(diff).toFixed(1)} hours`
                    : `✅ Surplus: ${Math.abs(diff).toFixed(1)} extra hours`}
                        </p>
                    </div>
                </div>
            `;
            ucValidation.className = `p-4 rounded-2xl border mt-4 transition-all duration-300 ${isDeficit ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`;
        }

        // Render main tab view
        ucListCont.innerHTML = `
            <div class="col-span-full p-8 bg-slate-900 rounded-[3rem] text-white mb-6 space-y-4 shadow-xl border border-slate-800">
                <div class="flex items-center gap-3"><i data-lucide="users" class="w-5 h-5 text-blue-400"></i><h4 class="text-[10px] font-black tracking-[0.2em] uppercase text-slate-400">Requirement Breakdown</h4></div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div class="space-y-2">
                        <p class="text-[11px] font-black uppercase text-slate-300">Total Hours Needed: <span class="text-white">${xTotalDemandHrs.toFixed(1)} HRS</span></p>
                        <p class="text-[11px] font-black uppercase text-slate-300">Net Global Supply: <span class="text-blue-400">${netGlobalSupplyHrs.toFixed(1)} HRS</span></p>
                        <p class="text-[11px] font-black uppercase ${isDeficit ? 'text-red-400' : 'text-emerald-400'}">Balance: ${Math.abs(diff).toFixed(1)} HR ${!isDeficit ? 'Surplus' : 'Deficit'}</p>
                    </div>
                    <div class="bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
                        <p class="text-[10px] font-black text-slate-200 uppercase mb-2">Capable:</p>
                        <p class="text-[10px] font-black text-slate-400 italic">${capableUCs.join(', ') || 'None'}</p>
                        ${unableUCs.length > 0 ? `<p class="text-[10px] font-black text-red-400 uppercase mt-2 mb-1">Unable:</p><p class="text-[10px] font-black text-slate-500 line-through">${unableUCs.join(', ')}</p>` : ''}
                    </div>
                </div>
            </div>
            <div class="col-span-full grid grid-cols-1 md:grid-cols-2 gap-4">${cardsHtml}</div>
        `;
        lucide.createIcons();
    }
    // --- UPDATED BLOCK DIST TAB: DYNAMIC COLUMNS & CLEAN FORMAT ---
    // --- UPDATED BLOCK DIST TAB: ADDED TOTALS & DYNAMIC SUMMARY ---
    const blockCont = document.getElementById('view-blocks');
    if (blockCont) {
        let totalVol = 0;
        let totalHrs = 0;
        let totalCW = 0;
        let rowsHtml = '';
        const shiftRows = document.querySelectorAll('.shift-row');
        const isHoursMode = (state.mode === 'hours');

        shiftRows.forEach((row) => {
            const name = row.querySelector('.shift-name-input').value;
            const val = parseFloat(row.querySelector('.shift-input').value) || 0;
            const shiftLen = parseFloat(row.querySelector('.shift-len-input').value) || 8;
            const bufferVal = parseFloat(row.querySelector('.shift-buffer-input').value) || 0;

            let bBasis = (state.shiftMode === 'percent') ? (dailyInput * (val / 100)) : val;
            let bHrs = isHoursMode ? bBasis : (bBasis / tpt);
            let finalHrs = bHrs * (1 + (bufferVal / 100));
            
            // MATH UPDATE: Round up to whole person per shift
            let bCWs = Math.ceil(finalHrs / (shiftLen || 8));

            totalVol += (isHoursMode ? 0 : bBasis);
            totalHrs += finalHrs;
            totalCW += bCWs;

            rowsHtml += `
                <tr class="hover:bg-slate-50 border-b">
                    <td class="px-10 py-6 font-black italic uppercase text-purple-600">${name}</td>
                    ${!isHoursMode ? `
                    <td class="px-10 py-6 text-center italic text-xs font-black">
                        ${state.shiftMode === 'percent' ? val + '%' : val.toLocaleString()} Vol
                    </td>` : ''}
                    <td class="px-10 py-6 text-center font-mono font-black text-slate-700">${finalHrs.toFixed(1)} HRS</td>
                    <td class="px-10 py-6 text-right px-10 font-mono font-black text-blue-600">
                        ${bCWs}
                    </td>
                </tr>`;
        });

        const availableCWs = (netGlobalSupplyHrs / 8).toFixed(1);
        const projectedCWs = totalCW; // Whole number from the sum of ceils
        const diffCWs = Math.abs(parseFloat(availableCWs) - projectedCWs).toFixed(1);
        const isDeficit = projectedCWs > parseFloat(availableCWs);
        const tptHrsNeeded = totalVol / tpt;

        blockCont.innerHTML = `
            <div class="space-y-1 mb-6 p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <div class="text-[10px] font-black text-slate-400 italic uppercase tracking-widest leading-relaxed">
                    Distributed: ${Math.round(totalVol).toLocaleString()} ${isHoursMode ? 'Hours' : 'Tasks'}
                </div>
                
                ${!isHoursMode ? `
                <div class="text-[10px] font-black text-blue-400 italic uppercase tracking-widest leading-relaxed">
                    Hours needed based on TPT (${tpt}): ${tptHrsNeeded.toFixed(1)} HRS
                </div>` : ''}

                <div class="text-[10px] font-black text-emerald-500 italic uppercase tracking-widest font-mono leading-relaxed">
                    Net Available: ${netGlobalSupplyHrs.toFixed(1)} HRS
                </div>
                
                <div class="text-[10px] font-black text-blue-500 italic uppercase tracking-widest leading-relaxed">
                    Total Strategy Requirement: ${projectedCWs} CWs (Based on headcount total)
                </div>

               
            </div>

            <div class="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
                <table class="w-full text-left">
                    <thead>
                        <tr class="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b bg-slate-50/50">
                            <th class="px-10 py-4 italic">Shift Block</th>
                            ${!isHoursMode ? `<th class="text-center italic">Basis</th>` : ''}
                            <th class="text-center italic">Hours</th>
                            <th class="text-right px-10 italic">Headcount</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${rowsHtml}
                    </tbody>
                    <tfoot class="text-[13px] font-black text-slate-500 uppercase tracking-tight border-t-2 border-slate-200 bg-slate-50/80">
                        <tr>
                            <td class="px-10 py-5 italic text-slate-900">Total Strategy</td>
                            ${!isHoursMode ? `
                            <td class="text-center italic text-slate-400">${Math.round(totalVol).toLocaleString()} Vol</td>` : ''}
                            <td class="text-center font-mono text-slate-800">${totalHrs.toFixed(1)} HRS</td>
                            <td class="text-right px-10 font-mono text-blue-700 text-lg">
                                ${totalCW} <span class="text-[13px] tracking-widest">CWs</span>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;
    }
    // --- SCOREBOARD ---
    document.getElementById('scoreboard').innerHTML = [
        { label: 'Daily Demand', val: baseDailyHrs.toFixed(1) + ' HRS' },
        { label: 'Daily Supply', val: netGlobalSupplyHrs.toFixed(1) + ' HRS' },
        { label: 'Daily Variance', val: (variance >= 0 ? '+' : '') + variance.toFixed(1) },
        { label: 'Target Month', val: Math.round(baseDailyHrs * 22).toLocaleString() }
    ].map(c => `<div class="bg-white p-6 rounded-[2rem] border shadow-sm"><p class="text-[10px] font-black text-slate-400 uppercase italic mb-1 tracking-widest">${c.label}</p><h3 class="text-xl font-black italic mt-1 tracking-tighter">${c.val}</h3></div>`).join('');

    lucide.createIcons();
}

function getStrictWeeks(y, m) {
    let weeks = []; let cur = new Date(y, m, 1); let last = new Date(y, m + 1, 0);
    while (cur <= last) {
        let start = new Date(cur); let weekDays = [];
        for (let i = 0; i < 7; i++) { if (cur.getMonth() !== m) break; weekDays.push({ dateStr: cur.toISOString().split('T')[0], dayNum: cur.getDay() }); if (cur.getDay() === 0) { cur.setDate(cur.getDate() + 1); break; } cur.setDate(cur.getDate() + 1); }
        let end = new Date(cur); end.setDate(end.getDate() - 1); weeks.push({ label: `${start.getDate()} - ${end.getMonth() === m ? end.getDate() : last.getDate()}`, days: weekDays });
    }
    return weeks;
}
function setAHTUnit(unit) {
    state.globalAHTUnit = unit;
    renderUCs(); // Refreshes the buttons to show which is active
    runAnalysis(); // Recalculates the hours based on the new unit
}

window.onload = init;

// test 
