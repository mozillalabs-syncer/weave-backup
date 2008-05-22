#!/bin/bash -x

function error() {
  echo $*
  exit 1
}

[[ -z "$MOZSDKDIR" ]] && error "Gecko SDK directory (MOZSDKDIR) not set"

# Substitutions for .in files

substitutions="unpacked jar buildid"
unpacked=
jar="# "
buildid=${WEAVE_BUILDID}

if [[ "x$1" == xxpi ]]; then
    unpacked="# "
    jar=
fi

if [ -z "$buildid" ]; then
    buildid=`hg tip 2>/dev/null | grep ^changeset | awk '{print $2}' | awk -F: '{print $1}'`
fi
[ -z "$buildid" ] && error "Could not determine build id. Install hg or set WEAVE_BUILDID the checkout id"

# Find any .in files and process them to set substitutions above

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
zip -9 -ur sync-`uname -s`.xpi chrome/sync.jar defaults modules openssl install.rdf chrome.manifest
