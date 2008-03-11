#!/bin/bash -x

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

if [[ ! "x$1" == xxpi ]]; then
    exit 0;
fi

cd chrome
zip -9 -ur sync.jar *
cd ..
zip -9 -ur sync.xpi chrome/sync.jar defaults modules openssl install.rdf chrome.manifest
