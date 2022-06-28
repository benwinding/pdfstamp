#!/usr/bin/env node

import program from "commander";
import chalk from "chalk";
import os, { type } from "os";
import path from "path";
import rimraf from "rimraf";
import sh from "shelljs";
import { execCmd, execCmdResult } from "./utils/exec"
import { CalculateZoom, CalculateOrientation } from "./utils/signature-utils";

var IS_DEBUG = false;
function log(...args: any[]) {
  IS_DEBUG && console.debug(...args);
}

async function exists(commandName: string, expect: string, installTxt: string) {
  let progs, valid, which = 'which', chalkText: string;
  if(os.platform() === 'win32') { which = 'where'; }
  progs = await execCmdResult(`${which} ${commandName}`)
  const asExpected = (out: unknown) => {
    return typeof out === 'string' && out.includes(expect) || typeof out === 'object' && Array.isArray(out) && out.some((o: string) => o.includes(expect))
  }
  valid = progs instanceof Promise && progs.then(
    //foreach res as prog, check if executing 'prog --version' contains the expected string
    async (res: unknown) => {
      if (typeof res === 'object' && Array.isArray(res)) {
        for (let prog of res) {
          if (await execCmdResult(`${prog} --version`).then(asExpected).catch(() => false)){ return true; }
        }
        return false;
      } else if(typeof res === 'string') {
        return execCmdResult(`${res} --version`).then(asExpected).catch(() => false);
      }
    }
  ).catch(() => false);
  chalkText = valid ? chalk.green("exists!") : chalk.red("not found");
  log(`- checking ${commandName}: ${chalkText}`);
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
      "ImageMagick Studio LLC",
      "Install this tool: https://imagemagick.org/script/convert.php"
    );
    await exists(
      "pdftk",
      "a Handy Tool for Manipulating PDF Documents",
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
  .option("-p, --page <pageNum>", "Page to input the signature, default: 1", '1')
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
  .option("-z, --zoom <zoomPercent>", "Signature zoom percentage on page (100% is full pagewidth), default: 25", '25')
  .option(
    "--debug",
    "Keeps temporary PDF files (for development purposes)"
  )
  .action((args) => {
    return stamp(args);
  });

type StampArgs = {
  input: string,
  signature: string,
  output?: string,

  debug?: boolean,
  bottom?: string,
  left?: string,
  right?: string,
  top?: string,
  page?: string,
  pageSize?: string,
  zoom?: string,
}

export async function stamp({
  debug,
  bottom,
  left,
  right,
  top,
  input,
  output,
  page,
  pageSize,
  signature,
  zoom,
}: StampArgs) {
  IS_DEBUG = !!debug;
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

  const INPUT_PDF = input;
  const INPUT_SIGNATURE_FILE = signature;

  const defaults = {
    left: 0,
    bottom: 0,
    right: 0,
    top: 0,
  };

  const SIGNATURE_WIDTH = 500;

  const PAGE_NUM = +(page || 1);
  const PAGE_SIZE = pageSize;
  const OUTPUT_PDF = output || "output.pdf";
  const ZOOM = +(zoom || 25);

  try {
    // Get Page count
    const pdfDataDump = GetPdfDataString(INPUT_PDF);
    const pageCount = GetPageCount(pdfDataDump, PAGE_NUM);
    const pageSize = GetPageSize(pdfDataDump, PAGE_NUM);
    await NormaliseSignatureGetPath(INPUT_SIGNATURE_FILE, TEMP_NORMALISED_SIGNATURE_FILE, SIGNATURE_WIDTH)

    const MakeSignatureCommand = () => {
      // TODO add pagesize option
      function GetOrientation() {
        const MOVE_RIGHT = +(right || 0) || defaults.right;
        const MOVE_LEFT = +(left || 0) || defaults.left;
        const IS_LEFT = right === undefined;
        const MOVE_BOTTOM = +(bottom || 0) || defaults.bottom;
        const MOVE_TOP = +(top || 0) || defaults.top;
        const IS_BOTTOM = top === undefined;
        return CalculateOrientation(IS_BOTTOM, IS_LEFT, MOVE_LEFT, MOVE_RIGHT, MOVE_TOP, MOVE_BOTTOM);
      }
      const pageWidth = +pageSize.width;
      const zoomSig = CalculateZoom(ZOOM, pageWidth, SIGNATURE_WIDTH).toFixed(3);
      const orientation = GetOrientation();
      const size = `${pageSize.width}x${pageSize.height}`; // a4
      const translationFragment = `-page ${size}-${orientation.x}-${orientation.y}`;
      log('Zoom: ', { zoomSig, orientation, pageWidth, pageSize });
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
    const joinDash = (a: string, b: string): string => {
      return [a, b].filter((a) => !!a).join("-");
    }
    const start1 = PAGE_NUM == 1 ? "" : "A1";
    const start2 = PAGE_NUM <= 2 ? "" : `${PAGE_NUM - 1}`;

    const end1 = PAGE_NUM == pageCount ? "" : `A${PAGE_NUM + 1}`;
    const end2 = PAGE_NUM > pageCount - 2 ? "" : `${pageCount}`;

    const catCommand = `${joinDash(start1, start2)} B1 ${joinDash(end1, end2)}`;
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
}

async function NormaliseSignatureGetPath(inputSignaturePath: string, outputPath: string, width: number) {
  await execCmd(`convert ${inputSignaturePath} -set colorspace sRGB -resize '${width}x${width}' "${outputPath}"`)
}

function GetPdfDataString(inputPdfPath: string) {
  const res = sh
    .exec(`pdftk "${inputPdfPath}" dump_data`, { silent: true })
    .toString();
  if (!res.includes("NumberOfPages")) {
    throw `There was a problem reading the input PDF "${inputPdfPath}"`;
  }
  return res;
}

function GetPageCount(pdfDataDump: string, pageNum: number) {
  const pageCount = +(pdfDataDump?.split("NumberOfPages: ")?.pop()?.split("\n")?.shift() || '');
  if (pageNum > pageCount) {
    throw "--page must be <= the number of pages in the input document";
  }
  if (pageNum < 1) {
    throw "--page must be > 0";
  }
  return pageCount;
}

function GetPageSize(pdfDataDump: string, pageNum: number): {
  width: string,
  height: string
} {
  const pages = pdfDataDump?.split('\nPageMediaNumber: ');
  const page = pages.find(p => p.startsWith(pageNum + ''));
  const pageSizePre = page?.split('\n').find(p => p.startsWith('PageMediaDimensions: ')) || '';
  const pageSizeString = pageSizePre.replace("PageMediaDimensions: ", '');
  const pageSize = {
    width: pageSizeString.split(' ').shift() || '',
    height: pageSizeString.split(' ').pop() || '',
  }
  log('Get Page Size (from pdf_dump)', { pages, pageNum, pageSizeString, pageSize })
  return pageSize;
}

function RemoveFile(filePath: string) {
  return new Promise((res, rej) => {
    rimraf(filePath, (err) => {
      if (err) {
        rej(err);
      } else {
        res(undefined);
      }
    });
  });
}

const UUID = Math.random().toString(32).slice(2, 10);
function MakeTmpPath(fname: string) {
  return path.join(os.tmpdir(), UUID + '-' + fname);
}

import packageJson from './package.json';

program
  .option('-v, --version', 'Displays version')
  .action(async () => {
    console.log(packageJson.version);
  });

if (process.argv.length < 3) {
  program.help()
} else {
  program.parse(process.argv);
}
