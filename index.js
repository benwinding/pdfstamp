#!/usr/bin/env node

const program = require("commander");
const chalk = require("chalk");
const os = require("os");
const rimraf = require("rimraf");
const path = require("path");
const sh = require("shelljs");
const { execCmd, execCmdResult } = require("./utils/exec");

async function exists(commandName, installTxt) {
  const valid = await execCmdResult(`which ${commandName}`)
    .then(() => true)
    .catch(() => false);
  const resultText = valid ? chalk.green("exists!") : chalk.red("not found");
  console.log(`- checking ${commandName}: ${resultText}`);
  if (!valid) {
    console.log(chalk.blue(installTxt));
  }
}

program
  .command("doctor")
  .description("Checks to make sure your dependencies are installed")
  .action(async () => {
    await exists(
      "convert",
      "Install this tool: https://imagemagick.org/script/convert.php"
    );
    await exists(
      "pdftk",
      "Install this tool: https://askubuntu.com/questions/1028522/how-can-i-install-pdftk-in-ubuntu-18-04-and-later"
    );
  });

program
  .command("stamp")
  .description('Stamps the pdf document')
  .requiredOption("-i, --input <inputPdfPath>", "Input document, e.g: file.pdf")
  .requiredOption(
    "-s, --signature <signaturePath>",
    "Signature file, e.g: signature.png"
  )
  .option("-p, --page <pageNum>", "Page to input the signature, e.g: 3")
  .option(
    "-o, --output <outputPdfPath>",
    "Output stamped document, e.g: out.pdf"
  )
  .option(
    "-l, --left <leftAmount>",
    "Signature position from left (px), e.g: 120"
  )
  .option(
    "-b, --bottom <bottomAmount>",
    "Signature position from bottom (px), e.g: 120"
  )
  .option("-z, --zoom <zoomPercent>", "Signature zoom percentage (%), e.g: 20")
  .action(async (args) => {
    const TEMP_SIG_PDF = MakeTmpPath("signature-") + ".pdf";
    const TEMP_PAGE_PRE_SIGN_PDF = MakeTmpPath("page-pre-sign-") + ".pdf";
    const TEMP_PAGE_SIGNED_PDF = MakeTmpPath("page-signed-") + ".pdf";

    const INPUT_PDF = args.input;
    const INPUT_SIGNATURE_FILE = args.signature;

    const defaults = {
      page: 1,
      output: "output.pdf",
      left: 0,
      bottom: 0,
      zoom: 100,
    };

    const PAGE_NUM = +(args.page || defaults.page);
    const OUTPUT_PDF = args.output || defaults.output;
    const MOVE_LEFT = args.left || defaults.left;
    const MOVE_BOTTOM = args.bottom || defaults.bottom;
    const ZOOM = args.zoom || defaults.zoom;

    try {
      // Get Page count
      const res = sh
        .exec(`pdftk "${INPUT_PDF}" dump_data`, { silent: true })
        .toString();
      const pageCount = +res.split("NumberOfPages: ").pop().split("\n").shift();
      if (PAGE_NUM > pageCount) {
        throw "--page must be <= the number of pages in the input document";
      }

      await Promise.all([
        // Make signature pdf
        execCmd(
          `convert "${INPUT_SIGNATURE_FILE}" -resize ${ZOOM}% -transparent white -page a4+${MOVE_LEFT}+${MOVE_BOTTOM} -quality 75 "${TEMP_SIG_PDF}"`
        ),
        // Pull out single page
        execCmd(
          `pdftk A="${INPUT_PDF}" cat A${PAGE_NUM} output "${TEMP_PAGE_PRE_SIGN_PDF}"`
        ),
      ]);
      // Stamp page
      await execCmd(
        `pdftk "${TEMP_PAGE_PRE_SIGN_PDF}" stamp "${TEMP_SIG_PDF}" output "${TEMP_PAGE_SIGNED_PDF}"`
      );
      // Combine to original pdf
      function joinDash(a, b) {
        return [a, b].filter((a) => !!a).join("-");
      }
      const start1 = PAGE_NUM == 1 ? "" : "A1";
      const start2 = PAGE_NUM <= 2 ? "" : `${PAGE_NUM - 1}`;

      const end1 = PAGE_NUM == pageCount ? "" : `A${PAGE_NUM + 1}`;
      const end2 = PAGE_NUM > pageCount - 2 ? "" : `${pageCount}`;

      catCommand = `${joinDash(start1, start2)} B1 ${joinDash(end1, end2)}`;
      await execCmd(
        `pdftk A="${INPUT_PDF}" B="${TEMP_PAGE_SIGNED_PDF}" cat ${catCommand} output "${OUTPUT_PDF}"`
      );
    } catch (err) {
      console.log(chalk.red(err));
    }

    await Promise.all([
      RemoveFile(TEMP_SIG_PDF),
      RemoveFile(TEMP_PAGE_PRE_SIGN_PDF),
      RemoveFile(TEMP_PAGE_SIGNED_PDF),
    ]);
  });

function RemoveFile(filePath) {
  return new Promise((res, rej) => {
    rimraf(filePath, (err) => {
      if (err) {
        rej(err);
      } else {
        res();
      }
    });
  });
}

function MakeTmpPath(fname) {
  const UUID = Math.random().toString(32).slice(2, 10);
  return path.join(os.tmpdir(), fname + UUID);
}

program.parse(process.argv);
