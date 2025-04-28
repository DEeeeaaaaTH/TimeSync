<script lang="ts">
  import { supabase } from '$lib/supabaseClient';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  let email = '';
  let role = 'Employee';
  let submitting = false;
  let error = '';
  let inviteLink = '';

  // Assume we have a user role passed from parent component
  export let userRole: 'Employee' | 'Manager' | 'Admin' = 'Employee';  // Added userRole prop
  
  function generateToken() {
    return crypto.randomUUID();
  }

  async function sendInvite() {
    submitting = true;
    error = '';
    inviteLink = '';

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;

    if (!user) {
      error = 'Not authenticated.';
      submitting = false;
      return;
    }

    const { data: currentUser, error: fetchError } = await supabase
      .from('users')
      .select('id, client_id')
      .eq('auth_user_id', user.id)
      .single();

    if (!currentUser || fetchError) {
      error = 'Failed to fetch user or client ID.';
      submitting = false;
      return;
    }

    const token = generateToken();

    const { error: insertError } = await supabase.from('pending_invites').insert({
      email,
      role,
      token,
      client_id: currentUser.client_id,
      invited_by: currentUser.id
    });

    if (insertError) {
      error = insertError.message;
      submitting = false;
      return;
    }

    inviteLink = `${window.location.origin}/accept-invite?token=${token}`;
    submitting = false;
  }

  function cancel() {
    dispatch('close');
  }

  function clickOutside(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      dispatch('close');
    }
  }
</script>

<div
  class="fixed inset-0 backdrop-blur-sm bg-white/20 flex items-center justify-center z-50"
  on:click={clickOutside}
>
  <div
    class="bg-white p-8 rounded-xl shadow-lg w-full max-w-md space-y-6"
    on:click|stopPropagation
  >
    <h2 class="text-2xl font-bold text-center">Invite User</h2>

    <div class="space-y-4">
      <input
        type="email"
        placeholder="User's Email"
        bind:value={email}
        class="w-full border border-gray-300 rounded px-4 py-2"
        required
      />

      {#if userRole === 'Admin'}
        <!-- Admin can select role from dropdown -->
        <select
          bind:value={role}
          class="w-full border border-gray-300 rounded px-4 py-2"
        >
          <option value="Employee">Employee</option>
          <option value="Manager">Manager</option>
          <option value="Admin">Admin</option>
        </select>
      {:else if userRole === 'Manager'}
        <!-- Manager can only invite Employee -->
        <div class="w-full border border-gray-300 rounded px-4 py-2 bg-gray-100 text-gray-400">Employee</div>
      {/if}

      {#if error}
        <div class="text-red-600 text-sm">{error}</div>
      {/if}

      {#if inviteLink}
        <div class="bg-green-100 text-green-700 p-3 rounded">
          ✅ Invite created!  
          <br />
          Share this link: 
          <br />
          <a href={inviteLink} target="_blank" class="text-blue-600 underline break-words">{inviteLink}</a>
        </div>
      {/if}

      <div class="flex justify-between items-center space-x-2 pt-2">
        <button
          type="button"
          class="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 rounded"
          on:click={cancel}
        >
          Cancel
        </button>

        {#if !inviteLink}
          <button
            type="button"
            class="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
            on:click={sendInvite}
            disabled={submitting}
          >
            {submitting ? 'Sending...' : 'Send Invite'}
          </button>
        {/if}
      </div>
    </div>
  </div>
</div>
