<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import ExportHoursModal from '$lib/components/ExportHoursModal.svelte';
  
	let clientId = '';
	let payPeriodStart = '';
	let availablePeriods = [];
	let showExportModal = false;
	let clientLoading = true;
  
	onMount(async () => {
	  const { data: sessionData } = await supabase.auth.getSession();
	  const user = sessionData?.session?.user;
  
	  if (!user) {
		alert('Not logged in.');
		clientLoading = false;
		return;
	  }
  
	  const { data: userData } = await supabase
		.from('users')
		.select('client_id')
		.eq('auth_user_id', user.id)
		.single();
  
	  if (!userData) {
		alert('Failed to fetch user info.');
		clientLoading = false;
		return;
	  }
  
	  clientId = userData.client_id;
  
	  const { data: clientData } = await supabase
		.from('clients')
		.select('pay_period_start')
		.eq('id', clientId)
		.single();
  
	  if (!clientData?.pay_period_start) {
		alert('Failed to fetch client pay period start.');
		clientLoading = false;
		return;
	  }
  
	  payPeriodStart = clientData.pay_period_start;
  
	  generateAvailablePeriods();
	  clientLoading = false;
	});
  
	function generateAvailablePeriods() {
	  const startDate = new Date(payPeriodStart);
	  const today = new Date();
	  const periods = [];
  
	  let currentStart = new Date(startDate);
  
	  while (currentStart <= today) {
		const currentEnd = new Date(currentStart);
		currentEnd.setDate(currentEnd.getDate() + 13);
		periods.push({
		  start: currentStart.toISOString().split('T')[0],
		  end: currentEnd.toISOString().split('T')[0]
		});
  
		currentStart.setDate(currentStart.getDate() + 14);
	  }
  
	  availablePeriods = periods.reverse(); // Show most recent first
	}
  </script>
  
  <div class="flex flex-col gap-4 items-center">
	{#if clientLoading}
	  <p>Loading client info...</p>
	{:else}
	  <button
		class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg"
		on:click={() => showExportModal = true}
	  >
		📤 Export Hours
	  </button>
	{/if}
  </div>
  
  <ExportHoursModal
	open={showExportModal}
	clientId={clientId}
	availablePeriods={availablePeriods}
	on:close={() => showExportModal = false}
  />
  