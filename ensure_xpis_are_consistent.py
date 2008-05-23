"""
    This script tries to ensure that the XPIs passed to it are
    consistent with each other.  It does this by treating the first
    XPI as a "canonical" XPI, and ensuring that all common files
    between the canonical XPI and the rest of the XPIs are
    identical to one another.
"""

import sys
import zipfile

if __name__ == "__main__":
    args = sys.argv[1:]
    if len(args) < 2:
        print "usage: %s <canonical-xpi> <file-1> ... [file-N]"
        sys.exit(1)

    canonical = zipfile.ZipFile(args[0], "r")
    for filename in args[1:]:
        zf = zipfile.ZipFile(filename, "r")
        inconsistencies = [name for name in canonical.namelist()
                           if name in zf.namelist() and 
                           zf.read(name) != canonical.read(name)]
        if inconsistencies:
            print "Inconsistent collisions found!"
            print "\n".join(inconsistencies)
            sys.exit(1)
    print "All files are consistent."
