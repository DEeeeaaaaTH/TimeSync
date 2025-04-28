<script lang="ts">
	import ApprovePunchesModal from '$lib/components/ApprovePunchesModal.svelte';

	export let dayBlocks = [];
	export let summaries = [];
	export let clientId: string;

	let showApproveModal = false;

	function openApproveModal() {
		showApproveModal = true;
	}

	function closeApproveModal() {
		showApproveModal = false;
	}
</script>

<div class="flex flex-col gap-4 items-center">

	<button
		class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg"
		on:click={openApproveModal}
	>
		✅ Approve Missing Punches
	</button>

	<ApprovePunchesModal open={showApproveModal} on:cancel={closeApproveModal} clientId={clientId} />

</div>
