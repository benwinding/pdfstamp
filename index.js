#!/usr/bin/env node

const program = require("commander");
const chalk = require("chalk");
const os = require("os");
const rimraf = require("rimraf");
const path = require("path");
const sh = require("shelljs");
const { execCmd, execCmdResult } = require("./utils/exec");
const sig = require("./utils/signature-utils");

var IS_DEBUG = false;
function log(...args) {
  IS_DEBUG && console.log('DEBUG: ', ...args);
}

async function exists(commandName, installTxt) {
  const valid = await execCmdResult(`which ${commandName}`)
    .then(() => true)
    .catch(() => false);
  const resultText = valid ? chalk.green("exists!") : chalk.red("not found");
  log(`- checking ${commandName}: ${resultText}`);
  if (!valid) {
    log(chalk.blue(installTxt));
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
  .option("-p, --page <pageNum>", "Page to input the signature, default: 1", 1)
  .option(
    "-o, --output <outputPdfPath>",
    "Output stamped document, default: output.pdf",
    "output.pdf"
  )
  .option(
    "-l, --left <leftAmount>",
    "Signature position from page left (px), e.g: 120"
  )
  .option(
    "-r, --right <rightAmount>",
    "Signature position from page right (px), e.g: 120"
  )
  .option(
    "-t, --top <topAmount>",
    "Signature position from page top (px), e.g: 120"
  )
  .option(
    "-b, --bottom <bottomAmount>",
    "Signature position from page bottom (px), e.g: 120"
  )
  .option("-z, --zoom <zoomPercent>", "Signature zoom percentage on page (100% is full pagewidth), default: 25", 25)
  .option(
    "--debug",
    "Keeps temporary PDF files (for development purposes)"
  )
  .action(async (args) => {
    IS_DEBUG = args.debug;
    const TEMP_SIG_PDF = MakeTmpPath("signature") + ".pdf";
    const TEMP_PAGE_PRE_SIGN_PDF = MakeTmpPath("page-pre-sign") + ".pdf";
    const TEMP_PAGE_SIGNED_PDF = MakeTmpPath("page-signed-single") + ".pdf";
    const TEMP_NORMALISED_SIGNATURE_FILE = MakeTmpPath("signature-normalised") + ".png";

    const TempFiles = [
      TEMP_SIG_PDF,
      TEMP_PAGE_PRE_SIGN_PDF,
      TEMP_PAGE_SIGNED_PDF,
      TEMP_NORMALISED_SIGNATURE_FILE,      
    ];

    const INPUT_PDF = args.input;
    const INPUT_SIGNATURE_FILE = args.signature;

    const defaults = {
      left: 0,
      bottom: 0,
      right: 0,
      top: 0,
    };

    const SIGNATURE_WIDTH = 500;

    const PAGE_NUM = +(args.page);
    const OUTPUT_PDF = args.output;
    const ZOOM = +(args.zoom);

    try {
      // Get Page count
      const pageCount = GetPageCount(INPUT_PDF, PAGE_NUM);
      await NormaliseSignatureGetPath(INPUT_SIGNATURE_FILE, TEMP_NORMALISED_SIGNATURE_FILE, SIGNATURE_WIDTH)

      function MakeSignatureCommand() {
        // TODO add pagesize option
        function GetOrientation() {
          const MOVE_RIGHT = args.right || defaults.right;
          const MOVE_LEFT = args.left || defaults.left;
          const IS_LEFT = args.right === undefined;
          const MOVE_BOTTOM = args.bottom || defaults.bottom;
          const MOVE_TOP = args.top || defaults.top;
          const IS_BOTTOM = args.top === undefined;
          return sig.CalculateOrientation(IS_BOTTOM, IS_LEFT, MOVE_LEFT, MOVE_RIGHT, MOVE_TOP, MOVE_BOTTOM);
        }
        const pageWidth = 590;
        const zoomSig = sig.CalculateZoom(ZOOM, pageWidth, SIGNATURE_WIDTH).toFixed(3);
        const orientation = GetOrientation();
        const translationFragment = `-page a4-${orientation.x}-${orientation.y}`;
        log('Zoom: ', { zoomSig, orientation, pageWidth });
        // More info on imagemagick commands here: https://imagemagick.org/script/command-line-options.php#page
        const cmd = `convert "${TEMP_NORMALISED_SIGNATURE_FILE}" -gravity ${orientation.gravity} -resize ${zoomSig}% -transparent white ${translationFragment} -quality 75 "${TEMP_SIG_PDF}"`;
        log('Signature CMD: ', cmd);
        return cmd;
      }

      await Promise.all([
        // Make signature pdf
        execCmd(MakeSignatureCommand()),
        // Pull out single page
        execCmd(`pdftk A="${INPUT_PDF}" cat A${PAGE_NUM} output "${TEMP_PAGE_PRE_SIGN_PDF}"`),
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

    if (IS_DEBUG) {
      const debugDir = './_pdf-stamp-temp';
      sh.mkdir('-p', debugDir);
      await execCmd(`mv ${TempFiles.map(f => `"${f}"`).join(' ')} ${debugDir}`)
    }

    await Promise.all(TempFiles.map(f => RemoveFile(f)));
  });

async function NormaliseSignatureGetPath(inputSignaturePath, outputPath, width) {
  await execCmd(`convert ${inputSignaturePath} -set colorspace sRGB -resize '${width}x${width}' "${outputPath}"`)
}

function GetPageCount(inputPdfPath, pageNum) {
  const res = sh
    .exec(`pdftk "${inputPdfPath}" dump_data`, { silent: true })
    .toString();
  if (!res.includes("NumberOfPages")) {
    throw `There was a problem reading the input PDF "${inputPdfPath}"`;
  }
  const pageCount = +res.split("NumberOfPages: ").pop().split("\n").shift();
  if (pageNum > pageCount) {
    throw "--page must be <= the number of pages in the input document";
  }
  if (pageNum < 1) {
    throw "--page must be > 0";
  }
  return pageCount;
}

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

const UUID = Math.random().toString(32).slice(2, 10);
function MakeTmpPath(fname) {
  return path.join(os.tmpdir(), UUID + '-' + fname);
}

program.parse(process.argv);
