import { Cli, CliConfigProvider, CliPanel } from "@qodalis/react-cli";
import "@qodalis/cli/assets/cli-panel.css";
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
import { filesModule } from "@qodalis/cli-files";
import {
  CliLogLevel,
  type CliOptions,
  type ICliModule,
} from "@qodalis/cli-core";
import { CliInputDemoCommandProcessor } from "./processors/cli-input-demo-command-processor";

const modules: ICliModule[] = [
  filesModule,
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
  usersModule.configure({
    seedUsers: [{ name: "root1", email: "root1@root.com", groups: ["admin"] }],
    defaultPassword: "root",
    requirePassword: true,
  }),
  {
    name: "input-demo",
    processors: [new CliInputDemoCommandProcessor()],
  },
];

const options: CliOptions = {
  logLevel: CliLogLevel.DEBUG,
  packageSources: {
    primary: "local",
    sources: [{ name: "local", url: "http://localhost:3000/", kind: "file" }],
  },
  servers: [{ name: "local", url: "" }],
};

function App() {
  return (
    <CliConfigProvider modules={modules} options={options}>
      <Cli />
      <CliPanel />
    </CliConfigProvider>
  );
}

export default App;
