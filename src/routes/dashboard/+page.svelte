<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import InviteUserModal from '$lib/components/InviteUserModal.svelte';
	import TimecardPunchView from '$lib/components/TimecardPunchView.svelte';
	import EmployeeDashboard from '$lib/components/EmployeeDashboard.svelte';
	import ManagerDashboard from '$lib/components/ManagerDashboard.svelte';
	import AdminDashboard from '$lib/components/AdminDashboard.svelte';

	let showMenu = false;
	let showInviteModal = false;
	let userName = '';
	let userRole: 'Employee' | 'Manager' | 'Admin' = 'Employee';
	let userId = '';
	let clientPeriodStart = '';
	let currentCalculatedPeriodStart: Date | null = null;

	let employeesList = [];
	let selectedUserId = '';
	let selectedUserName = '';

	let dayBlocks = [];
	let summaries = [];

	let viewAsEmployee = false;

	onMount(async () => {
		const { data: sessionData } = await supabase.auth.getSession();
		const user = sessionData?.session?.user;

		if (user) {
			const { data: userData, error } = await supabase
				.from('users')
				.select('id, name, role, client_id')
				.eq('auth_user_id', user.id)
				.single();

			if (userData && !error) {
				userId = userData.id;
				userName = userData.name;
				userRole = userData.role;
				selectedUserId = userData.id;
				selectedUserName = userData.name;

				if (userData.role === 'Employee') {
    viewAsEmployee = true;
}

				if (userData.client_id) {
					const { data: clientData } = await supabase
						.from('clients')
						.select('pay_period_start')
						.eq('id', userData.client_id)
						.single();

					if (clientData?.pay_period_start) {
						clientPeriodStart = clientData.pay_period_start;
						calculateCurrentPeriod();
					}

					if (userRole === 'Admin' || userRole === 'Manager') {
						const { data: users } = await supabase
							.from('users')
							.select('id, name')
							.eq('client_id', userData.client_id)
							.order('name', { ascending: true });

						employeesList = users || [];
					}
				}
			}
		}
	});

	function calculateCurrentPeriod() {
		const base = new Date(clientPeriodStart);
		const today = new Date();
		let periodStart = new Date(base);

		while (true) {
			const periodEnd = new Date(periodStart);
			periodEnd.setDate(periodStart.getDate() + 13);
			if (today >= periodStart && today <= periodEnd) {
				break;
			}
			periodStart.setDate(periodStart.getDate() + 14);
		}

		periodStart.setDate(periodStart.getDate() + 1);
		currentCalculatedPeriodStart = new Date(periodStart);
	}

	function openInviteUser() {
		showMenu = false;
		showInviteModal = true;
	}

	function toggleViewMode() {
		viewAsEmployee = !viewAsEmployee;
		showMenu = false;

		if (viewAsEmployee) {
			selectedUserId = userId;
			selectedUserName = userName;
		} else if (employeesList.length > 0) {
			selectedUserId = employeesList[0].id;
			selectedUserName = employeesList[0].name;
		}
	}

	function onEmployeeChange(event: Event) {
		const selectedId = (event.target as HTMLSelectElement).value;
		selectedUserId = selectedId;
		const selected = employeesList.find(e => e.id === selectedId);
		selectedUserName = selected ? selected.name : '';
	}

	function closeInviteModal() {
		showInviteModal = false;
	}

	function toggleMenu() {
		showMenu = !showMenu;
	}

	function closeMenuOutside(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			showMenu = false;
		}
	}

	$: hasMissingPunches = dayBlocks.some(day =>
		day.blocks?.some(b => b.type === 'missing')
	);
</script>

<main class="min-h-screen flex flex-col items-center justify-center space-y-6 p-8 relative">
	<div class="text-center">
		<h1 class="text-4xl font-bold">{userName}</h1>
		<p class="text-lg text-gray-600 mt-2">
			Role: {userRole}
			{#if (userRole === 'Admin' || userRole === 'Manager') && viewAsEmployee}
				<span class="text-blue-600 text-sm ml-2">(Viewing as Employee)</span>
			{/if}
		</p>
		{#if currentCalculatedPeriodStart}
			<p class="text-gray-500 text-sm">Current Period Start: {currentCalculatedPeriodStart.toLocaleDateString()}</p>
		{/if}
	</div>

	{#if userRole === 'Admin' || userRole === 'Manager'}
		<div class="relative">
			<button
				class="bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold py-3 px-6 rounded-lg shadow"
				on:click={toggleMenu}
			>
				Actions ▼
			</button>

			{#if showMenu}
				<div
					class="absolute left-1/2 transform -translate-x-1/2 mt-3 w-56 bg-white border rounded-lg shadow-lg z-10"
					on:click|self={closeMenuOutside}
				>
					<button
						class="w-full text-left px-4 py-3 hover:bg-gray-100 text-gray-700 font-medium"
						on:click={openInviteUser}
					>
						➕ Invite User
					</button>

					<button
						class="w-full text-left px-4 py-3 hover:bg-gray-100 text-gray-700 font-medium"
						on:click={toggleViewMode}
					>
						{viewAsEmployee ? '🔄 Switch to Manager/Admin View' : '👤 Switch to Employee View'}
					</button>
				</div>
			{/if}
		</div>
	{/if}

	{#if showInviteModal}
		<InviteUserModal {userRole} on:close={closeInviteModal} />
	{/if}

	{#if userId && currentCalculatedPeriodStart}
		<div class="w-full max-w-7xl mt-8">

			<!-- DASHBOARD BUTTONS -->
			<div class="mb-8">
				{#if userRole === 'Employee' || viewAsEmployee}
					<EmployeeDashboard {dayBlocks} {summaries} {hasMissingPunches} {currentCalculatedPeriodStart}/>
				{:else if userRole === 'Manager'}
					<ManagerDashboard {dayBlocks} {summaries} />
				{:else if userRole === 'Admin'}
					<AdminDashboard allSigned={false} />
				{/if}
			</div>

			<!-- TIME CARD -->
			{#if (userRole === 'Admin' || userRole === 'Manager') && !viewAsEmployee}
				<div class="mb-6 text-center">
					<label class="font-semibold mr-2">Select Employee:</label>
					<select on:change={onEmployeeChange} bind:value={selectedUserId} class="border px-3 py-2 rounded">
						{#each employeesList as emp}
							<option value={emp.id}>{emp.name}</option>
						{/each}
					</select>
				</div>
			{/if}

			{#key selectedUserId}
				<TimecardPunchView
					userId={selectedUserId}
					clientPeriodStart={currentCalculatedPeriodStart.toISOString().split('T')[0]}
					bind:dayBlocks
					bind:summaries
					viewAsEmployee={viewAsEmployee}
					role={userRole}
				/>
			{/key}
		</div>
	{/if}
</main>

