<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import PunchInput from '$lib/components/PunchInput.svelte';
	import AdminSignupModal from '$lib/components/AdminSignupModal.svelte';
	import LoginModal from '$lib/components/LoginModal.svelte';
  
  
	let showPage = true;
	let showSignup = false;
	let showLogin = false;
  
	// Testimonials data
	let testimonials = [
    {
      id: 1,
      quote: "With TimeSync, I no longer have to worry about the inefficiencies of tracking time. It’s as cold and precise as my blade. Every minute is accounted for, and I can focus on conquering kingdoms… and debugging code.",
      avatar: "/images/avatar1.jpg",
      name: 'Arthas Menethil',
      profession: 'Paladin of the Silver Hand'
    },
    {
      id: 2,
      quote: "TimeSync is the perfect tool for precise time tracking. I run a tight ship, and TimeSync ensures every second counts. The recipe for success? Efficient tracking, just like my meth formula.",
      avatar: "/images/avatar2.jpg",
      name: 'Walter White',
      profession: 'Chemistry Teacher'
    },
    {
      id: 3,
      quote: "I slay demons, not timecards. But with TimeSync, tracking my hours is easier than slaying my enemies. Fast, efficient, and always on point. No more interruptions.",
      avatar: "/images/avatar3.jpg",
      name: 'Doomguy',
      profession: 'Doom Slayer'
    },
    {
      id: 4,
      quote: "I understand balance. TimeSync brings balance to your work hours — everything in perfect harmony. It’s as flawless as my plan to snap away inefficiencies.",
      avatar: "/images/avatar4.JPG",
      name: 'Thanos',
      profession: 'Strategist and Warrior'
    },
    {
      id: 5,
      quote: "In a chaotic world, TimeSync is the punchline of productivity. I no longer have to worry about tracking time, I just let TimeSync handle it. It’s a joke how easy it is.",
      avatar: "/images/avatar5.JPG",
      name: 'Arthur Fleck',
      profession: 'Joker'
    },
    {
      id: 6,
      quote: "I’m the most efficient being in the world, and TimeSync helps me keep it that way. With precision, I control everything — including my hours. TimeSync is the superhero your time management deserves.",
      avatar: "/images/avatar6.JPG",
      name: 'John Gillman',
      profession: 'The Homelander'
    },
    {
      id: 7,
      quote: "Every mission requires precision, and TimeSync delivers exactly that. It keeps my hours as organized as my battlefield strategies. When you need to stay in command, TimeSync has your back.",
      avatar: "/images/avatar7.jpg",
      name: 'Herschel Shepherd',
      profession: '4-Star General'
    }
  ];
  
	let scrollContainer;
  
	onMount(() => {
	  localStorage.clear(); // Always start fresh
	  showPage = true;
  
	  const interval = setInterval(() => {
		if (!scrollContainer) return;
  
		const maxScrollLeft = scrollContainer.scrollWidth - scrollContainer.clientWidth;
  
		if (scrollContainer.scrollLeft >= maxScrollLeft - 10) {
		  scrollContainer.scrollTo({ left: 0, behavior: 'smooth' });
		} else {
		  scrollContainer.scrollBy({ left: 250, behavior: 'smooth' });
		}
	  }, 3000);
  
	  return () => clearInterval(interval); // cleanup
	});
  </script>
  
  {#if showPage}
  <main transition:fade class="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-gray-100">

	<!-- Left Column (Hidden on Mobile) -->
	<div class="hidden md:flex flex-col items-center justify-center bg-blue-600 text-white p-10 space-y-6">
	  <div class="text-center">
		<h1 class="text-4xl pacifico-regular">TimeSync</h1>
		<p class="text-lg mt-2">Smart time tracking for teams and admins.</p>
	  </div>

	  <div class="bg-white text-blue-900 w-full max-w-3xl rounded-lg shadow p-6">
		<h3 class="text-xl font-semibold mb-4 text-center">Manual Time Entry</h3>
		<PunchInput />
	  </div>
	</div>

	<!-- Right Column -->
	<div class="flex items-center justify-center p-10 bg-white">
	  <div class="space-y-6 w-full max-w-sm text-center">

		<!-- Intro Text -->
		<h2 class="text-2xl font-bold">Welcome</h2>
		<p class="text-gray-700 text-sm">
		  Are you tired of your old system?<br />
		  Check out what our clients are saying!
		</p>

		<!-- Testimonial Scroll Area -->
		<div bind:this={scrollContainer} class="flex overflow-x-auto space-x-4 p-2 scroll-smooth">
		  {#each testimonials as testimonial}
			<div class="flex-shrink-0 bg-gray-100 rounded-lg p-4 w-64 shadow text-center space-y-2">
			  <!-- Avatar -->
			  <img src={testimonial.avatar} alt={testimonial.name} class="mx-auto w-16 h-16 rounded-full object-cover" />

			  <!-- Name -->
			  <h4 class="text-sm font-bold text-gray-800">{testimonial.name}</h4>

			  <!-- Profession -->
			  <p class="text-xs text-gray-500">{testimonial.profession}</p>

			  <!-- Quote -->
			  <p class="text-gray-700 text-xs italic">
				"{testimonial.quote}"
			  </p>
			</div>
		  {/each}
		</div>

		<!-- Sign Up Button -->
		<button
		  on:click={() => showSignup = true}
		  class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded transition">
		  ➕ Sign Up
		</button>

		<!-- Login Link -->
		<p class="text-gray-600 text-sm">
		  Already have an account? 
		  <a href="#" on:click={(e) => { e.preventDefault(); showLogin = true; }} class="text-blue-600 font-semibold hover:underline">
			Log In
		  </a>
		</p>

	  </div>
	</div>

  </main>
{/if}

{#if showSignup}
	<AdminSignupModal on:close={() => showSignup = false} />
{/if}

{#if showLogin}
	<LoginModal on:close={() => showLogin = false} />
{/if}

<footer class="bg-gray-800 text-white py-4">
	<div class="container mx-auto text-center text-sm">
	  © {new Date().getFullYear()} TimeSync. All rights reserved.
	  <div class="mt-2">
	  </div>
	</div>
  </footer>

<style>
	.pacifico-regular {
	  font-family: "Pacifico", cursive;
	  font-weight: 400;
	  font-style: normal;
	}
</style>