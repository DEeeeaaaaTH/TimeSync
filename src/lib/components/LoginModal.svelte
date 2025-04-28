<script>
  import { supabase } from '$lib/supabaseClient';
  import { goto } from '$app/navigation';
  import { createEventDispatcher } from 'svelte';
  import { fade } from 'svelte/transition';

  const dispatch = createEventDispatcher();

  let email = '';
  let password = '';
  let errorMsg = '';
  let isLoading = false;

  async function login(event) {
    event.preventDefault(); // ✅ Prevent page reload on form submit
    isLoading = true;
    errorMsg = '';

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      errorMsg = error.message;
      isLoading = false;
      return;
    }

    const user = authData.user;

    if (!user) {
      errorMsg = 'Login failed. No user returned.';
      isLoading = false;
      return;
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('auth_user_id', user.id)
      .single();

    if (userError) {
      errorMsg = 'Login succeeded but error fetching role: ' + userError.message;
      isLoading = false;
      return;
    }

    const role = userData.role;
    localStorage.setItem('loggedInUser', role);

    dispatch('close');
    goto('/dashboard');
  }

  function cancel() {
    dispatch('close');
  }
</script>

<!-- Blur background with FADE -->
<div class="fixed inset-0 backdrop-blur-sm bg-black/10 flex items-center justify-center z-50" transition:fade>
  <div class="bg-white p-8 rounded-xl shadow-xl w-full max-w-md space-y-4" transition:fade>
    <h2 class="text-2xl font-bold text-center">Login</h2>

    {#if errorMsg}
      <div class="bg-red-100 text-red-700 p-2 rounded text-sm">{errorMsg}</div>
    {/if}

    <!-- ✅ Wrap inputs and buttons inside a <form> -->
    <form on:submit={login} class="space-y-4">
      <input
        type="email"
        bind:value={email}
        placeholder="Email"
        class="w-full border border-gray-300 rounded px-3 py-2"
        required
      />
      <input
        type="password"
        bind:value={password}
        placeholder="Password"
        class="w-full border border-gray-300 rounded px-3 py-2"
        required
      />

      <div class="flex justify-between items-center space-x-2">
        <button
          type="submit"
          class="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
          disabled={isLoading}
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>

        <button
          type="button"
          class="flex-1 border border-gray-400 hover:bg-gray-100 text-gray-700 py-2 rounded"
          on:click={cancel}
        >
          Cancel
        </button>
      </div>
    </form>
  </div>
</div>
