<script setup lang="ts">
import { Cli, CliPanel } from '@qodalis/vue-cli';
import '@qodalis/cli/src/assets/cli-panel.css';
import { CliGuidCommandProcessor } from '@qodalis/cli-guid';
import { CliRegexCommandProcessor } from '@qodalis/cli-regex';
import { CliTextToImageCommandProcessor } from '@qodalis/cli-text-to-image';
import { CliSpeedTestCommandProcessor } from '@qodalis/cli-speed-test';
import { CliCookiesCommandProcessor, CliLocalStorageCommandProcessor } from '@qodalis/cli-browser-storage';
import { CliStringCommandProcessor } from '@qodalis/cli-string';
import { CliTodoCommandProcessor } from '@qodalis/cli-todo';
import { CliCurlCommandProcessor } from '@qodalis/cli-curl';
import { CliPasswordGeneratorCommandProcessor } from '@qodalis/cli-password-generator';
import { CliQrCommandProcessor } from '@qodalis/cli-qr';
import { CliYesnoCommandProcessor } from '@qodalis/cli-yesno';
import { CliLogsCommandProcessor } from '@qodalis/cli-server-logs';

const processors = [
    new CliGuidCommandProcessor(),
    new CliRegexCommandProcessor(),
    new CliTextToImageCommandProcessor(),
    new CliSpeedTestCommandProcessor(),
    new CliCookiesCommandProcessor(),
    new CliLocalStorageCommandProcessor(),
    new CliStringCommandProcessor(),
    new CliTodoCommandProcessor(),
    new CliCurlCommandProcessor(),
    new CliPasswordGeneratorCommandProcessor(),
    new CliQrCommandProcessor(),
    new CliYesnoCommandProcessor(),
    new CliLogsCommandProcessor(),
];
</script>

<template>
  <Cli :processors="processors" :style="{ width: '100vw', height: '100vh' }" />
  <CliPanel :processors="processors" />
</template>
