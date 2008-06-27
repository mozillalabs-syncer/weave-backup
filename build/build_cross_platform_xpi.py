#! /usr/bin/env python

# This script builds a cross-platform XPI for Weave by simply
# extracting all .xpi files in the root Weave directory into the same
# directory; all files with the same name will be identical.  This
# directory is then zipped up into a new .xpi in the root directory
# called sync.xpi.
#
# The original platform-specific XPIs can be built by running
# 'make xpi' in the root Weave directory.  This will only create
# the XPI for the platform it's run on; the other platform-specific
# XPIs will need to be run on their respective platforms and moved
# over.
#
# Note that in the future, this process will be replaced by a Buildbot
# trigger or something much less hackish. See #433927 for more thoughts
# on this.

import sys
import os
import glob
import subprocess
import zipfile
from cStringIO import StringIO
from distutils import dir_util

def call(*args):
    """
    Call the given command-line and ensure the result is successful.

    For instance:

      >>> call("python", "-c", "print 'hi there'")

    Alternatively, a single list can be passed in:

      >>> call(["python", "-c", "print 'hi there'"])

    An OSError will be raised if the operation wasn't successful:

      >>> call(["python", "-c", "priont 'hi there'"])
      Traceback (most recent call last):
      ...
      OSError: Subprocess failed: python -c priont 'hi there'
    """

    if isinstance(args[0], basestring):
        cmdline = args
    else:
        assert len(args) == 1
        cmdline = args[0]
    if subprocess.call(cmdline) != 0:
        raise OSError("Subprocess failed: %s" % " ".join(cmdline))

def nuke(path):
    """
    Destroys the given path if it exists; equivalent to the Unix shell
    command 'rm -rf'.
    """

    if os.path.exists(path):
        if os.path.isdir(path):
            dir_util.remove_tree(path)
        else:
            os.remove(path)

def ensure_jars_are_identical(jar1data, jar2data):
    jars = [zipfile.ZipFile(StringIO(jar1data), "r"),
            zipfile.ZipFile(StringIO(jar2data), "r")]
    not_in_jars = [
        [name
         for name in jars[1].namelist()
         if name not in jars[0].namelist()],
        [name
         for name in jars[0].namelist()
         if name not in jars[1].namelist()],
        ]
    inconsistencies = [name
                       for name in jars[0].namelist()
                       if name in jars[1].namelist() and 
                       jars[0].read(name) != jars[1].read(name)]
    if not_in_jars[0] or not_in_jars[1] or inconsistencies:
        print ("Jars in different platform-specific XPIs are not "
               "identical.")
        print not_in_jars[0]
        print not_in_jars[1]
        print inconsistencies
        sys.exit(1)

def ensure_xpis_are_consistent(canonical_xpi, src_xpis):
    canonical = zipfile.ZipFile(canonical_xpi, "r")
    for filename in src_xpis:
        zf = zipfile.ZipFile(filename, "r")
        inconsistencies = [name
                           for name in canonical.namelist()
                           if name in zf.namelist() and 
                           zf.read(name) != canonical.read(name)]
        if inconsistencies:
            actually_bad = []
            for ifilename in inconsistencies:
                if ifilename.endswith(".jar"):
                    print "Examining %s." % ifilename
                    ensure_jars_are_identical(
                        canonical.read(ifilename),
                        zf.read(ifilename)
                        )
                    print "Contents of jars are consistent."
                else:
                    actually_bad.append(ifilename)
            if actually_bad:
                print ("The following files are contained in two or more "
                       "platform-specific XPIs, yet are not identical:\n")
                print "\n".join(actually_bad)
                sys.exit(1)

def main():
    NEW_XPI = "sync.xpi"
    BUILD_DIR = "__temp_build"

    nuke(NEW_XPI)
    nuke(BUILD_DIR)

    src_xpis = glob.glob("*.xpi")
    print "Combining these XPIs into a platform-independent XPI:"
    print "\n".join(src_xpis)

    dir_util.mkpath(BUILD_DIR)
    for filename in src_xpis:
        call("unzip",
             # Update existing files and create new ones if needed.
             "-u",
             # Overwrite existing files without prompting.
             "-o",
             "%s" % filename,
             # Extract to the build dir.
             "-d", BUILD_DIR)

    print "Creating new XPI."
    os.chdir(BUILD_DIR)
    call(["zip",
          # Use optimal compression.
          "-9",
          # Travel the directory structure recursively.
          "-r",
          "../%s" % NEW_XPI] + os.listdir("."))
    os.chdir("..")
    dir_util.remove_tree(BUILD_DIR)

    print ("Ensuring the final XPI is consistent with its consitutent "
           "parts.")

    ensure_xpis_are_consistent(NEW_XPI, src_xpis)

    print "Success!"

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        import doctest
        doctest.testmod(verbose=True)
    else:
        main()
