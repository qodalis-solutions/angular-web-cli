#!/usr/bin/env node

const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

function runCommand(command, folder) {
  return new Promise((resolve, reject) => {
    console.log(`Running command: "${command}" in folder: ${folder}`);
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error in folder ${folder}:`, error.message);
        return reject(error);
      }
      if (stdout) console.log(`Output from ${folder}:\n${stdout}`);
      if (stderr) console.error(`Error output from ${folder}:\n${stderr}`);
      resolve();
    });
  });
}

// Root folder containing subfolders
const rootFolder = path.resolve(__dirname, "../");
const projectsFolder = path.resolve(__dirname, "../projects");

// Folders that use tsup instead of ng build
const tsupFolders = ["react-cli", "vue-cli"];

// Main function to process folders sequentially
async function buildProjects() {
  try {
    // Read all subfolders
    const entries = fs.readdirSync(projectsFolder, { withFileTypes: true });
    const mainFolders = ["core", "cli", "angular-cli"];

    // Filter and sort directories (exclude tsup and demo folders from ng build pass)
    const ngFolders = mainFolders
      .concat(
        entries
          .filter((entry) => entry.isDirectory())
          .map((entry) => entry.name)
          .filter(
            (entry) =>
              !mainFolders.includes(entry) &&
              !tsupFolders.includes(entry) &&
              entry !== "demo" &&
              !entry.startsWith("demo-"),
          ),
      )
      .concat(["demo"]);

    if (ngFolders.length === 0) {
      console.log("No subfolders found.");
      return;
    }

    console.log(
      `Found ${ngFolders.length} ng-build folders and ${tsupFolders.length} tsup folders. Starting build process.`,
    );

    // Sequentially execute ng build for Angular-based folders
    for (const folder of ngFolders) {
      const folderPath = path.join(projectsFolder, folder);

      await runCommand(`cd ${rootFolder} && ng build ${folder}`, folderPath);
    }

    // Build rollup bundles (UMD modules)
    for (const folder of ngFolders) {
      const folderPath = path.join(projectsFolder, folder);

      if (fs.existsSync(path.join(folderPath, "rollup.config.mjs"))) {
        console.log(`Running rollup for ${folder}`);
        const rollupCommand = `cd ${folderPath} && npx rollup -c`;
        await runCommand(rollupCommand, folderPath);
      }
    }

    // Build tsup-based projects (React, Vue wrappers)
    for (const folder of tsupFolders) {
      const folderPath = path.join(projectsFolder, folder);

      if (fs.existsSync(folderPath)) {
        console.log(`Running tsup for ${folder}`);
        await runCommand(`cd ${folderPath} && npx tsup`, folderPath);
      }
    }

    console.log("All projects built successfully.");
  } catch (error) {
    console.error("Error during the build process:", error);
    process.exit(1);
  }
}

// Start the process
buildProjects();
