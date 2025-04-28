<script lang="ts">
    import { supabase } from '$lib/supabaseClient';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    let verify = false;
  
    let token = '';
    let email = '';
    let role = '';
    let name = '';
    let phone = '';
    let password = '';
    let confirmPassword = '';
    let companyName = '';
    let newEmployeeId = '';
    let loading = true;
    let error = '';
    
    
    onMount(async () => {
      token = new URLSearchParams(window.location.search).get('token') || '';
  
      if (!token) {
        error = 'Invalid invitation link.';
        loading = false;
        return;
      }
  
      const { data: inviteData, error: inviteError } = await supabase
        .from('pending_invites')
        .select('email, role, client_id')
        .eq('token', token)
        .single();
  
      if (inviteError || !inviteData) {
        error = 'Invitation not found or already used.';
        loading = false;
        return;
      }
  
      email = inviteData.email;
      role = inviteData.role;
  
      // Get company legal name
      const { data: clientData } = await supabase
        .from('clients')
        .select('legal_name')
        .eq('id', inviteData.client_id)
        .single();
  
      if (clientData) {
        companyName = clientData.legal_name;
      }
  
      // Find max employee_id for this client
      const { data: usersData } = await supabase
        .from('users')
        .select('employee_id')
        .eq('client_id', inviteData.client_id);
  
      if (usersData) {
        const employeeNumbers = usersData
          .map((u) => parseInt(u.employee_id))
          .filter((n) => !isNaN(n));
        const highest = employeeNumbers.length > 0 ? Math.max(...employeeNumbers) : 1000;
        newEmployeeId = (highest + 1).toString();
      } else {
        newEmployeeId = '1001';
      }
  
      loading = false;
    });
  
    async function acceptInvite() {
      error = '';
  
      if (password !== confirmPassword) {
        error = 'Passwords do not match.';
        return;
      }
  
      if (password.length < 6) {
        error = 'Password must be at least 6 characters.';
        return;
      }
  
      if (!phone) {
        error = 'Phone number is required.';
        return;
      }
  
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password
      });
  
      if (signUpError) {
        error = signUpError.message;
        return;
      }
  
      const auth_user_id = authData?.user?.id;
  
      if (!auth_user_id) {
        error = 'Signup failed.';
        return;
      }
  
      const { data: inviteData } = await supabase
        .from('pending_invites')
        .select('client_id')
        .eq('token', token)
        .single();
  
      if (!inviteData) {
        error = 'Invite expired.';
        return;
      }
  
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          auth_user_id,
          client_id: inviteData.client_id,
          name,
          email,
          phone,
          role,
          employee_id: newEmployeeId
        });
  
      if (insertError) {
        error = 'Failed to create user record.';
        return;
      }
  
      await supabase.from('pending_invites').delete().eq('token', token);
  
      goto('/?verify=true');
    }
  </script>
  
  <main class="min-h-screen flex flex-col items-center justify-center p-8 space-y-6">
    {#if loading}
      <p>Loading...</p>
    {:else if error}
      <div class="text-red-600">{error}</div>
    {:else}
      <div class="max-w-md w-full space-y-4">
        <h1 class="text-3xl font-bold text-center">Complete Your Registration</h1>
  
        <div class="bg-gray-100 p-4 rounded space-y-2 text-gray-700 text-sm">
          <div><strong>Company:</strong> {companyName}</div>
          <div><strong>Role:</strong> {role}</div>
          <div><strong>Employee ID:</strong> {newEmployeeId}</div>
        </div>
  
        <input
          class="w-full border border-gray-300 rounded px-4 py-2"
          placeholder="Email"
          value={email}
          disabled
        />
  
        <input
          type="text"
          class="w-full border border-gray-300 rounded px-4 py-2"
          placeholder="Full Name"
          bind:value={name}
          required
        />
  
        <input
          type="text"
          class="w-full border border-gray-300 rounded px-4 py-2"
          placeholder="Phone Number"
          bind:value={phone}
          required
        />
  
        <input
          type="password"
          class="w-full border border-gray-300 rounded px-4 py-2"
          placeholder="Password"
          bind:value={password}
          required
        />
  
        <input
          type="password"
          class="w-full border border-gray-300 rounded px-4 py-2"
          placeholder="Confirm Password"
          bind:value={confirmPassword}
          required
        />
  
        <button
          class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
          on:click={acceptInvite}
        >
          Create Account
        </button>
  
        {#if error}
          <div class="text-red-600 text-sm">{error}</div>
        {/if}
      </div>
    {/if}
  </main>
  