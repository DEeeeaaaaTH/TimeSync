<script lang="ts">
    import { supabase } from '$lib/supabaseClient';
    import { goto } from '$app/navigation';
  
    function calculatePeriodEndDate(startDate: string) {
  const start = new Date(startDate + 'T00:00:00'); // Force midnight
  const periodEnd = new Date(start);
  periodEnd.setUTCDate(periodEnd.getUTCDate() + 13); // 13 days = end of second Sunday
  return periodEnd.toISOString().split('T')[0];
}

function calculateNextPayDate(startDate: string, targetDay: string) {
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const periodEnd = new Date(calculatePeriodEndDate(startDate) + 'T00:00:00'); // Force UTC safe
  const endDay = periodEnd.getUTCDay(); // Must use UTC day
  const targetDayIndex = weekdays.indexOf(targetDay);

  let daysToAdd = (targetDayIndex - endDay + 7) % 7;
  if (daysToAdd === 0) {
    daysToAdd = 7;
  }

  const nextPay = new Date(periodEnd);
  nextPay.setUTCDate(periodEnd.getUTCDate() + daysToAdd);

  return nextPay.toISOString().split('T')[0];
}
  
    let legal_name = '';
    let dba = '';
    let street_address = '';
    let unit_number = '';
    let city = '';
    let state = '';
    let postal_code = '';
    let country = 'USA';
    let pay_period_start = '';
    let pay_day_weekday = 'Friday';
    let client_pin = '';
    let errorMsg = '';
  
    // ✅ New: Live preview variables
    let period_end_date_preview = '';
    let next_pay_date_preview = '';
  
    // ✅ Auto update previews
    $: if (pay_period_start) {
      period_end_date_preview = calculatePeriodEndDate(pay_period_start);
    }
  
    $: if (pay_period_start && pay_day_weekday) {
      next_pay_date_preview = calculateNextPayDate(pay_period_start, pay_day_weekday);
    }
  
    async function handleSubmit(event: Event) {
      event.preventDefault();
  
      errorMsg = '';
  
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
  
      if (!user) {
        errorMsg = 'User not authenticated.';
        return;
      }
  
      const { data: currentUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();
  
      if (!currentUser || userError) {
        errorMsg = 'Unable to fetch user record.';
        return;
      }
  
      const next_pay_date = calculateNextPayDate(pay_period_start, pay_day_weekday);
  
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .insert({
          legal_name,
          dba,
          street_address,
          unit_number,
          city,
          state,
          postal_code,
          country,
          pay_period_start,
          pay_day_weekday,
          next_pay_date,
          client_pin
        })
        .select()
        .single();
  
      if (clientError || !clientData) {
        errorMsg = clientError?.message ?? 'Failed to create client.';
        return;
      }
  
      const { error: updateError } = await supabase
        .from('users')
        .update({ client_id: clientData.id })
        .eq('id', currentUser.id);
  
      if (updateError) {
        errorMsg = 'Client created, but failed to update user.';
        return;
      }
  
      console.log('✅ Setup finished. Redirecting to dashboard...');
      await goto('/dashboard');
    }
  </script>
  
  <main class="p-8 max-w-lg mx-auto space-y-6">
    <h1 class="text-3xl font-bold text-center">Set Up Your Business</h1>
  
    <form class="space-y-4" on:submit={handleSubmit}>
      <input
        placeholder="Legal Name"
        bind:value={legal_name}
        class="w-full border border-gray-300 rounded px-3 py-2"
        required
      />
      <input
        placeholder="DBA (optional)"
        bind:value={dba}
        class="w-full border border-gray-300 rounded px-3 py-2"
      />
      <input
        placeholder="Street Address"
        bind:value={street_address}
        class="w-full border border-gray-300 rounded px-3 py-2"
        required
      />
      <input
        placeholder="Unit Number"
        bind:value={unit_number}
        class="w-full border border-gray-300 rounded px-3 py-2"
      />
      <input
        placeholder="City"
        bind:value={city}
        class="w-full border border-gray-300 rounded px-3 py-2"
        required
      />
      <input
        placeholder="State"
        bind:value={state}
        class="w-full border border-gray-300 rounded px-3 py-2"
        required
      />
      <input
        placeholder="ZIP/Postal Code"
        bind:value={postal_code}
        class="w-full border border-gray-300 rounded px-3 py-2"
        required
      />
      <input
        placeholder="Country"
        bind:value={country}
        class="w-full border border-gray-300 rounded px-3 py-2"
      />
  
      <label class="block font-semibold mt-4">Pay Period Start Date</label>
      <input
        type="date"
        bind:value={pay_period_start}
        class="w-full border border-gray-300 rounded px-3 py-2"
        required
      />
  
      <!-- ✅ NEW: Show Pay Period End Date -->
      <label class="block font-semibold mt-4">Pay Period End Date (Auto-Calculated)</label>
      <input
        type="text"
        value={period_end_date_preview}
        class="w-full border border-gray-300 rounded px-3 py-2 bg-gray-100"
        readonly
      />
  
      <label class="block font-semibold mt-4">Pay Day of the Week</label>
      <select
        bind:value={pay_day_weekday}
        class="w-full border border-gray-300 rounded px-3 py-2"
      >
        <option value="Monday">Monday</option>
        <option value="Tuesday">Tuesday</option>
        <option value="Wednesday">Wednesday</option>
        <option value="Thursday">Thursday</option>
        <option value="Friday">Friday</option>
        <option value="Saturday">Saturday</option>
        <option value="Sunday">Sunday</option>
      </select>
  
      <!-- ✅ Already existing: Show Next Pay Date -->
      <label class="block font-semibold mt-4">Next Pay Date (Auto-Calculated)</label>
      <input
        type="text"
        value={next_pay_date_preview}
        class="w-full border border-gray-300 rounded px-3 py-2 bg-gray-100"
        readonly
      />
  
      <input
        placeholder="Client PIN (optional)"
        bind:value={client_pin}
        class="w-full border border-gray-300 rounded px-3 py-2"
      />
  
      <button
        type="submit"
        class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded mt-6"
      >
        Save & Continue
      </button>
  
      {#if errorMsg}
        <div class="text-red-600 mt-2">{errorMsg}</div>
      {/if}
    </form>
  </main>
  