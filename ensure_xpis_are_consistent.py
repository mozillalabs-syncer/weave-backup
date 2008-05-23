import sys
import zipfile

if __name__ == "__main__":
    args = sys.argv[1:]
    if len(args) < 2:
        print "usage: %s <file1.xpi> <file2.xpi> ... [fileN.xpi]"
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
