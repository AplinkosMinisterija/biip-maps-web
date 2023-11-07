<template>
  <table class="table w-full border-x border-b rounded">
    <thead>
      <UiTableRow>
        <slot name="header" />
      </UiTableRow>
    </thead>
    <tbody>
      <slot />
    </tbody>
  </table>
</template>
