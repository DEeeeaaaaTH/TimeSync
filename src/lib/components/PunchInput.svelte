<script>
	import { processPunches } from '$lib/logic/ruleEngine.js';

	let punches = [{ employeeId: '', name: '', date: '', time: '' }];
	let periodStartDate = '';
	let results = null;

	function addEmptyRow() {
		punches = [...punches, { employeeId: '', name: '', date: '', time: '' }];
	}

	function duplicateRow(index) {
		const newRow = { ...punches[index] };
		punches = [...punches.slice(0, index + 1), newRow, ...punches.slice(index + 1)];
	}

	function deleteRow(index) {
		if (punches.length > 1) {
			punches = punches.filter((_, i) => i !== index);
		}
	}

	function handleProcess() {
		if (!periodStartDate || punches.length === 0) return;
		results = processPunches(punches, periodStartDate);
	}

	function handleCSVUpload(event) {
	const file = event.target.files[0];
	if (!file || !periodStartDate) return;

	const reader = new FileReader();

	reader.onload = () => {
		try {
			const lines = reader.result.split('\n').map(line => line.trim()).filter(Boolean);
			const dataLines = lines.slice(1); // skip header
			const parsed = dataLines.map(line => {
				const [employeeId, name, date, time] = line.split(',').map(x => x.trim());
				return { employeeId, name, date, time };
			});
			results = processPunches(parsed, periodStartDate); // Skip the table and process directly
		} catch (error) {
			console.error('Error parsing CSV:', error);
		}
	};

	reader.onerror = () => {
		console.error('Error reading file');
	};
	
	reader.readAsText(file);
}
	function countAlerts(days, types) {
		return days.reduce((count, d) => {
			return count + d.alerts.filter(a => types.includes(a)).length;
		}, 0);
	}

	function exportToCSV(data) {
		if (!data || data.length === 0) return;

		const headers = [
			'Key',
			'#Employee Name',
			'E_Hourly_Hours',
			'E_Overtime_Hours',
			'E_Double Time_Hours',
			'E_Break Penalty_Hours',
			'E_Meal Penalty_Hours',
			'E_Split Shift_Hours'
		];

		const rows = data.map(r => [
			r.employeeId,
			r.name,
			r.totals.regular,
			r.totals.overtime,
			r.totals.doubleTime,
			countAlerts(r.days, ['Missing Punch']),
			countAlerts(r.days, ['No Lunch Break', 'No Second Lunch']),
			countAlerts(r.days, ['Split Shift'])
		]);

		const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');

		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.setAttribute('href', url);
		link.setAttribute('download', 'punch_summary.csv');
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}
</script>

<style>
	.upload-button {
		padding: 8px 16px;
		background-color: #1e3a8a;
		color: white;
		border-radius: 5px;
		cursor: pointer;
		font-weight: bold;
		transition: background-color 0.2s ease;
	}

	.upload-button:hover {
		background-color: #2c5282;
	}

	input[type="file"] {
		display: none;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		margin-top: 1rem;
	}

	th, td {
		border: 1px solid #e0e0e0;
		padding: 8px;
		text-align: left;
		vertical-align: middle;
	}

	th {
		background-color: #e8f0ff;
		color: #1e3a8a;
	}

	input[type="text"],
	input[type="date"],
	input[type="time"] {
		width: 100%;
		padding: 6px;
		border: 1px solid #ccc;
		border-radius: 4px;
		box-sizing: border-box;
	}

	button {
		padding: 6px 10px;
		background-color: #1e3a8a;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 14px;
	}

	button:hover {
		background-color: #2c5282;
	}

	.delete-button {
		background-color: #dc2626;
	}

	.delete-button:hover {
		background-color: #b91c1c;
	}
</style>

<!-- Period Start Date -->
<div style="margin-bottom: 1rem;">
	<label for="period-start" class="font-semibold text-blue-900 block mb-1">
		Period Start Date <span class="text-red-500">*</span>
	</label>
	<input id="period-start" type="date" bind:value={periodStartDate} required />
</div>

<!-- Entry Table -->
<table>
	<thead>
		<tr>
			<th></th>
			<th>Employee ID</th>
			<th>Name</th>
			<th>Date</th>
			<th>Time</th>
			<th></th>
		</tr>
	</thead>
	<tbody>
		{#each punches as punch, index}
			<tr>
				<td><button on:click={() => duplicateRow(index)}>⎘</button></td>
				<td><input type="text" bind:value={punch.employeeId} /></td>
				<td><input type="text" bind:value={punch.name} /></td>
				<td><input type="date" bind:value={punch.date} /></td>
				<td><input type="time" bind:value={punch.time} /></td>
				<td><button class="delete-button" on:click={() => deleteRow(index)}>🗑</button></td>
			</tr>
		{/each}
	</tbody>
</table>

<!-- Controls: Add / Process / Upload -->
<div style="margin-top: 1rem; text-align: right; display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 1rem;">
	<button on:click={addEmptyRow}>➕ Add New Line</button>

	<!-- Manual Process -->
	<button
		on:click={handleProcess}
		class="bg-green-600 hover:bg-green-700"
		disabled={!periodStartDate || punches.length === 0}
	>
		▶ Process Punches
	</button>

	<!-- CSV Upload + Process -->
	<label for="csv-upload" class="upload-button">📄 Upload CSV</label>
	<input id="csv-upload" type="file" accept=".csv" on:change={handleCSVUpload} />
</div>

<!-- Results Table -->
{#if results}
	<div class="mt-6 p-4 bg-white border border-gray-300 rounded shadow">
		<div class="flex items-center justify-between mb-4">
			<h4 class="text-lg font-semibold text-blue-900">Processed Summary:</h4>
			<button
				on:click={() => exportToCSV(results)}
				class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
			>
				📤 Export CSV
			</button>
		</div>

		<table class="w-full border-collapse text-sm">
			<thead>
				<tr class="bg-blue-100 text-blue-900">
					<th class="p-2 border">Employee ID</th>
					<th class="p-2 border">Name</th>
					<th class="p-2 border">Regular Hours</th>
					<th class="p-2 border">OT Hours</th>
					<th class="p-2 border">Double Time</th>
					<th class="p-2 border">Break Penalty</th>
					<th class="p-2 border">Meal Penalty</th>
					<th class="p-2 border">Split Shift</th>
				</tr>
			</thead>
			<tbody>
				{#each results as r}
					<tr class="text-center">
						<td class="border p-2">{r.employeeId}</td>
						<td class="border p-2">{r.name}</td>
						<td class="border p-2">{r.totals.regular}</td>
						<td class="border p-2">{r.totals.overtime}</td>
						<td class="border p-2">{r.totals.doubleTime}</td>
						<td class="border p-2">{countAlerts(r.days, ['Missing Punch'])}</td>
						<td class="border p-2">{countAlerts(r.days, ['No Lunch Break', 'No Second Lunch'])}</td>
						<td class="border p-2">{countAlerts(r.days, ['Split Shift'])}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
