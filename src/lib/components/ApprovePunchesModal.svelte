<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { supabase } from '$lib/supabaseClient';
  
    export let open = false;
  
    const dispatch = createEventDispatcher();
  
    let missingPunches = [];
    let loading = false;
    let error = '';
    let hasLoaded = false;
  
    $: if (open && !hasLoaded) {
      loadMissingPunches();
      hasLoaded = true;
    }
  
    async function loadMissingPunches() {
      loading = true;
      error = '';
  
      const { data, error: fetchError } = await supabase
        .from('missing_punches')
        .select(`
          id,
          date,
          time,
          reason,
          submitted_at,
          user:user_id (
            id,
            name
          )
        `);
  
      if (fetchError) {
        error = 'Failed to load missing punches.';
      } else {
        missingPunches = data || [];
        console.log('Fetched missing punches:', missingPunches); // 👈 DEBUG
      }
  
      loading = false;
    }
  
    async function approvePunch(punch) {
      // First insert into punches table
      const { error: insertError } = await supabase
        .from('punches')
        .insert([
          {
            user_id: punch.user.id,
            date: punch.date,
            time: punch.time,
          }
        ]);
  
      if (insertError) {
        alert('Failed to approve punch.');
        return;
      }
  
      // After inserting, delete from missing_punches
      const { error: deleteError } = await supabase
        .from('missing_punches')
        .delete()
        .eq('id', punch.id);
  
      if (!deleteError) {
        missingPunches = missingPunches.filter(p => p.id !== punch.id);
      } else {
        alert('Failed to remove from missing punches after approval.');
      }
    }
  
    async function rejectPunch(punchId) {
      const { error: deleteError } = await supabase
        .from('missing_punches')
        .delete()
        .eq('id', punchId);
  
      if (!deleteError) {
        missingPunches = missingPunches.filter(p => p.id !== punchId);
      } else {
        alert('Failed to reject punch.');
      }
    }
  
    async function approveAllPunches() {
      for (const punch of missingPunches) {
        await approvePunch(punch);
      }
    }
  
    function cancel() {
      hasLoaded = false;
      dispatch('cancel');
    }
  </script>
  
  {#if open}
    <div class="modal-backdrop" on:click={cancel}></div>
    <div class="modal">
      <h2 class="text-lg font-bold mb-4">Approve Missing Punches</h2>
  
      {#if loading}
        <p>Loading...</p>
      {:else if error}
        <p class="text-red-600">{error}</p>
      {:else if missingPunches.length === 0}
        <p>No missing punches found.</p>
      {:else}
        <div class="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
          {#each missingPunches as punch}
            <div class="flex justify-between items-center bg-gray-100 p-2 rounded">
              <div class="text-left">
                <p><strong>Employee:</strong> {punch.user.name}</p>
                <p><strong>Date:</strong> {punch.date}</p>
                <p><strong>Time:</strong> {punch.time}</p>
                {#if punch.reason}
                  <p><strong>Reason:</strong> {punch.reason}</p>
                {/if}
              </div>
              <div class="flex flex-col gap-1">
                <button class="approve-button" on:click={() => approvePunch(punch)}>Approve</button>
                <button class="reject-button" on:click={() => rejectPunch(punch.id)}>Reject</button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
  
      <div class="buttons mt-4">
        <button on:click={approveAllPunches}>Approve All</button>
        <button on:click={cancel}>Cancel</button>
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
  
    .buttons {
      display: flex;
      justify-content: space-between;
      margin-top: 1rem;
    }
  
    button {
      padding: 0.5rem 1rem;
      font-weight: bold;
      cursor: pointer;
    }
  
    .approve-button {
      background-color: #4CAF50;
      color: white;
      padding: 0.3rem 0.6rem;
      border: none;
      border-radius: 4px;
    }
  
    .approve-button:hover {
      background-color: #45a049;
    }
  
    .reject-button {
      background-color: #f44336;
      color: white;
      padding: 0.3rem 0.6rem;
      border: none;
      border-radius: 4px;
    }
  
    .reject-button:hover {
      background-color: #da190b;
    }
  </style>
  