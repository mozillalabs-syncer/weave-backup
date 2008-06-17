import os
import sys
import xml.dom.minidom
import subprocess
import difflib

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
    logfile_name = os.path.join(dirname, testname + ".log")
    if result != 0:
        print "FAIL"
        return open(logfile_name, "r").read()
    else:
        expected_logfile_name = logfile_name + ".expected"
        if os.path.exists(expected_logfile_name):
            expected = open(expected_logfile_name, "r").read()
            actual = open(logfile_name, "r").read()
            if expected != actual:
                print "FAIL"
                diff = "Expected results differ from actual results.\n\n"
                diff += "\n".join(difflib.unified_diff(
                    expected.splitlines(), actual.splitlines(),
                    "expected results", "actual results"
                    ))
                return diff
        print "PASS"
        return None

def run_tests(testnames = None):
    tests = find_tests()
    if testnames:
        newtests = []
        for testname in testnames:
            for test in tests:
                if testname in test:
                    newtests.append(test)
        tests = newtests
    errors = {}
    if not tests:
        print "No tests found!"
        sys.exit(1)
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
        print "usage: %s <command> [options]" % sys.argv[0]
        print
        print "'command' can be one of the following:"
        print
        print "    test - run unit tests, optionally specifying tests to run"
        print "    install - install to the given profile dir"
        print "    uninstall - uninstall from the given profile dir"
        print
        sys.exit(1)

    main = __import__("__main__")
    mydir = os.path.abspath(os.path.split(main.__file__)[0])

    path_to_extension_root = mydir

    cmd = args[0]
    
    if cmd == "test":
        run_tests(args[1:])
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
