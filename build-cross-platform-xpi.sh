#!/bin/bash -x

# This script builds a cross-platform XPI for Weave by simply
# extracting all .xpi files in the root Weave directory into the same
# directory; all files with the same name will be identical [1].  This
# directory is then zipped up into a new .xpi in the root directory
# called sync.xpi.
#
# The original platform-specific XPIs can be built by running
# './build.sh xpi' in the root Weave directory.  This will only create
# the XPI for the platform it's run on; the other platform-specific
# XPIs will need to be run on their respective platforms and moved
# over.
#
# Note that in the future, this process will be replaced by a Buildbot
# trigger or something much less hackish. :)
#
# [1] Er, they *should* be identical, assuming that all the XPIs are
# from the same prisitne HG revision.  TODO: Add some code that
# asserts this is the case.

rm -rf build
mkdir build
cd build
unzip ../*.xpi
zip -9 -ur ../sync.xpi *
cd ..
rm -rf build
