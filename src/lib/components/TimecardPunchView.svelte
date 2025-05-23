<script lang="ts">
  import { supabase } from '$lib/supabaseClient';
  import { onMount, tick } from 'svelte';
  import { writable } from 'svelte/store';
  import { fade } from 'svelte/transition';
  import { createEventDispatcher } from 'svelte';
  import SignTimecardModal from '$lib/components/SignTimecardModal.svelte';
  import { jsPDF } from 'jspdf'; // ✅ PDF generation

  const dispatch = createEventDispatcher();

  export let userId: string;
  export let clientPeriodStart: string;
  export let viewAsEmployee: boolean = false;
  let hasMissingPunch = false;

  let allPunches = [];
  let currentPeriodPunches = [];
  export let dayBlocks = [];

  let summaries = [];
  let splitShiftAwards = writable({});
  let showPunchPreview = true;

  let periodOffset = 0;
  let currentPeriodStart;
  let selectedDay = null;
  let timecardReady = false;
  let showSignModal = false;
  let alreadySigned = false;

  let userName = "";
  let companyName = "";

  const hourLabels = Array.from({ length: 24 }, (_, i) => i);

  onMount(async () => {
    if (clientPeriodStart) {
      setPeriodStart();
      await tick();
      await fetchPunches();
      await tick();
      await updateCurrentPeriod();
      await fetchUserName();
      await fetchCompanyName();
    }
  });

  


