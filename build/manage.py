import os
import sys
import xml.dom.minidom
import subprocess

TEST_DIRS = [os.path.join("tests", "unit"),
             os.path.join("tests", "system")]

def find_tests():
    tests = []
    for dirname in TEST_DIRS:
        testfiles = [os.path.join(dirname, filename)
                     for filename in os.listdir(dirname)
                     if (filename.startswith("test_") and
                         filename.endswith(".js"))]
        tests.extend(testfiles)
    return tests

def run_test(test):
    dirname = os.path.dirname(test)
    testname = os.path.splitext(os.path.basename(test))[0]
    print "%-25s: " % testname,
    result = subprocess.call(
        ["make",
         "-C", dirname,
         testname],
        stdout = subprocess.PIPE,
        stderr = subprocess.STDOUT
        )
    if result != 0:
        print "FAIL"
        logfile = os.path.join(dirname, testname + ".log")
        return open(logfile, "r").read()
    else:
        print "PASS"
        return None

def run_tests(tests = None):
    if not tests:
        tests = find_tests()
    errors = {}
    for test in tests:
        errors[test] = run_test(test)
    failed_tests = [test for test in tests
                    if errors[test] != None]
    for test in failed_tests:
        print "-" * 40
        print "Output of %s:" % test
        print
        print errors[test]
    if failed_tests:
        sys.exit(1)

if __name__ == "__main__":
    args = sys.argv[1:]
    if not args:
        print "usage: %s <command>" % sys.argv[0]
        print
        print "'command' can be one of the following:"
        print
        print "    test - run unit tests"
        print "    install - install to the given profile dir"
        print "    uninstall - uninstall from the given profile dir"
        print
        sys.exit(1)

    main = __import__("__main__")
    mydir = os.path.abspath(os.path.split(main.__file__)[0])

    path_to_extension_root = mydir

    cmd = args[0]
    
    if cmd == "test":
        run_tests()
    elif cmd in ["install", "uninstall"]:
        if len(args) != 2:
            print "Path to profile directory not supplied."
            sys.exit(1)
        profile_dir = args[1]

        rdf_path = os.path.join(path_to_extension_root, "install.rdf")
        rdf = xml.dom.minidom.parse(rdf_path)
        em_id = rdf.documentElement.getElementsByTagName("em:id")[0]
        extension_id = em_id.firstChild.nodeValue

        extension_file = os.path.join(profile_dir,
                                      "extensions",
                                      extension_id)
        files_to_remove = ["compreg.dat",
                           "xpti.dat"]
        for filename in files_to_remove:
            abspath = os.path.join(profile_dir, filename)
            if os.path.exists(abspath):
                os.remove(abspath)
        if os.path.exists(extension_file):
            os.remove(extension_file)
        if cmd == "install":
            fileobj = open(extension_file, "w")
            fileobj.write(path_to_extension_root)
            fileobj.close()
            print "Extension '%s' installed." % extension_id
        else:
            print "Extension '%s' uninstalled." % extension_id
    else:
        print "Unknown command '%s'" % cmd
        sys.exit(1)
