# pdfstamp
<!-- [START badges] -->
[![NPM Version](https://img.shields.io/npm/v/pdfstamp.svg)](https://www.npmjs.com/package/pdfstamp) 
[![License](https://img.shields.io/npm/l/pdfstamp.svg)](https://github.com/benwinding/pdfstamp/blob/master/LICENSE) 
[![Downloads/week](https://img.shields.io/npm/dm/pdfstamp.svg)](https://www.npmjs.com/package/pdfstamp) 
[![Github Issues](https://img.shields.io/github/issues/benwinding/pdfstamp.svg)](https://github.com/benwinding/pdfstamp)
<!-- [END badges] -->

Easily add image signatures like `signature.png` to an existing pdf.

## Features

- Perfectly preserves form fields and formatting 
- Can add to specific page in long PDF
- Can resize and position signature

## Get Started

1. Install this tool using:  `npm i -g pdfstamp`.
2. You need both: (`ImageMagick` and `pdftk`) Run `pdfstamp doctor` to see if you have them!

## Usage

```
Usage: pdfstamp [options] [command]

Options:
  -h, --help       display help for command

Commands:
  doctor           Checks to make sure your dependencies are installed
  stamp [options]  Stamps the pdf document
  help [command]   display help for command
```

#### Using as a JS lib
``` ts
import { stamp } from 'pdfstamp';

async function StampThat() {
  await stamp({
    signature: './signature.png',
    input: './sample.pdf',
    output: './output-example-lib.pdf'
  })
}
```

### Stamping

```
Usage: pdfstamp stamp [options]

Stamps the pdf document

Options:
  -i, --input <inputPdfPath>       Input document, e.g: file.pdf
  -s, --signature <signaturePath>  Signature file, e.g: signature.png
  -p, --page <pageNum>             Page to input the signature, default: 1 (default: 1)
  -o, --output <outputPdfPath>     Output stamped document, default: output.pdf (default: "output.pdf")
  -l, --left <leftAmount>          Signature position from page left (px), e.g: 120
  -r, --right <rightAmount>        Signature position from page right (px), e.g: 120
  -t, --top <topAmount>            Signature position from page top (px), e.g: 120
  -b, --bottom <bottomAmount>      Signature position from page bottom (px), e.g: 120
  -z, --zoom <zoomPercent>         Signature zoom percentage on page (100% is full pagewidth), default: 25 (default: 25)
  --debug                          Keeps temporary PDF files (for development purposes)
  -h, --help                       display help for command
```

### Example

```
pdfstamp stamp \                                                                                                      
--input ./input.pdf \                                                                                  
--signature ./signature.png \                                                      
--output ./output.pdf \                                
--page 2 \                       
--bottom 300 \
--left 200
```

![output](https://i.imgur.com/HHBtG2l.png)