async function fetchCompanyName() {
  try {
    // Fetch the user details from the 'users' table first to get the associated client_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('client_id')
      .eq('id', userId) // Fetching user record by userId
      .single();

    if (userError) {
      throw new Error(`Error fetching user details: ${userError.message}`);
    }

    const clientId = userData?.client_id;
    if (!clientId) {
      throw new Error('No client_id associated with this user.');
    }

    // Use the client_id to fetch the company name from the 'clients' table
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('legal_name')
      .eq('id', clientId) // Using the client_id fetched from the user
      .single();

    if (clientError) {
      throw new Error(`Error fetching company name: ${clientError.message}`);
    }

    companyName = clientData?.legal_name || "Unknown Company"; // Assign company name
  } catch (error) {
    console.error('Error fetching company name:', error);
    companyName = "Unknown Company"; // Default fallback
  }
}


  async function fetchUserName() {
    const { data, error } = await supabase
      .from('users')
      .select('name')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user name:', error);
    } else {
      userName = data?.name || "Unknown Employee"; // Assign user name
    }
  }

  function setPeriodStart() {
    if (!clientPeriodStart) return;
    const base = new Date(clientPeriodStart);
    currentPeriodStart = new Date(base);
    currentPeriodStart.setDate(base.getDate() + (periodOffset * 14));

  }

  async function fetchPunches() {
    timecardReady = false;
    const { data, error } = await supabase
      .from('punches')
      .select('date, time, user_id')
      .eq('user_id', userId)
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    allPunches = data || [];

 

    await updateCurrentPeriod();
    await new Promise(resolve => setTimeout(resolve, 500));
    timecardReady = true;
  }

  async function shiftPeriod(direction: number) {
    periodOffset += direction;
    setPeriodStart();
    selectedDay = null;
    hasMissingPunch = false;
    await updateCurrentPeriod();


    if (currentPeriodStart) {
      dispatch('periodChange', { newPeriodStart: currentPeriodStart.toISOString().split('T')[0] });
    }
  }

  async function updateCurrentPeriod() {
    if (!currentPeriodStart) {
        return;
    }


    const start = new Date(currentPeriodStart);
    const end = new Date(start);
    end.setDate(start.getDate() + 13);

    // Normalize both start and end to midnight to avoid time-related issues
    const normalizedStart = new Date(start.setHours(0, 0, 0, 0)); 
    const normalizedEnd = new Date(end.setHours(23, 59, 59, 999));

    // Log the start and end dates for verification


    // Log allPunches to see the raw data
   

    // Filter the punches by comparing only the date part
    currentPeriodPunches = allPunches.filter(p => {
    const punchDate = new Date(p.date);
    
    // Decrement the punch date by one day
    punchDate.setDate(punchDate.getDate() + 1); 
    
    // Normalize the punch date to midnight (time set to 00:00:00)
    const normalizedPunchDate = new Date(punchDate.setHours(0, 0, 0, 0));

    // Log the comparison
 
    
    // Check if the punch date is within the range (start to end)
    const isInRange = normalizedPunchDate >= normalizedStart && normalizedPunchDate <= normalizedEnd;
   
    
    return isInRange;
});

    // Log the filtered punches


    await tick();
    buildDayBlocks();
    await checkIfAlreadySigned();
}




  async function checkIfAlreadySigned() {
    const periodEnd = new Date(currentPeriodStart);
    periodEnd.setDate(periodEnd.getDate() + 13);
    const periodEndDate = periodEnd.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('signed_timecards')
      .select('id')
      .eq('user_id', userId)
      .eq('period_end_date', periodEndDate)
      .maybeSingle();

    alreadySigned = !!data;
  }

  function getDayBlocks(date) {
  // Decrement the date by 1 day for the first iteration
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() - 1);  // Decrement by 1 day

  // Format date to ISO without the time portion
  const iso = newDate.toISOString().split('T')[0];  


  // Get punches for the adjusted date
  const dayPunches = currentPeriodPunches
    .filter(p => p.date === iso)  // Ensure the comparison is correct
    .map(p => timeToMinutes(p.time))
    .sort((a, b) => a - b);

  const blocks = [];
  let i = 0;
  
  // Process punch data and create work/lunch/break blocks
  while (i + 1 < dayPunches.length) {
    const start = dayPunches[i];
    const end = dayPunches[i + 1];
    blocks.push({ type: 'work', start, end });
    i += 2;

    if (i < dayPunches.length) {
      const gap = dayPunches[i] - end;
      if (gap <= 25) {
        blocks.push({ type: 'break', start: end, end: dayPunches[i] });
      } else if (gap <= 60) {
        blocks.push({ type: 'lunch', start: end, end: dayPunches[i] });
      } else {
        blocks.push({ type: 'split', start: end, end: dayPunches[i] });
      }
    }
  }

  // If there is an unpaired punch, mark it as missing
  if (dayPunches.length % 2 !== 0) {
    blocks.push({ type: 'missing', start: dayPunches[dayPunches.length - 1], end: 1440 });
  }


  return blocks;
}

  function buildDayBlocks() {
  dayBlocks = getPeriodDays().map(day=> {

    const formattedDate = formatDateLocal(day).split('T')[0]; // Format day for comparison

    const todayPunches = currentPeriodPunches
      .filter(p => {
        return p.date === formattedDate;  // Ensure the comparison is correct
      })
      .map(p => timeToMinutes(p.time))
      .sort((a, b) => a - b);


    const blocks = [];
    let i = 0;

    while (i+1 < todayPunches.length) {
      const start = todayPunches[i];
      const end = todayPunches[i + 1];
      blocks.push({ type: 'work', start, end });
      i += 2;

      if (i < todayPunches.length) {
        const gap = todayPunches[i] - end;
        if (gap <= 25) {
          blocks.push({ type: 'break', start: end, end: todayPunches[i] });
        } else if (gap <= 60) {
          blocks.push({ type: 'lunch', start: end, end: todayPunches[i] });
        } else {
          blocks.push({ type: 'split', start: end, end: todayPunches[i] });
        }
      }
      
    }

    // Add missing punch if necessary
    if (todayPunches.length % 2 !== 0) {
      blocks.push({ type: 'missing', start: todayPunches[todayPunches.length - 1], end: 1440 });
      hasMissingPunch = true;
    }
    // Log to check first day blocks


    return { date: formattedDate, blocks };  // Return blocks for each day
  });


  calculateSummaries();
}






