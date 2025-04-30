<script lang="ts">
    import { supabase } from '$lib/supabaseClient';
    import { createEventDispatcher, onMount } from 'svelte';
  
    const dispatch = createEventDispatcher();
  
    let selectedUserId = ''; // ID of the employee to manage
    let newRole: 'Employee' | 'Manager' = 'Employee'; // Role for the selected employee
    let employeesList = []; // List of employees to select from
    let currentUserRole: 'Employee' | 'Manager' | 'Admin' = 'Employee'; // Current user role (Admin, Manager)
    let loading = false;
    let error = '';
  
    export let userRole: 'Employee' | 'Manager' | 'Admin' = 'Employee'; // The current user role
  
    // Fetch employee list and current user role when the modal opens
    onMount(async () => {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData?.session?.user;

  if (user) {
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('id, name, role, client_id')
      .eq('auth_user_id', user.id)
      .single();

    if (!fetchError && userData) {
      currentUserRole = userData.role; // Store current user role
    }

    if (currentUserRole === 'Admin') {
      // Admins can see all users
      const { data: users } = await supabase
        .from('users')
        .select('id, name, role, client_id')
        .eq('client_id', userData.client_id) // Fetch based on the same client_id
        .order('name', { ascending: true });

      employeesList = users || [];
      console.log('Fetched all users for Admin:', employeesList);
    } else if (currentUserRole === 'Manager') {
      // Managers can only see employees and managers (not admins)
      const { data: users } = await supabase
        .from('users')
        .select('id, name, role, client_id')
        .eq('client_id', userData.client_id) // Fetch based on the same client_id
        .not('role', 'eq', 'Admin') // Exclude admins from manager's view
        .order('name', { ascending: true });

      employeesList = users || [];
      console.log('Fetched employees and managers for Manager:', employeesList);
    }
  }
});

  
    // Update the role of the selected employee
    async function updateRole() {
      loading = true;
      error = '';
  
      // Ensure the user has the right permissions to change roles
      if (currentUserRole !== 'Admin' && currentUserRole !== 'Manager') {
        error = 'Only Admins or Managers can change roles.';
        loading = false;
        return;
      }
  
      // Prevent Admin role change by managers
      if (newRole === 'Admin' && currentUserRole === 'Manager') {
        error = 'Managers cannot assign the Admin role.';
        loading = false;
        return;
      }
  
      const { error: updateError } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', selectedUserId);
  
      if (updateError) {
        error = updateError.message;
      } else {
        dispatch('close'); // Close the modal after the role is updated
      }
  
      loading = false;
    }
  
    // Close the modal
    function closeModal() {
      dispatch('close');
    }
  
    // Close the modal if clicked outside
    function clickOutside(event: MouseEvent) {
      if (event.target === event.currentTarget) {
        closeModal();
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
      <h2 class="text-2xl font-bold text-center">Manage Employee Role</h2>
  
      <div class="space-y-4">
        <!-- Employee selection dropdown -->
        <select
          bind:value={selectedUserId}
          class="w-full border border-gray-300 rounded px-4 py-2"
          required
        >
          <option value="" disabled>Select Employee</option>
          {#each employeesList as employee}
            <option value={employee.id}>{employee.name} ({employee.role})</option>
          {/each}
        </select>
  
        {#if selectedUserId}
          <div>
            <label for="newRole" class="block font-medium">New Role</label>
            <select
              id="newRole"
              bind:value={newRole}
              class="w-full border border-gray-300 rounded px-4 py-2"
            >
              <option value="Employee">Employee</option>
              {#if currentUserRole === 'Admin' || currentUserRole === 'Manager'}
                <option value="Manager">Manager</option>
              {/if}
              {#if currentUserRole === 'Admin'}
                <option value="Admin">Admin</option>
              {/if}
            </select>
          </div>
        {/if}
  
        {#if error}
          <div class="text-red-600 text-sm">{error}</div>
        {/if}
  
        <div class="flex justify-between items-center space-x-2 pt-2">
          <button
            type="button"
            class="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 rounded"
            on:click={closeModal}
          >
            Cancel
          </button>
  
          <button
            type="button"
            class="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
            on:click={updateRole}
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Update Role'}
          </button>
        </div>
      </div>
    </div>
  </div>
  
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
  