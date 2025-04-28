<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  // These values will be bound from the parent component
  export let punchDate: string;
  export let punchTime: string;
  export let reason: string = '';

  const dispatch = createEventDispatcher();

  // Function to submit the missing punch request
  function submitRequest() {
    if (!punchDate || !punchTime) {
      alert('Please enter a valid date and time');
      return;
    }
    dispatch('submit');  // Pass data to the parent
  }

  // Function to cancel the request
  function cancelRequest() {
    dispatch('cancel');  // Close the modal without saving
  }
</script>

<div class="modal-backdrop" on:click={cancelRequest}></div>
<div class="modal">
  <h2 class="text-lg font-bold mb-4">Submit Missing Punch Request</h2>

  <!-- Date Field -->
  <label class="block mb-2">
    <strong>Missing Punch Date:</strong>
    <input type="date" bind:value={punchDate} class="input-field" />
  </label>

  <!-- Time Field -->
  <label class="block mb-2">
    <strong>Missing Punch Time:</strong>
    <input type="time" bind:value={punchTime} class="input-field" />
  </label>

  <!-- Optional Reason Field -->
  <label class="block mb-4">
    <strong>Reason (Optional):</strong>
    <textarea bind:value={reason} class="input-field" placeholder="Enter reason for missing punch (optional)"></textarea>
  </label>

  <!-- Action Buttons -->
  <div class="buttons mt-4">
    <button on:click={submitRequest}>Submit</button>
    <button on:click={cancelRequest}>Cancel</button>
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

  .input-field {
    width: 100%;
    padding: 0.5rem;
    border-radius: 4px;
    border: 1px solid #ccc;
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
</style>
