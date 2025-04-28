import { parseISO, format, differenceInMinutes, addDays } from 'date-fns';

export function processPunches(punches, periodStartDate) {
	const weekStart = parseISO(periodStartDate);
	const grouped = groupByEmployeeAndDate(punches);
	const results = [];

	for (const [employeeId, days] of Object.entries(grouped)) {
		const employee = {
			employeeId,
			name: Object.values(days)[0][0]?.name || '',
			totals: { regular: 0, overtime: 0, doubleTime: 0 },
			days: []
		};

		let consecutiveWorkDays = [];

		for (let week = 0; week < 2; week++) {
			let weeklyRegularMinutes = 0;

			for (let i = 0; i < 7; i++) {
				const date = format(addDays(weekStart, week * 7 + i), 'yyyy-MM-dd');
				const punchesForDay = days[date] || [];
				const blocks = pairPunches(punchesForDay);
				const alerts = [];

				if (punchesForDay.length % 2 !== 0) alerts.push('Missing Punch');

				const totalMinutes = blocks.reduce((sum, b) => sum + differenceInMinutes(b.out, b.in), 0);
				const breakDurations = getBreakDurations(blocks);

				const tookLunch1 = breakDurations.some(mins => mins >= 30 && mins <= 60);
				const tookLunch2 = breakDurations.filter(mins => mins >= 30).length >= 2;
				if (totalMinutes > 300 && !tookLunch1) alerts.push('No Lunch Break');
				if (totalMinutes > 600 && !tookLunch2) alerts.push('No Second Lunch');

				for (let j = 1; j < blocks.length; j++) {
					const prevOut = blocks[j - 1].out;
					const currIn = blocks[j].in;
					if (differenceInMinutes(currIn, prevOut) > 60) {
						alerts.push('Split Shift');
						break;
					}
				}

				let reg = 0, ot = 0, dt = 0;
				let minutes = totalMinutes;

				if (minutes > 720) {
					dt = minutes - 720;
					minutes = 720;
				}
				if (minutes > 480) {
					ot = minutes - 480;
					minutes = 480;
				}
				reg = minutes;

				if (totalMinutes > 0) {
					consecutiveWorkDays.push(date);
					if (consecutiveWorkDays.length === 7) {
						alerts.push('7th Day Rule');
						if (reg > 480) {
							dt += reg - 480;
							reg = 480;
						}
						ot += reg;
						reg = 0;
						consecutiveWorkDays = [];
					}
				} else {
					consecutiveWorkDays = [];
				}

				// Weekly 40-hour cap (2400 mins)
				if (weeklyRegularMinutes + reg > 2400) {
					const overflow = weeklyRegularMinutes + reg - 2400;
					reg -= overflow;
					ot += overflow;
				}
				weeklyRegularMinutes += reg;

				employee.days.push({
					date,
					regular: (reg / 60).toFixed(2),
					overtime: (ot / 60).toFixed(2),
					doubleTime: (dt / 60).toFixed(2),
					totalHours: (totalMinutes / 60).toFixed(2),
					alerts,
					blocks: blocks.map(b => ({
						in: format(b.in, 'HH:mm'),
						out: format(b.out, 'HH:mm'),
						duration: differenceInMinutes(b.out, b.in)
					}))
				});

				employee.totals.regular += reg;
				employee.totals.overtime += ot;
				employee.totals.doubleTime += dt;
			}
		}

		employee.totals = {
			regular: (employee.totals.regular / 60).toFixed(2),
			overtime: (employee.totals.overtime / 60).toFixed(2),
			doubleTime: (employee.totals.doubleTime / 60).toFixed(2)
		};

		results.push(employee);
	}

	return results;
}

function groupByEmployeeAndDate(punches) {
	const grouped = {};
	for (const p of punches) {
		const time = parseISO(`${p.date}T${p.time}`);
		const dateStr = format(time, 'yyyy-MM-dd');
		if (!grouped[p.employeeId]) grouped[p.employeeId] = {};
		if (!grouped[p.employeeId][dateStr]) grouped[p.employeeId][dateStr] = [];
		grouped[p.employeeId][dateStr].push({ ...p, timestamp: time });
	}
	return grouped;
}

function pairPunches(punches) {
	const sorted = [...punches].sort((a, b) => a.timestamp - b.timestamp);
	const pairs = [];
	for (let i = 0; i < sorted.length; i += 2) {
		if (i + 1 < sorted.length) {
			pairs.push({ in: sorted[i].timestamp, out: sorted[i + 1].timestamp });
		}
	}
	return pairs;
}

function getBreakDurations(blocks) {
	const breaks = [];
	for (let i = 1; i < blocks.length; i++) {
		const prevOut = blocks[i - 1].out;
		const currIn = blocks[i].in;
		const gap = differenceInMinutes(currIn, prevOut);
		breaks.push(gap);
	}
	return breaks;
}
