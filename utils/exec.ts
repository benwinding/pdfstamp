import { spawn, exec, ChildProcess } from "child_process";
import chalk from "chalk";
import stream from "stream";

module.exports = {
  execCmd,
  execCmdResult,
};

async function execCmd(cmd: string, opts?: { cwd: any; }) {
  const directory = typeof opts !=='undefined' && opts.cwd;
  printCommand(cmd, directory);
  let output = "";
  let outputErr = "";

  const stdout = new stream.Writable();
  let child: ChildProcess;
  stdout._write = function (data) {
    output += data;
    // process.stdout.write(data);
  };
  const stderr = new stream.Writable();
  stderr._write = function (data) {
    outputErr += data;
    // process.stderr.write(data);
  };
  child = spawn(cmd, [], { cwd: directory, shell: true, stdio: "inherit" });
  child.stdout && child.stdout.pipe(stdout);
  child.stderr && child.stderr.pipe(stderr);

  return new Promise((resolve, reject) => {
    child.on("close", (code) => {
      if (code != 0) {
        reject(outputErr);
      } else {
        resolve(output);
      }
    });
  });
}

async function execCmdResult(cmd: string, opts?: { cwd: any; }) {
  const directory = typeof opts !=='undefined' && opts.cwd;
  printCommand(cmd, directory);
  const output: any[] = [];
  const outputErr: any[] = [];

  const stdout = new stream.Writable();
  stdout._write = function (data) {
    // process.stdout.write(data);
    output.push(data);
  };
  const stderr = new stream.Writable();
  stderr._write = function (data) {
    // process.stderr.write(data);
    outputErr.push(data);
  };
  const child = exec(cmd, { cwd: directory });
  child.stdout && child.stdout.pipe(stdout);
  child.stderr && child.stderr.pipe(stderr);

  return new Promise((resolve, reject) => {
    child.on("close", (code) => {
      if (code != 0) {
        reject(outputErr.join());
      } else {
        setTimeout(() => {
          resolve(output);
        }, 1000);
      }
    });
  });
}

function printCommand(cmd: string, directory: any) {
  console.log(
    chalk.grey(
      `running $ ${cmd}`,
      directory ? `\n(in dir: [${directory}])` : undefined
    )
  );
}
export { execCmd, execCmdResult };