function calculateSummaries() {
  summaries = [];
  for (let weekStart of [0, 7]) {
    let weeklyRegularMins = 0;
    let workedDays = [];
    let splitShiftCounts = [];

    for (let i = 0; i < 7; i++) {
      const dayIndex = weekStart + i;
      const day = new Date(currentPeriodStart);
      day.setDate(day.getDate() + dayIndex);
      const dateStr = formatDateLocal(day);

      const blocks = dayBlocks.find(d => d.date === dateStr)?.blocks || [];
      const workBlocks = blocks.filter(b => b.type === 'work');
      let totalWorked = workBlocks.reduce((sum, b) => sum + (b.end - b.start), 0);

      workedDays.push(totalWorked > 0);
      splitShiftCounts.push(blocks.filter(b => b.type === 'split').length);  // Count split shifts
    }

    const fullWeekWorked = workedDays.every(w => w);

    for (let i = 0; i < 7; i++) {
      const dayIndex = weekStart + i;
      const day = new Date(currentPeriodStart);
      day.setDate(day.getDate() + dayIndex);
      const dateStr = formatDateLocal(day);

      const blocks = dayBlocks.find(d => d.date === dateStr)?.blocks || [];
      const workBlocks = blocks.filter(b => b.type === 'work');
      let totalWorked = workBlocks.reduce((sum, b) => sum + (b.end - b.start), 0);

      const summary = {
        date: dateStr,
        regular: 0,
        overtime: 0,
        doubletime: 0,
        missingLunch: false,
        splitShift: splitShiftCounts[i] > 0, // Set split shift status based on the count
        total: totalWorked,
        splitShiftCount: splitShiftCounts[i], // Track the number of split shifts
      };

      const breaks = [];
      for (let j = 1; j < workBlocks.length; j++) {
        const prev = workBlocks[j - 1].end;
        const curr = workBlocks[j].start;
        breaks.push(curr - prev);
      }

      const lunch1 = breaks.some(b => b >= 30 && b <= 60);
      const lunch2 = breaks.filter(b => b >= 30).length >= 2;

      if (totalWorked > 300 && !lunch1) summary.missingLunch = true;
      if (totalWorked > 600 && !lunch2) summary.missingLunch = true;

      let dailyRegular = 0, dailyOvertime = 0, dailyDoubletime = 0;
      if (totalWorked > 720) {
        dailyDoubletime = totalWorked - 720;
        dailyOvertime = 240;
        dailyRegular = 480;
      } else if (totalWorked > 480) {
        dailyOvertime = totalWorked - 480;
        dailyRegular = 480;
      } else {
        dailyRegular = totalWorked;
      }

      if (i === 6 && fullWeekWorked) {
        dailyOvertime += dailyRegular;
        dailyRegular = 0;
      }

      if (weeklyRegularMins + dailyRegular > 2400) {
        const overflow = (weeklyRegularMins + dailyRegular) - 2400;
        dailyRegular -= overflow;
        dailyOvertime += overflow;
      }

      weeklyRegularMins += dailyRegular;

      summary.regular = dailyRegular;
      summary.overtime = dailyOvertime;
      summary.doubletime = dailyDoubletime;

      summaries.push(summary);
    }
  }
}


  function getPeriodDays() {
    if (!currentPeriodStart) return [];
    const days = [];
    const start = new Date(currentPeriodStart);
    for (let i = 0; i < 14; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  }

  function formatDateLocal(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function formatShortDate(date: Date) {
    return date.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' });
  }

  function formatHours(minutes: number) {
    return minutes > 0 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : '—';
  }

  function timeToMinutes(str: string) {
    const [h, m] = str.split(':').map(Number);
    return h * 60 + m;
  }

  function awardSplitShift(date: string, value: boolean) {
    splitShiftAwards.update(current => ({ ...current, [date]: value }));
  }

  async function saveSignature(signatureDataUrl: string) {
    const periodEnd = new Date(currentPeriodStart);
    periodEnd.setDate(periodEnd.getDate() + 13);
    const periodEndDate = periodEnd.toISOString().split('T')[0];

    const { error } = await supabase.from('signed_timecards').insert([
      { user_id: userId, signature_image: signatureDataUrl, period_end_date: periodEndDate }
    ]);

    if (!error) {
      await generateAndUploadPdf(signatureDataUrl, periodEndDate);
      await checkIfAlreadySigned();
    } else {
      console.error('Error saving signature:', error);
    }
  }

  function handleSignatureSave(event) {
    saveSignature(event.detail.signature);
    showSignModal = false;
  }

  function handleSignatureCancel() {
    showSignModal = false;
  }

  async function generateAndUploadPdf(signatureDataUrl: string, periodEndDate: string) {const doc = new jsPDF();

// Title
doc.setFontSize(18);
doc.text('Time Card Report', 20, 20);

// Company Name
doc.setFontSize(12);
doc.text(`Company: ${companyName}`, 20, 30);

// Period and Employee Info
doc.setFontSize(10);
doc.text(`Period: ${formatDateLocal(currentPeriodStart)} to ${periodEndDate}`, 20, 40);
doc.text(`Employee: ${userName}`, 20, 50);

// Add a line separator
doc.setLineWidth(0.5);
doc.line(20, 55, 190, 55);

// Prepare table data (inline punches per row)
const tableBody = dayBlocks.map(day => {
  const punchesText = day.blocks.map(block => {
    const startHour = Math.floor(block.start / 60);
    const startMin = String(block.start % 60).padStart(2, '0');
    const endHour = Math.floor(block.end / 60);
    const endMin = String(block.end % 60).padStart(2, '0');
    return `${block.type}: ${startHour}:${startMin} to ${endHour}:${endMin}`;
  }).join(', '); // 👉 inline with commas

  return [day.date, punchesText];
});



// Insert the table
doc.autoTable({
  startY: 60,
  head: [['Date', 'Worked Hours']],
  body: tableBody,
  theme: 'grid',
  headStyles: {
    fillColor: [30, 64, 175],
    textColor: 255,
    fontSize: 10,
    halign: 'center'
  },
  bodyStyles: {
    fontSize: 8,
    valign: 'top'
  },
  styles: {
    cellPadding: 3,
    overflow: 'linebreak'
  },
  columnStyles: {
    0: { cellWidth: 40 }, // Date column
    1: { cellWidth: 120 } // Worked Hours column
  }
});

// Certification Text
let finalY = doc.lastAutoTable.finalY + 10;

doc.setFontSize(10);
doc.text('Certification:', 20, finalY);
finalY += 6;
doc.setFontSize(8);
doc.text(
  'I certify that the hours recorded in this timecard represent an accurate record of my hours worked and that I took the required meal periods as provided by law or have otherwise reported any missed, late, or interrupted meal periods.',
  20, finalY,
  { maxWidth: 170 }
);

// Signature Image
finalY += 30;
doc.addImage(signatureDataUrl, 'PNG', 20, finalY, 60, 20); // Adjust as needed

// Signed At
const signDate = new Date();
const signTime = `Signed at: ${signDate.toLocaleString()}`;

finalY += 25;
doc.setFontSize(8);
doc.text(signTime, 20, finalY + 10);

// Generate PDF Blob and Upload
const pdfBlob = doc.output('blob');
const storagePath = `${userId}/${periodEndDate}.pdf`;

const { error: storageError } = await supabase.storage.from('timecards-pdf').upload(
  storagePath,
  pdfBlob,
  { contentType: 'application/pdf', upsert: true }
);

if (storageError) {
  console.error('Failed to upload PDF', storageError);
  return;
}
  }






  async function downloadSignedPdf() {
    const periodEnd = new Date(currentPeriodStart);
    periodEnd.setDate(periodEnd.getDate() + 13);
    const periodEndDate = periodEnd.toISOString().split('T')[0];
    const filePath = `${userId}/${periodEndDate}.pdf`;

    const { data, error } = await supabase.storage.from('timecards-pdf').download(filePath);

    if (error) {
      console.error('Failed to download PDF', error);
      alert('Could not download the signed timecard.');
      return;
    }

    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Timecard_${periodEndDate}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
</script>


  
  


<!-- Sign Timecard Button -->
{#if viewAsEmployee && !alreadySigned}
  {#if hasMissingPunch}  <!-- Check if there's a missing punch -->
    <div class="text-red-600 text-center mb-4">
      ❗ You cannot sign the timecard because there is a missing punch.
    </div>
  {/if}
  <div class="flex justify-center mb-4">
    <button
    class="w-2/3 md:w-1/2 p-4 rounded-md 
      {hasMissingPunch ? 'button-disabled' : 'button-enabled'}"
    on:click={() => showSignModal = true}
    disabled={hasMissingPunch}
  >
    ✍️ Sign Timecard
  </button>
  </div>
{:else if viewAsEmployee && alreadySigned}
  <div class="flex flex-col items-center mb-4 space-y-3">
    <span class="text-green-600 font-semibold">✅ Timecard Signed</span>

    <button
      class="w-2/3 md:w-1/2 p-4 rounded-md bg-green-600 hover:bg-green-700 text-white font-semibold"
      on:click={downloadSignedPdf}
    >
      📄 Download Signed Timecard
    </button>
  </div>
{/if}



<!-- Navigation Buttons -->
<div class="text-center mb-4 flex justify-center items-center gap-2 flex-wrap">
  {#if currentPeriodStart}
    <button on:click={() => shiftPeriod(-1)} class="bg-blue-600 text-white px-3 py-1 rounded">⬅</button>
    <button on:click={() => shiftPeriod(1)} class="bg-blue-600 text-white px-3 py-1 rounded">➡</button>
    <strong class="text-lg">Period starting: {currentPeriodStart.toLocaleDateString()}</strong>
  {/if}
</div>


<!-- Timecard Table -->
{#if timecardReady && currentPeriodStart}
  <div in:fade={{ duration: 300 }}>
    <!-- Desktop Timecard Grid -->
    <div class="desktop-timecard timecard-scroll mt-6">
      <div class="timecard-grid border border-gray-300 rounded-md overflow-hidden">
        <div class="hour-col">
          <div class="blank"></div>
          <div class="blank"></div>
          {#each hourLabels as hour}
            <div class="hour-label">
              {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
            </div>
          {/each}
        </div>

        {#each getPeriodDays() as day}
          {@const blockForDay = dayBlocks.find(d => d.date === formatDateLocal(day))}
          <div class="day-col">
            <div class="date-header">{formatShortDate(day)}</div>
            <div class="totals-row">
              {#if blockForDay && blockForDay.blocks.some(b => b.type === 'missing')}
                <span class="text-red-600 font-bold">Missing</span>
              {:else if blockForDay}
                {formatHours(blockForDay.blocks.filter(b => b.type === 'work').reduce((s, b) => s + (b.end - b.start), 0))}
              {:else}
                0h 0m
              {/if}
            </div>
            <div class="bar-area">
              {#if blockForDay}
                {#each blockForDay.blocks as block}
                  <div
                    class={`bar-segment ${block.type}`}
                    style="top: {(block.start / 1440) * 100}%; height: {((block.end - block.start) / 1440) * 100}%"
                    title={block.type === 'lunch' ? '🍴 Lunch' : block.type}
                  ></div>
                {/each}
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Mobile View -->
    <div class="mobile-list">
      {#each getPeriodDays() as day}
        <div class="day-row">
          <div class="w-16 text-sm font-medium">{formatShortDate(day)}</div>
          <div class="day-bar">
            {#if getDayBlocks(day).some(b => b.type === 'missing')}
              <div class="bar-fill missing" style="width: 100%"></div>
            {:else}
              <div
                class="bar-fill"
                style="width: {(getDayBlocks(day)
                  .filter(b => b.type === 'work')
                  .reduce((sum, b) => sum + (b.end - b.start), 0) / 720) * 100}%"
              ></div>
            {/if}
          </div>
          <div class="w-20 text-sm text-right">
            {#if getDayBlocks(day).some(b => b.type === 'missing')}
              <span class="text-red-600">🔴</span>
            {:else}
              {formatHours(getDayBlocks(day).filter(b => b.type === 'work').reduce((s, b) => s + (b.end - b.start), 0))}
            {/if}
          </div>
        </div>
      {/each}
    </div>

     <!-- Summary Grid -->
{#if summaries.length > 0}
<div class="desktop-timecard timecard-scroll mt-6">
  <div class="summary-grid">
    <div class="label-cell font-semibold text-blue-800">Total</div>
    {#each summaries as s}
      <div class="value-cell font-semibold">{formatHours(s.total)}</div>
    {/each}

    <div class="label-cell">Regular</div>
    {#each summaries as s}
      <div class="value-cell">{formatHours(s.regular)}</div>
    {/each}

    <div class="label-cell">Overtime</div>
    {#each summaries as s}
      <div class="value-cell text-yellow-600">{formatHours(s.overtime)}</div>
    {/each}

    <div class="label-cell">Double Time</div>
    {#each summaries as s}
      <div class="value-cell text-red-600">{formatHours(s.doubletime)}</div>
    {/each}

    <div class="label-cell">Missing Lunch</div>
    {#each summaries as s}
      <div class="value-cell">{s.missingLunch ? '❌' : '—'}</div>
    {/each}

    <div class="label-cell">Split Shift</div>
    {#each summaries as s}
      <div class="value-cell">{s.splitShiftCount > 0 ? s.splitShiftCount : '—'}</div> <!-- Show split shift count -->
    {/each}
  </div>
</div>
{/if}

 </div>
{/if}
<!-- Sign Modal -->
{#if showSignModal}
  <SignTimecardModal
    employeeName={userName}
    periodEndDate={(new Date(currentPeriodStart.getTime() + 13 * 86400000)).toLocaleDateString()}
    on:save={handleSignatureSave}
    on:cancel={handleSignatureCancel}
  />
{/if}

<style>
/* Desktop Timecard Layout */
.timecard-scroll {
  overflow-x: auto;
}

.timecard-grid {
  display: grid;
  grid-template-columns: 60px repeat(14, minmax(60px, 1fr));
  grid-template-rows: auto auto 1fr;
  height: 645px;
  min-width: 1000px;
}

.hour-col {
  display: flex;
  flex-direction: column;
}

.hour-label {
  font-size: 0.65rem;
  text-align: right;
  padding: 0.25rem 4px;
  color: #666;
  background: #f9fafb;
  border-bottom: 1px solid #eee;
}

  /* Summary Table Layout */
  .summary-grid {
    display: grid;
    grid-template-columns: 60px repeat(14, minmax(60px, 1fr));
    font-size: 0.75rem;
    border-top: 1px solid #e5e7eb;
    margin-top: 0.5rem;
  }

  .label-cell {
    font-weight: bold;
    background: #f3f4f6;
    padding: 0.4rem;
    text-align: right;
    border-bottom: 1px solid #e5e7eb;
  }

  .value-cell {
    padding: 0.4rem;
    text-align: center;
    background: #fff;
    border-left: 1px solid #eee;
    border-bottom: 1px solid #e5e7eb;
    overflow: hidden;
    white-space: nowrap;
    font-size: 0.7rem;
  }
  

.day-col {
  display: flex;
  flex-direction: column;
  border-left: 1px solid #ddd;
  position: relative;
}

.date-header {
  text-align: center;
  font-size: 0.75rem;
  font-weight: bold;
  background: #e0f2ff;
  padding: 0.4rem;
  border-bottom: 1px solid #ccc;
}

.totals-row {
  height: 1.6rem;
  line-height: 1.6rem;
  padding: 0;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 0.7rem;
  overflow: hidden;
  white-space: nowrap;
  background: #f8fafc;
  border-bottom: 1px solid #ddd;
}

.bar-area {
  position: relative;
  flex: 1;
  background: #f9fafb;
}

.bar-segment {
  position: absolute;
  left: 15%;
  width: 70%;
  border-radius: 4px;
}

.bar-segment.work { background-color: #0077cc; }
.bar-segment.break { background-color: #00aa00; }
.bar-segment.lunch { background-color: #222; }
.bar-segment.split { background-color: #999; }
.bar-segment.missing { background-color: #cc0000; }

.blank {
  height: 1.6rem;
}

/* Mobile Timecard Layout */
.mobile-list {
  display: none;
}

/* Mobile Timecard Layout */
.mobile-list {
  display: none;
}

@media (max-width: 1024px) {
  .desktop-timecard {
    display: none; /* Hide desktop timecard on mobile */
  }

  .mobile-list {
    display: block;
    padding: 1rem;
  }

  .day-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.75rem;
    border-bottom: 1px solid #e5e7eb;
    cursor: pointer;
  }

  .day-bar {
    flex: 1;
    height: 12px;
    background-color: #e5e7eb;
    border-radius: 6px;
    position: relative;
    width: 100%; /* Ensure it takes the full available width */
  }

  .bar-fill {
    height: 100%;
    background-color: #0077cc;
    border-radius: 6px;
    transition: width 0.3s ease; /* Add smooth transition */
  }

  .bar-fill.missing {
    background-color: #cc0000;
  }

  /* Ensure the filling doesn’t overflow over the day bar */
  .bar-fill {
    max-width: 100%; /* Prevent it from overflowing */
  }

  .inline-detail-box {
    background: #f9f9f9;
    margin: 0 1rem 1rem;
    padding: 0.75rem;
    border: 1px solid #ccc;
    border-radius: 6px;
    font-size: 0.875rem;
    position: relative;
  }

  .alert-text {
    color: #cc0000;
    font-weight: bold;
  }

  .total-summary {
    font-size: 0.75rem;
    text-align: center;
    margin-top: 1rem;
  }

  .w-16 {
    width: 4rem;
  }

  .w-20 {
    width: 5rem;
  }

  .inline-detail-box button {
    background: transparent;
    border: none;
    font-size: 1rem;
    color: #0077cc;
    cursor: pointer;
  }

  .summary-item {
    padding: 0.75rem;
    background-color: #f3f4f6;
    border-radius: 6px;
    margin-bottom: 1rem;
    display: flex;
    justify-content: space-between;
  }

  .summary-item .label {
    font-weight: bold;
  }

  .summary-item .value {
    font-size: 0.85rem;
  }

  /* Hide the desktop summary on mobile */
  .desktop-summary {
    display: none;
  }

  /* Show mobile summary */
  .mobile-summary {
    display: block;
  }

  /* Radio button scaling for mobile */
  input[type="radio"] {
    transform: scale(0.8);
  }
}

/* Desktop Summary Layout (default) */
.desktop-summary {
  display: block;
}
/* CSS for the disabled (gray) button appearance */
.button-disabled {
  background-color: #e0e0e0;  /* Light gray background */
  cursor: not-allowed;        /* Change the cursor to indicate it's disabled */
  color: #a0a0a0;             /* Gray text */
}

/* Standard button (when enabled) */
.button-enabled {
  background-color: #6b46c1;  /* Purple background when enabled */
  color: white;
}

.button-enabled:hover {
  background-color: #553c9a;  /* Darker purple on hover */
}


</style>

