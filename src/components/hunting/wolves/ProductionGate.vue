<template>
  <div
    class="absolute inset-0 z-[60] flex items-center justify-center bg-gray-900 bg-opacity-30 p-4"
  >
    <!-- z-[60]: above App.vue's #mapLoader (z-50), in case the map never reports its first load. -->
    <section
      aria-labelledby="wolves-gate-title"
      class="bg-white rounded-lg shadow-lg max-w-md w-full p-6 flex flex-col gap-4"
    >
      <h1 id="wolves-gate-title" class="text-xl font-semibold text-gray-900">Puslapis ruošiamas</h1>
      <p class="text-sm text-gray-700">
        Šis vilkų duomenų puslapis dar ruošiamas. Kol kas naudokitės esamu žemėlapiu.
      </p>
      <a
        href="/hunting/public"
        class="self-start px-4 py-3 rounded bg-brand text-white text-sm font-semibold hover:bg-brand-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        Atidaryti žemėlapį
      </a>
    </section>
  </div>
</template>
