import { CliPanel, CliProvider } from "@qodalis/react-cli";
import "@qodalis/cli/src/assets/cli-panel.css";
import { guidModule } from "@qodalis/cli-guid";
import { regexModule } from "@qodalis/cli-regex";
import { textToImageModule } from "@qodalis/cli-text-to-image";
import { speedTestModule } from "@qodalis/cli-speed-test";
import { browserStorageModule } from "@qodalis/cli-browser-storage";
import { stringModule } from "@qodalis/cli-string";
import { todoModule } from "@qodalis/cli-todo";
import { curlModule } from "@qodalis/cli-curl";
import { passwordGeneratorModule } from "@qodalis/cli-password-generator";
import { qrModule } from "@qodalis/cli-qr";
import { yesnoModule } from "@qodalis/cli-yesno";
import { serverLogsModule } from "@qodalis/cli-server-logs";
import { usersModule } from "@qodalis/cli-users";
import { CliLogLevel, type CliOptions, type ICliModule } from "@qodalis/cli-core";
import { CliCustomUsersStoreService } from "./services/custom-users-store.service";

const modules: ICliModule[] = [
  guidModule,
  regexModule,
  textToImageModule,
  speedTestModule,
  browserStorageModule,
  stringModule,
  todoModule,
  curlModule,
  passwordGeneratorModule,
  qrModule,
  yesnoModule,
  serverLogsModule,
  usersModule,
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
      modules={modules}
      options={options}
      services={services}
      style={{ width: "100vw", height: "100vh" }}
    >
      <CliPanel />
    </CliProvider>
  );
}

export default App;
