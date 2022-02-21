import { stamp } from '../dist';

async function main() {
  await stamp({
    signature: './signature.png',
    input: './sample.pdf',
    output: './output-example-lib.pdf'
  })
}

main();
