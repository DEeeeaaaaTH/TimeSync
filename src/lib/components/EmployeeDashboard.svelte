<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import MissingPunchModal from '$lib/components/MissingPunchModal.svelte'; // Modal component for missing punches
  
	export let dayBlocks = [];
	export let summaries = [];
	export let currentCalculatedPeriodStart: Date; // Dynamic period start date from dashboard
  
	let userId = '';
	let employeeName = '';
	let buttonText = 'Punch Now';
	let successMessage = '';
	let errorMessage = '';
	let punchSubmitted = false;
	let periodEndDate = '';
  
	// Modal handling
	let showMissingPunchModal = false;
	let reason = ''; // Reason for missing punch
	let lastPunchTime = ''; // Last punch time
	let missingPunchDate = ''; // Missing punch date
	let missingPunchTime = ''; // Missing punch time
  
	// Dynamically react when currentCalculatedPeriodStart changes
	$: if (currentCalculatedPeriodStart) {
	  const periodStart = new Date(currentCalculatedPeriodStart);
	  const periodEnd = new Date(periodStart);
	  periodEnd.setDate(periodStart.getDate() + 13); // 14-day period
	  periodEndDate = periodEnd.toISOString().split('T')[0];
	}
  
	onMount(async () => {
	  const { data: sessionData } = await supabase.auth.getSession();
	  const user = sessionData?.session?.user;
  
	  if (user) {
		const { data: userData, error } = await supabase
		  .from('users')
		  .select('id, name')
		  .eq('auth_user_id', user.id)
		  .single();
  
		if (userData && !error) {
		  userId = userData.id;
		  employeeName = userData.name || 'Employee';
		} else {
		  console.error('Failed to fetch user ID and name:', error);
		}
	  } else {
		console.error('User is not authenticated');
	  }
	});
  
	// Function to handle Punch Now
	async function handlePunch() {
	  try {
		if (!userId) {
		  errorMessage = 'User ID is not available.';
		  return;
		}
  
		const currentTime = new Date();
		const currentDate = currentTime.toISOString().split('T')[0];
		const time = currentTime.toLocaleTimeString('en-US', { hour12: false });
  
		const punchData = {
		  user_id: userId,
		  date: currentDate,
		  time: time
		};
  
		const { error } = await supabase.from('punches').insert([punchData]);
  
		if (error) {
		  errorMessage = 'Error recording punch. Please try again.';
		  return;
		}
  
		successMessage = 'Punch recorded successfully.';
		buttonText = '✅ Punch Submitted';
		punchSubmitted = true;
		setTimeout(() => {
		  buttonText = '🕒 Punch Now';
		  punchSubmitted = false;
		}, 3000);
	  } catch (error) {
		errorMessage = 'Unexpected error occurred. Please try again.';
	  }
	}
  
	// Function to open the missing punch modal
	function openMissingPunchModal() {
	  showMissingPunchModal = true;
	}
  
	// Function to submit the missing punch request
	async function submitMissingPunchRequest() {
	  const { error } = await supabase.from('missing_punches').insert([
		{
		  user_id: userId,
		  date: missingPunchDate, // Use the selected date
		  time: missingPunchTime, // Use the selected time
		  reason: reason, // Reason provided in the modal
		}
	  ]);
  
	  if (error) {
		errorMessage = 'Error submitting missing punch request. Please try again.';
	  } else {
		successMessage = 'Missing punch request submitted successfully.';
		reason = ''; // Reset reason after submission
		missingPunchDate = ''; // Clear missing punch date
		missingPunchTime = ''; // Clear missing punch time
		closeModal();
	  }
	}
  
	// Function to close the modal without submitting
	function closeModal() {
	  showMissingPunchModal = false;
	  reason = ''; // Reset reason
	  missingPunchDate = ''; // Clear date
	  missingPunchTime = ''; // Clear time
	}
  </script>
  
  <div class="p-4 text-center">
	<!-- Punch Button -->
	<button
	  on:click={handlePunch}
	  class={`w-2/3 md:w-1/2 p-4 rounded-md text-lg font-semibold border-2 transition-all duration-300
		${punchSubmitted ? 'bg-green-600' : 'bg-blue-600'} text-white`}
	>
	  {buttonText}
	</button>
  
	<!-- Success/Error Message -->
	{#if successMessage}
	  <div class="text-green-600 mt-4">{successMessage}</div>
	{/if}
	{#if errorMessage}
	  <div class="text-red-600 mt-4">{errorMessage}</div>
	{/if}
  
	<!-- Submit Missing Punch Request Button -->
	<div class="flex justify-center mb-4">
	  <button
		class="w-2/3 md:w-1/2 p-4 rounded-md bg-yellow-500 text-white font-semibold"
		on:click={openMissingPunchModal}
	  >
		Submit Missing Punch Request
	  </button>
	</div>
  
	<!-- Missing Punch Modal -->
	{#if showMissingPunchModal}
	  <MissingPunchModal
		on:submit={submitMissingPunchRequest}
		on:cancel={closeModal}
		bind:punchDate={missingPunchDate}
		bind:punchTime={missingPunchTime}
		bind:reason={reason}
	  />
	{/if}
  </div>
  