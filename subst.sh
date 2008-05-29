#!/bin/bash

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
