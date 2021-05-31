const { spawn, exec } = require("child_process");
const chalk = require("chalk");
const stream = require("stream");

module.exports = {
  execCmd,
  execCmdResult,
};

async function execCmd(cmd, opts) {
  const directory = opts && opts.cwd;
  printCommand(cmd, directory);
  let output = "";
  let outputErr = "";

  const stdout = new stream.Writable();
  let child;
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

async function execCmdResult(cmd, opts) {
  const directory = opts && opts.cwd;
  printCommand(cmd, directory);
  const output = [];
  const outputErr = [];

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
          resolve(output.join());
        }, 1000);
      }
    });
  });
}

function printCommand(cmd, directory) {
  console.log(
    chalk.grey(
      `running $ ${cmd}`,
      directory ? `\n(in dir: [${directory}])` : undefined
    )
  );
}
