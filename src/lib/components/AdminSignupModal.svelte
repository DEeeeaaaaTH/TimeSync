<script>
  import { supabase } from '$lib/supabaseClient';
  import { createEventDispatcher } from 'svelte';
  import { fade } from 'svelte/transition';

  let email = '';
  let password = '';
  let confirmPassword = '';
  let name = '';
  let phone = '';
  let startingEmployeeId = '';

  const dispatch = createEventDispatcher();

  async function handleSignup() {
    if (!email || !password || !confirmPassword || !name || !phone || !startingEmployeeId) {
      alert('Please fill out all fields.');
      return;
    }

    if (password !== confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    // 1. Create Supabase Auth account
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      name: name,
      phone: phone
    }
  }
});


    if (signUpError) {
      alert('Auth error: ' + signUpError.message);
      return;
    }

    const auth_user_id = authData?.user?.id;

    if (!auth_user_id) {
      alert('Signup failed. No auth user ID returned.');
      return;
    }

    // 2. Insert immediately into your `users` table
    const { error: insertError } = await supabase.from('users').insert(
      {
        auth_user_id: auth_user_id,
        name: name,
        email: email,
        phone: phone,
        role: 'Admin', // ✅ HARDCODED lowercase 'admin'
        employee_id: startingEmployeeId,
        client_id: null
      },
      { returning: 'minimal' }
    );

    if (insertError) {
      alert('Database error: ' + insertError.message);
      return;
    }

    alert('Signup successful! Please check your email to confirm your account.');

    dispatch('close');
  }

  function cancel() {
    dispatch('close');
  }
</script>

<!-- Blurred Background + Modal with Fade -->
<div class="fixed inset-0 backdrop-blur-sm bg-black/10 flex items-center justify-center z-50" transition:fade>
  <div class="bg-white p-8 rounded-xl shadow-xl w-full max-w-md space-y-4" transition:fade>
    <h2 class="text-2xl font-bold text-center">Admin Sign-Up</h2>

    <input
      type="text"
      placeholder="Full Name"
      bind:value={name}
      class="w-full border border-gray-300 rounded px-3 py-2"
    />
    <input
      type="email"
      placeholder="Email"
      bind:value={email}
      class="w-full border border-gray-300 rounded px-3 py-2"
    />
    <input
      type="password"
      placeholder="Password"
      bind:value={password}
      class="w-full border border-gray-300 rounded px-3 py-2"
    />
    <input
      type="password"
      placeholder="Confirm Password"
      bind:value={confirmPassword}
      class="w-full border border-gray-300 rounded px-3 py-2"
    />
    <input
      type="text"
      placeholder="Phone"
      bind:value={phone}
      class="w-full border border-gray-300 rounded px-3 py-2"
    />

    <div class="space-y-1">
      <input
        type="text"
        placeholder="Starting Employee Number"
        bind:value={startingEmployeeId}
        class="w-full border border-gray-300 rounded px-3 py-2"
      />
      <p class="text-xs text-gray-500">
        (Starting number — new employees will automatically get the next number.)
      </p>
    </div>

    <div class="flex justify-between items-center space-x-2 pt-2">
      <button
        class="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded"
        on:click={handleSignup}
      >
        Sign Up
      </button>

      <button
        class="flex-1 border border-gray-400 hover:bg-gray-100 text-gray-700 py-2 rounded"
        on:click={cancel}
      >
        Cancel
      </button>
    </div>
  </div>
</div>
