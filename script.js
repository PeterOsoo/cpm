if (holidayRiskBox) {
    const monthPadded = (targetMonth + 1).toString().padStart(2, '0');
    let groupedHolidays = {};

    state.selectedCountries.forEach(code => {
        const hols = state.allHolidays[code] || [];
        hols.forEach(h => {
            if (h.date.startsWith(`2026-${monthPadded}`)) {
                if (!groupedHolidays[h.date]) {
                    groupedHolidays[h.date] = { name: h.name, territories: [] };
                }
                if (!groupedHolidays[h.date].territories.includes(code)) {
                    groupedHolidays[h.date].territories.push(code);
                }
            }
        });
    });

    const sortedDates = Object.keys(groupedHolidays).sort();

    if (sortedDates.length > 0) {
        holidayRiskBox.innerHTML = sortedDates.map(date => {
            const h = groupedHolidays[date];
            const day = date.split('-')[2];
            const monthName = MONTHS[targetMonth].substring(0, 3);
            
            // Just raw text: Date -- Holiday Name -- Countries
            return `
                <div class="grid grid-cols-12 gap-4 py-4 items-center">
                    <div class="col-span-2 font-mono font-black text-blue-600 text-xs">
                        ${day} ${monthName}
                    </div>
                    <div class="col-span-7 font-black uppercase text-[10px] text-slate-700 italic">
                        ${h.name}
                    </div>
                    <div class="col-span-3 text-right font-black text-[10px] text-emerald-600 uppercase tracking-tighter">
                        ${h.territories.join(' • ')}
                    </div>
                </div>
            `;
        }).join('');
    } else {
        holidayRiskBox.innerHTML = `<p class="text-[10px] font-black text-slate-300 uppercase italic">No regional overlaps found.</p>`;
    }
}
