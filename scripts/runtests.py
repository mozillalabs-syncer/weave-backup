import os
import sys
import difflib
import unittest
import subprocess
import distutils.file_util

import getnose
import nose.plugins
import nose.plugins.builtin

class JsTest(nose.plugins.Plugin):
    def options(self, parser, env=os.environ):
        nose.plugins.Plugin.options(self, parser, env)
        parser.add_option("--revalidate-log", action="store_true",
                          dest="revalidate_log",
                          default=False,
                          help="For all tests run, makes their logs "
                          "the expected, or canonical, log file to "
                          "which all future runs of the tests are "
                          "compared to.")

    def configure(self, options, config):
        nose.plugins.Plugin.configure(self, options, config)
        self.revalidate_log = options.revalidate_log

    def wantFile(self, file):
        basename = os.path.basename(file)
        ext = os.path.splitext(file)[1]
        if (basename.startswith("test_") and ext == ".js"):
            return True
        # Oddly enough, if we return 'False' here instead of 'None',
        # none of the other plugins get a chance to test the file.
        return None

    def loadTestsFromFile(self, filename):
        return [JsTestCase(filename, self.revalidate_log)]

class JsTestCase(unittest.TestCase):
    def __init__(self, test, revalidate_log):
        self.__test = test
        self.__revalidate_log = revalidate_log
        unittest.TestCase.__init__(self)

    def shortDescription(self):
        return os.path.basename(os.path.splitext(self.__test)[0])

    def runTest(self):
        test = self.__test
        dirname = os.path.dirname(test)
        testname = os.path.splitext(os.path.basename(test))[0]
        result = subprocess.call(
            ["make",
             "-C", dirname,
             testname],
            stdout = subprocess.PIPE,
            stderr = subprocess.STDOUT
            )
        logfile_name = os.path.join(dirname, testname + ".log")
        if result != 0:
            self.fail(open(logfile_name, "r").read())
        else:
            expected_logfile_name = logfile_name + ".expected"
            if self.__revalidate_log:
                distutils.file_util.copy_file(logfile_name,
                                              expected_logfile_name)
            if os.path.exists(expected_logfile_name):
                expected = open(expected_logfile_name, "r").read()
                actual = open(logfile_name, "r").read()
                if expected != actual:
                    diff = "Expected results differ from actual results.\n\n"
                    diff += "\n".join(difflib.unified_diff(
                        expected.splitlines(), actual.splitlines(),
                        "expected results", "actual results"
                        ))
                    self.fail(diff)

if __name__ == "__main__":
    sys.argv.append("--with-jstest")
    nose.main(defaultTest=["scripts",
                           "tests/unit",
                           "tests/system"],
              plugins=[JsTest()])
