<script lang="ts">
	import '../app.css';
	import { supabase } from '$lib/supabaseClient';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	const pageStore = page;

	async function logout() {
		await supabase.auth.signOut();
		localStorage.removeItem('loggedInUser');
		goto('/');
	}
</script>

{#if $pageStore.url.pathname !== '/'}
	<nav class="flex justify-between items-center p-4 bg-blue-600 border-b shadow-sm">
		<div class="text-white font-bold text-xl pacifico-regular">
			TimeSync
		</div>
		<button
			on:click={logout}
			class="md:block bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm"
		>
			Logout
		</button>
	</nav>


{/if}

<main class="min-h-screen">
	<slot />
</main>

<style>
	.pacifico-regular {
		font-family: "Pacifico", cursive;
		font-weight: 400;
		font-style: normal;
	}
</style>
