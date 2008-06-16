About the Weave test suite

Part 1: Setting up your environment to run the tests.

To run these tests, you'll need the latest Gecko SDK installed.  It can be downloaded from http://ftp.mozilla.org/pub/mozilla.org/xulrunner/nightly/latest-trunk/

Now you'll need to set up your environment variables as follows:

1. Add xulrunner-sdk/bin to your PATH
2. set MOZSDKDIR to the location of xulrunner-sdk
3. set TOPSRCDIR to the location of the top-level weave source code directory.
4. set NATIVE_TOPSRCDIR to the location of the top-level weave source code directory, but expressed in the platform native format.  On Unix or Mac OS X this will be identical to TOPSRCDIR, but on Windows, NATIVE_TOPSRCDIR should be a Windows-style path to the same directory, with backslashes for separators.

On Mac OS X, my ~/.profile looks like this, in part:

        export PATH=$PATH:/opt/local/bin:~/xulrunner-sdk/bin
        export MOZSDKDIR=~/xulrunner-sdk
        export TOPSRCDIR=~/weave
        export NATIVE_TOPSRCDIR=~/weave

Part 2:  Running the tests.

weave/tests/unit contains unit tests, i.e. high-granularity tests for functionality of functions and classes in the weave modules.

weave/tests/system contains system tests, i.e. end-to-end tests of weave as a whole.

To run the tests, cd into weave/tests/unit or weave/tests/system and run "make".

To run one particular test only, you can give the name of the test file (without the .js suffix) as an argument to make.  For instance, to run just the test in test_xmpp.js and no others, run:

        > make test_xmpp

The output is put into a file test_xmpp.log, so if the test fails you can take a look at the logfile to see what went wrong.

Part 3: Adding tests.

Simply create a javascript file with a name that starts with "test_" in the weave/tests/unit or weave/tests/system directory.  For example:

        test_foo.js

Each file can contain any number of functions that start with the string 'test', e.g.:

        function test_that_foo_accepts_multiple_args() {
        }

Such functions will be found and run automatically, and if any of them throw exceptions, they will be counted as failed tests.

Alternatively, the file can contain a single function called 'run_test' like so:

        function run_test() {
        }

If this function exists, it will be run instead of functions that begin with the string 'test'.  This functionality is included for backwards compatibility.

If the name of the file and the name of the function(s) match the patterns outlined above, all tests will automatically be detected and run when you execute "make".  No modification to the makefile is needed.

Functions that you can use within tests to make assertions include the following:

        do_check_eq( a, b );    // asserts that a and b are equal
        do_check_neq( a, b );  // asserts that a and b are not equal
        do_check_true( cond ); // asserts that condition is true
        do_check_false( cond ); // asserts that condition if false
        do_throw( text );  // makes the test fail and logs the given text

More useful functions can be found in weave/tests/harness/head.js.

Weave modules that you want to test can be imported using Components.utils:

        Components.utils.import( "resource://weave/xmpp/xmppClient.js" );

Note that "resource://weave" in the above URL is mapped to the directory weave/modules.  So the line above actually imports the module which is located on my disk at:

        ~/weave/modules/xmpp/xmppClient.js
