<template>
  <div class="typing-indicator" aria-label="Assistant is typing">
    <span class="dot" />
    <span class="dot" />
    <span class="dot" />
  </div>
</template>

<style scoped>
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 5px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #9aa0a6;
  display: block;
  animation: bounce 1.3s ease-in-out infinite;
}

.dot:nth-child(1) {
  animation-delay: 0s;
}

.dot:nth-child(2) {
  animation-delay: 0.18s;
}

.dot:nth-child(3) {
  animation-delay: 0.36s;
}

@keyframes bounce {
  0%,
  60%,
  100% {
    transform: translateY(0);
    opacity: 0.45;
  }
  30% {
    transform: translateY(-5px);
    opacity: 1;
  }
}
</style>
