#!/bin/bash -x

function error() {
  echo $*
  exit 1
}

[[ -z "$MOZSDKDIR" ]] && error "Gecko SDK directory (MOZSDKDIR) not set"

# Create files from .in, with substitutions below

substitutions="unpacked jar"
unpacked=
jar="# "

if [[ "x$1" == xxpi ]]; then
    unpacked="# "
    jar=
fi

for in in `find . -type f -name \*.in`; do
    out=`echo $in | sed 's/\.in$//'`
    cp $in $out
    for subst in $substitutions; do
        sed -e "s/@$subst@/${!subst}/g" $out > $out.tmp
        mv $out.tmp $out
    done
done

# Build the XPCOM components

cd src
make test-install
[[ $? -eq 0 ]] || error "Could not build XPCOM component, aborting."
cd ..

cd tests/unit
make all
[[ $? -eq 0 ]] || error "Test failed"
cd -

# Quit now unless we're building an XPI
[[ "x$1" == xxpi ]] || exit 0

# Build XPI

cd chrome
zip -9 -ur sync.jar *
cd ..
zip -9 -ur sync.xpi chrome/sync.jar defaults modules openssl install.rdf chrome.manifest
