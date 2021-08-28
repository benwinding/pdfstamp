#!/bin/sh
# Make sure you've installed according to README in folder above

pdfstamp stamp --debug -i ./sample.pdf -s ./signature2.png -l 100 -b 100 -z 25 -p 1 -o ./output-bl.pdf
pdfstamp stamp --debug -i ./sample.pdf -s ./signature2.png -r 10 -t 10 -z 25 -p 1 -o ./output-tr.pdf
