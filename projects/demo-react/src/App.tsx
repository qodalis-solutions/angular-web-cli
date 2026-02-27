import { Cli, CliPanel, CliProvider } from "@qodalis/react-cli";
import "@qodalis/cli/src/assets/cli-panel.css";
import { CliGuidCommandProcessor } from "@qodalis/cli-guid";
import { CliRegexCommandProcessor } from "@qodalis/cli-regex";
import { CliTextToImageCommandProcessor } from "@qodalis/cli-text-to-image";
import { CliSpeedTestCommandProcessor } from "@qodalis/cli-speed-test";
import {
  CliCookiesCommandProcessor,
  CliLocalStorageCommandProcessor,
} from "@qodalis/cli-browser-storage";
import { CliStringCommandProcessor } from "@qodalis/cli-string";
import { CliTodoCommandProcessor } from "@qodalis/cli-todo";
import { CliCurlCommandProcessor } from "@qodalis/cli-curl";
import { CliPasswordGeneratorCommandProcessor } from "@qodalis/cli-password-generator";
import { CliQrCommandProcessor } from "@qodalis/cli-qr";
import { CliYesnoCommandProcessor } from "@qodalis/cli-yesno";
import { CliLogsCommandProcessor } from "@qodalis/cli-server-logs";
import { CliLogLevel, type CliOptions } from "@qodalis/cli-core";
import { CliCustomUsersStoreService } from "./services/custom-users-store.service";

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

const options: CliOptions = {
  logLevel: CliLogLevel.DEBUG,
};

const services = {
  "cli-users-store-service": new CliCustomUsersStoreService(),
};

function App() {
  return (
    <CliProvider
      processors={processors}
      options={options}
      services={services}
      style={{ width: "100vw", height: "100vh" }}
    >
      <CliPanel />
    </CliProvider>
  );
}

export default App;
