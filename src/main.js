const minimist = require("minimist");
const { search, getinfo } = require("./core/search");
const { select } = require("@inquirer/prompts");
const { AsciiTable3 } = require("ascii-table3");
const fs = require("node:fs");
const { help, license, useragent } = require("./data.js");

async function main() {
  const args = minimist(process.argv.slice(2), {
    alias: { d: "device", s: "save", h: "help" }
  });

  if (args.help) {
    console.log(help);
    process.exit(0);
  }

  if (args.license) {
    console.log(license);
    process.exit(0);
  }

  if (!args.device) {
    console.error("error: --device (-d) argument is required.");
    process.exit(1);
  }

  let results;
  try {
    results = await search(args.device);
  } catch (err) {
    console.error("error: search failed.");
    console.error(`details: ${err.message}`);
    process.exit(1);
  }

  if (!results.length) {
    console.error(`error: no devices found matching "${args.device}".`);
    process.exit(1);
  }

  const choices = results.map(({ name, link }) => ({ name, value: link }));

  const selectedDevice = await select({
    message: "select your device:",
    choices
  });

  console.info("fetching device specifications...");
  const deviceData = await getinfo(selectedDevice);

  if (!deviceData) {
    console.error("error: failed to get device specifications.");
    process.exit(1);
  }

  if (args.save) {
    try {
      fs.writeFileSync("device.json", JSON.stringify(deviceData, null, 2));
      console.log("saved phone specifications to device.json");
    } catch {
      console.warn(
        "warning: failed to save phone specifications, continuing anyway."
      );
    }
  }

  const table = new AsciiTable3("device specifications");
  table.setHeading("property", "value");

  for (const key in deviceData) {
    if (Object.hasOwnProperty.call(deviceData, key)) {
      let prop = key === "title" ? "model" : key.replace(/_/g, " ");
      prop = prop.charAt(0).toLowerCase() + prop.slice(1);
      table.addRow(prop, deviceData[key]);
    }
  }

  table.setStyle("compact");
  console.log(table.toString());
}

main();
