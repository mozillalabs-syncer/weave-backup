"""
    This module will, upon importation, ensure that nose can be
    imported.  If nose isn't currently installed system-wide, it will
    fetch its tarball, unpack it to the current directory, and add
    its directory to sys.path.
"""

import sys
import os
import urllib2
import subprocess
import tarfile
from StringIO import StringIO

NOSE_BASE_NAME = "nose-0.10.3"
NOSE_TARBALL_NAME = "%s.tar.gz" % NOSE_BASE_NAME
NOSE_URL = "http://www.somethingaboutorange.com/mrl/projects/nose/%s" % \
    NOSE_TARBALL_NAME

_local_install_path = os.path.join(os.path.abspath(os.getcwd()),
                                   NOSE_BASE_NAME)

def _install_nose_locally():
    """
    Download and 'install' nose locally by retrieving its tarball
    and unpacking it.
    """

    print "Please wait a moment while I install nose locally."
    print "Retrieving %s." % NOSE_URL
    tarball_data = urllib2.urlopen(NOSE_URL).read()
    print "Archive is %d bytes." % len(tarball_data)
    print "Extracting %s." % NOSE_TARBALL_NAME
    tarball = tarfile.open(name = NOSE_TARBALL_NAME,
                           fileobj = StringIO(tarball_data),
                           mode = "r:gz")
    tarball.extractall(".")

try:
    import nose
except ImportError:
    if not os.path.exists(_local_install_path):
        _install_nose_locally()
    sys.path.append(_local_install_path)
    try:
        import nose
    except ImportError:
        print "Something's wrong; I can't import the nose module."
        print ("You may want to try removing the '%s' directory " 
               "and re-running this script.") % NOSE_BASE_NAME
        sys.exit(1)
