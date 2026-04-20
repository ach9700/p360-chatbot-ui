<script setup>
import { ref } from 'vue'
import PreChatForm from './components/PreChatForm.vue'
import ChatScreen from './components/ChatScreen.vue'

const screen = ref('form')
const userInfo = ref(null)

function handleFormSubmit(info) {
  userInfo.value = info
  screen.value = 'chat'
}
</script>

<template>
  <PreChatForm v-if="screen === 'form'" @submit="handleFormSubmit" />
  <ChatScreen v-else :user-info="userInfo" />
</template>
