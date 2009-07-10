#!/bin/sh

function error() {
  [ -z "$1" ] || echo $1
  echo "Usage: $0: <x86 sdkdir> <ppc sdkdir> <destination dir>"
  exit 1
}

[ -z "$3" ] && error ""
[ -d "$1" ] || error "i386 sdk directory does not exist"
[ -d "$2" ] || error "ppc sdk directory does not exist"
[ -d "$3" ] && error "destination (universal) sdk directory already exists"

cp -r $1 $3

for i in $(ls $1/lib); do
  lipo -create -output $3/lib/$i -arch ppc $2/lib/$i -arch i386 $1/lib/$i
done

for i in $(ls $1/bin); do
  lipo -create -output $3/bin/$i -arch ppc $2/bin/$i -arch i386 $1/bin/$i
done
