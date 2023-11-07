<template>
  <multiselect
    :append-to-body="true"
    :attrs="$attrs"
    no-options-text="Nėra pasirinkimų"
    :label="labelProp"
    no-results-text="Nėra rezultatų"
    :classes="{
      container:
        'relative mx-auto w-60 max-w-full flex items-center justify-end cursor-pointer rounded bg-white px-2 py-1 border',
      containerDisabled: 'cursor-default bg-gray-100',
      containerOpen: '',
      containerOpenTop: '',
      containerActive: '',
      wrapper:
        'h-full mx-auto w-full flex items-center justify-end cursor-pointer outline-none gap-1',
      singleLabel:
        'flex items-center h-full max-w-full absolute left-0 top-0 pointer-events-none bg-transparent leading-snug pl-3.5 pr-16 text-sm',
      singleLabelText:
        'overflow-ellipsis overflow-hidden block whitespace-nowrap max-w-full',
      multipleLabel:
        'flex items-center h-full absolute left-0 top-0 pointer-events-none bg-transparent leading-snug pl-3.5',
      search:
        'w-full absolute inset-0 outline-none focus:ring-0 appearance-none box-border border-0 text-base font-sans bg-white rounded pl-3.5',
      tags: 'flex-grow flex-shrink flex flex-wrap gap-2 items-center',
      tag:
        'bg-gray-100 text-xs py-0.5 pl-2 rounded flex items-center whitespace-nowrap min-width-[0px]',
      tagDisabled: 'pr-2 opacity-50',
      tagWrapper: 'whitespace-nowrap overflow-hidden overflow-ellipsis',
      tagWrapperBreak: 'whitespace-normal break-all',
      tagRemove:
        'flex items-center justify-center p-1 mx-0.5 rounded-sm hover:bg-black hover:bg-opacity-10 group',
      tagRemoveIcon:
        'bg-red-500 bg-center bg-no-repeat opacity-30 inline-block w-3 h-3 group-hover:opacity-60',
      tagsSearchWrapper: 'inline-block relative flex-grow flex-shrink h-full',
      tagsSearch:
        'absolute inset-0 border-0 outline-none focus:ring-0 appearance-none p-0 box-border w-full text-sm',
      tagsSearchCopy: 'invisible whitespace-pre-wrap inline-block h-px',
      placeholder: $attrs.searchable
        ? 'hidden'
        : 'flex items-center h-full absolute left-0 top-0 pointer-events-none bg-transparent leading-snug text-sm text-gray-400',
      caret:
        'bg-multiselect-caret bg-center bg-no-repeat w-2.5 h-4 py-px box-content mr-3.5 relative z-10 opacity-40 flex-shrink-0 flex-grow-0 transition-transform transform pointer-events-none',
      caretOpen: 'rotate-180 pointer-events-auto',
      clear:
        'pr-3.5 relative z-10 opacity-40 transition duration-300 flex-shrink-0 flex-grow-0 flex hover:opacity-80',
      clearIcon:
        'bg-red-500 bg-center bg-no-repeat w-2.5 h-4 py-px box-content inline-block',
      spinner:
        'bg-multiselect-spinner bg-center bg-no-repeat w-4 h-4 z-10 mr-3.5 animate-spin flex-shrink-0 flex-grow-0',
      infinite: 'flex items-center justify-center w-full',
      infiniteSpinner:
        'bg-multiselect-spinner bg-center bg-no-repeat w-4 h-4 z-10 animate-spin flex-shrink-0 flex-grow-0 m-3.5',
      dropdown:
        'text-sm max-h-60 absolute -left-px -right-px bottom-0 transform translate-y-full border border-gray-200 shadow-xl -mt-px overflow-y-scroll z-50 bg-white flex flex-col rounded',
      dropdownTop: '-translate-y-full top-px bottom-auto',
      dropdownHidden: 'hidden',
      options: 'flex flex-col p-0 m-0 list-none',
      optionsTop: '',
      group: 'p-0 m-0',
      groupLabel:
        'flex text-sm box-border items-center justify-start text-left py-1 px-3 font-semibold bg-gray-200 cursor-default leading-normal',
      groupLabelPointable: 'cursor-pointer',
      groupLabelPointed: 'bg-gray-300 text-gray-700',
      groupLabelSelected: 'bg-green-600 text-white',
      groupLabelDisabled: 'bg-gray-100 text-gray-300 cursor-not-allowed',
      groupLabelSelectedPointed: 'bg-green-600 text-white opacity-90',
      groupLabelSelectedDisabled:
        'text-green-100 bg-green-600 bg-opacity-50 cursor-not-allowed',
      groupOptions: 'p-0 m-0',
      option:
        'flex items-center justify-start box-border text-left cursor-pointer leading-snug py-2 px-3',
      optionPointed: 'bg-gray-100',
      optionSelected: 'bg-gray-200',
      optionDisabled: 'opacity-80 cursor-not-allowed',
      optionSelectedPointed: 'bg-gray-200',
      optionSelectedDisabled: 'bg-gray-200 cursor-not-allowed',
      noOptions: 'py-2 px-3 text-gray-600 bg-white text-left',
      noResults: 'py-2 px-3 text-gray-600 bg-white text-left',
      fakeInput:
        'bg-transparent absolute left-0 right-0 -bottom-px w-full h-px border-0 p-0 appearance-none outline-none text-transparent',
      assist: 'absolute -m-px w-px h-px overflow-hidden',
      spacer: 'h-9 py-px box-content',
    }"
  >
    <template #caret="{ handleCaretClick, isOpen }">
      <UiIcon
        name="chevron-down"
        class="transition text-gray-700 flex-shrink-0"
        :class="[isOpen ? 'rotate-180 pointer-events-auto' : 'pointer-events-none']"
        @click="handleCaretClick"
      />
    </template>
    <template #clear="{ clear }">
      <UiIcon name="close" class="text-gray-700 flex-shrink-0" @click="clear" />
    </template>
    <template #spinner>
      <UiIcon name="spinner" class="text-gray-700 flex-shrink-0" />
    </template>
    <template #tag="{ option, handleTagRemove, disabled }: any">
      <div class="bg-gray-100 rounded p-1 gap-1 text-xs flex items-center">
        <span tabindex="-1" v-html="option[labelProp || 'label']"></span>
        <UiIcon
          v-if="!disabled && !option.disabled"
          name="close"
          :size="12"
          @click.stop="handleTagRemove(option, $event)"
        />
      </div>
    </template>
    <template #option="{ option }: any">
      <div class="flex flex-col">
        <span class="text-sm" v-html="option[labelProp || 'label']"></span>
        <span
          v-if="option.subtitle"
          class="text-xxs text-gray-600"
          v-html="option.subtitle"
        ></span>
        <span
          v-if="option?.description"
          class="text-xxxs text-gray-600"
          v-html="option.description"
        ></span>
      </div>
    </template>
  </multiselect>
</template>

<script setup lang="ts">
import Multiselect from "@vueform/multiselect";

defineProps({
  labelProp: {
    type: String,
    default: "label",
  },
  label: {
    type: String,
    default: "",
  },
});
</script>
