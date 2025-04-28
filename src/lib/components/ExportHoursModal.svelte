<script lang="ts">
    import { supabase } from '$lib/supabaseClient';
    import { processPunches } from '$lib/logic/ruleEngine.js';
    import { createEventDispatcher } from 'svelte';
    import { jsPDF } from 'jspdf';
    import 'jspdf-autotable'; // ✅ Correct modern import for SvelteKit (Vite)
  
    export let open = false;
    export let clientId = '';
    export let availablePeriods = [];
  
    const dispatch = createEventDispatcher();
  
    let selectedPeriodIndex = 0;
    let loading = false;
  
    async function handleExportCSV() {
      await exportData('csv');
    }
  
    async function handleExportPDF() {
      await exportData('pdf');
    }
  
    async function exportData(type: 'csv' | 'pdf') {
      if (!clientId || availablePeriods.length === 0) {
        alert('Missing client or periods.');
        return;
      }
  
      const selectedPeriod = availablePeriods[selectedPeriodIndex];
      if (!selectedPeriod) {
        alert('Invalid period selection.');
        return;
      }
  
      loading = true;
  
      const { data: punchesData, error: punchesError } = await supabase
        .from('punches')
        .select(`
          date,
          time,
          user:user_id (
            id,
            name,
            employee_id,
            client_id
          )
        `);
  
      if (punchesError || !punchesData) {
        alert('Failed to fetch punches.');
        loading = false;
        return;
      }
  
      const filteredPunches = punchesData.filter(p =>
        p.user?.client_id === clientId &&
        p.date >= selectedPeriod.start &&
        p.date <= selectedPeriod.end
      );
  
      if (filteredPunches.length === 0) {
        alert('No punches found for the selected period.');
        loading = false;
        return;
      }
  
      const formattedPunches = filteredPunches.map(p => ({
        employeeId: p.user.employee_id || '',
        name: p.user.name || '',
        date: p.date,
        time: p.time,
      }));
  
      const results = processPunches(formattedPunches, selectedPeriod.start);
  
      if (type === 'csv') {
        exportToCSV(results);
      } else if (type === 'pdf') {
        await exportToPDF(results, selectedPeriod);
      }
  
      loading = false;
      dispatch('close');
    }
  
    function countAlerts(days, types) {
      return days.reduce((count, d) => {
        return count + d.alerts.filter(a => types.includes(a)).length;
      }, 0);
    }
  
    function exportToCSV(data) {
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
  
    async function exportToPDF(data, selectedPeriod) {
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('legal_name')
        .eq('id', clientId)
        .single();
  
      if (clientError || !clientData) {
        alert('Failed to fetch client info.');
        return;
      }
  
      const clientName = clientData.legal_name || 'Client';
  
      const doc = new jsPDF();
  
      doc.setFontSize(16);
      doc.text('Punch Summary Report', 14, 20);
      doc.setFontSize(10);
      doc.text(`Period: ${selectedPeriod.start} to ${selectedPeriod.end}`, 14, 28);
  
      const tableHeaders = [
        ['Employee ID', 'Name', 'Regular', 'Overtime', 'Double Time', 'Break Penalty', 'Meal Penalty', 'Split Shift']
      ];
  
      const tableRows = data.map(r => [
        r.employeeId,
        r.name,
        r.totals.regular,
        r.totals.overtime,
        r.totals.doubleTime,
        countAlerts(r.days, ['Missing Punch']),
        countAlerts(r.days, ['No Lunch Break', 'No Second Lunch']),
        countAlerts(r.days, ['Split Shift'])
      ]);
  
      doc.autoTable({
        head: tableHeaders,
        body: tableRows,
        startY: 35,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 3
        },
        headStyles: {
          fillColor: [30, 64, 175],
          textColor: [255, 255, 255],
          halign: 'center'
        },
        didDrawPage: function (data) {
          const pageSize = doc.internal.pageSize;
          const pageHeight = pageSize.height || pageSize.getHeight();
          const footerY = pageHeight - 10;
  
          const centerX = pageSize.width / 2;
  
          doc.setFontSize(8);
  
          // Left: Client Name bold
          doc.setFont('helvetica', 'bold');
          doc.text(clientName, 14, footerY, { align: 'left' });
  
          // Center: Period start and end, partial bold
          let centerTextStart = `Period: ${selectedPeriod.start} To ${selectedPeriod.end}`;
  
          // Since jsPDF can't partial bold easily, we bold whole center text
          doc.setFont('helvetica', 'bold');
          doc.text(centerTextStart, centerX, footerY, { align: 'center' });
  
          // Right: TimeSync™ bold
          doc.setFont('helvetica', 'bold');
          doc.text('TimeSync™', pageSize.width - 14, footerY, { align: 'right' });
        }
      });
  
      doc.save('punch_summary.pdf');
    }
  </script>
  
  {#if open}
  <div class="modal-backdrop" on:click={() => dispatch('close')}></div>
  <div class="modal">
    <h2 class="text-xl font-bold mb-4">Export Hours</h2>
  
    <div class="flex flex-col gap-2 w-full">
      <label class="font-semibold text-gray-700">Select Pay Period:</label>
      <select bind:value={selectedPeriodIndex} class="border p-2 rounded">
        {#each availablePeriods as period, index}
          <option value={index}>
            {period.start} → {period.end}
          </option>
        {/each}
      </select>
    </div>
  
    <div class="flex justify-end gap-2 mt-6">
      <button on:click={() => dispatch('close')} class="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded">
        Cancel
      </button>
      <button on:click={handleExportCSV} class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
        {#if loading}
          ⏳ Exporting CSV...
        {:else}
          📤 Export CSV
        {/if}
      </button>
      <button on:click={handleExportPDF} class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded">
        {#if loading}
          ⏳ Exporting PDF...
        {:else}
          📄 Export PDF
        {/if}
      </button>
    </div>
  </div>
  {/if}
  
  <style>
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      z-index: 10;
    }
    .modal {
      position: fixed;
      top: 50%;
      left: 50%;
      width: 90%;
      max-width: 400px;
      background: white;
      padding: 1rem;
      border-radius: 8px;
      transform: translate(-50%, -50%);
      z-index: 11;
      box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
      text-align: center;
    }
  </style>
  