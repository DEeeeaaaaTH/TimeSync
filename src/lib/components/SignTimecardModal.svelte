<script lang="ts">
    import { createEventDispatcher, onMount } from 'svelte';
  
    export let employeeName: string = 'Employee';
    export let periodEndDate: string = '';
  
    const dispatch = createEventDispatcher();
    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D;
    let isDrawing = false;
  
    onMount(() => {
      ctx = canvas.getContext('2d')!;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
    });
  
    function startDrawing(event: MouseEvent | TouchEvent) {
      isDrawing = true;
      const pos = getPos(event);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  
    function draw(event: MouseEvent | TouchEvent) {
      if (!isDrawing) return;
      const pos = getPos(event);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  
    function stopDrawing() {
      isDrawing = false;
    }
  
    function clearCanvas() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  
    function saveSignature() {
      const signatureDataUrl = canvas.toDataURL('image/png');
      dispatch('save', { signature: signatureDataUrl });
    }
  
    function cancel() {
      dispatch('cancel');
    }
  
    function getPos(event: MouseEvent | TouchEvent) {
      if (event instanceof MouseEvent) {
        return { x: event.offsetX, y: event.offsetY };
      } else {
        const rect = canvas.getBoundingClientRect();
        const touch = event.touches[0];
        return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
      }
    }
  </script>
  
  <div class="modal-backdrop" on:click={cancel}></div>
  <div class="modal">
    <h2 class="text-lg font-bold mb-4">Sign Your Timecard</h2>
  
    <div class="legal-text text-sm mb-4 p-2 bg-gray-100 rounded">
      I, <strong>{employeeName}</strong>, certify that the timecard for the pay period ending <strong>{periodEndDate}</strong> is true and correct to the best of my knowledge. By signing below, I agree that the recorded work hours are complete and accurate.
    </div>
  
    <canvas
      bind:this={canvas}
      width="300"
      height="150"
      on:mousedown={startDrawing}
      on:mousemove={draw}
      on:mouseup={stopDrawing}
      on:mouseleave={stopDrawing}
      on:touchstart|preventDefault={startDrawing}
      on:touchmove|preventDefault={draw}
      on:touchend|preventDefault={stopDrawing}
    ></canvas>
  
    <div class="buttons mt-4">
      <button on:click={clearCanvas}>Clear</button>
      <button on:click={saveSignature}>Save</button>
      <button on:click={cancel}>Cancel</button>
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
  max-width: 500px; /* Increased width for larger modal */
  background: white;
  padding: 1.5rem; /* Added more padding for larger modal */
  border-radius: 8px;
  transform: translate(-50%, -50%);
  z-index: 11;
  box-shadow: 0 0 20px rgba(0,0,0,0.3);
  text-align: center;
}

.legal-text {
  font-size: 0.9rem;
  color: #333;
  background: #f9f9f9;
  border: 1px solid #ccc;
  padding: 1rem; /* Added padding for better visual balance */
  border-radius: 6px;
}

canvas {
  width: 100%; /* Makes the canvas width the same as the .legal-text width */
  height: 150px; /* Keep the canvas height the same */
  border: 1px solid #ccc;
  margin-top: 1rem;
  touch-action: none;
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
  background-color: #0077cc;  /* Blue color */
  color: white;               /* Text color white */
  border: none;               /* Remove border */
  border-radius: 4px;         /* Rounded corners */
  transition: background-color 0.3s ease;
}

button:hover {
  background-color: #005fa3;  /* Darker blue when hovered */
}

button:focus {
  outline: none;  /* Remove default focus outline */
}

  </style>
  