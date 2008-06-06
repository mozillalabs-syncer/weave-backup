"""
    Simple script to test Weave server support and ensure that it
    works properly.
"""

import sys
import urllib
import urllib2
import httplib

import json

DEFAULT_SERVER = "sm-labs01.mozilla.org:81"
DEFAULT_REALM = "services.mozilla.com - proxy"

class DavRequest(urllib2.Request):
    def __init__(self, method, *args, **kwargs):
        urllib2.Request.__init__(self, *args, **kwargs)
        self.__method = method

    def get_method(self):
        return self.__method

class WeaveSession(object):
    def __init__(self, username, password, server = DEFAULT_SERVER,
                 realm = DEFAULT_REALM):
        self.username = username
        self.server = server
        self.realm = realm
        self.__password = password
        self._make_opener()

    def _make_opener(self):
        authHandler = urllib2.HTTPBasicAuthHandler()
        authHandler.add_password(self.realm,
                                 self.server,
                                 self.username,
                                 self.__password)
        self.__opener = urllib2.build_opener(authHandler)

    def _get_user_url(self, path):
        if path.startswith("/"):
            path = path[1:]
        url = "https://%s/user/%s/%s" % (self.server,
                                         self.username,
                                         path)
        return url

    def _enact_dav_request(self, request):
        try:
            self.__opener.open(request)
        except urllib2.HTTPError, e:
            if e.code not in (httplib.CREATED,
                              httplib.ACCEPTED,
                              httplib.NO_CONTENT):
                raise

    def create_dir(self, path):
        req = DavRequest("MKCOL", self._get_user_url(path))
        self._enact_dav_request(req)

    def remove_dir(self, path):
        if not path[-1] == "/":
            path += "/"
        self.delete_file(path)

    def get_file(self, path):
        obj = self.__opener.open(self._get_user_url(path))
        return obj.read()

    def put_file(self, path, data):
        req = DavRequest("PUT", self._get_user_url(path), data)
        self._enact_dav_request(req)

    def delete_file(self, path):
        req = DavRequest("DELETE", self._get_user_url(path))
        self._enact_dav_request(req)

    def share_with_users(self, path, users):
        url = "https://%s/share/" % (self.server)
        cmd = {"version" : 1,
               "directory" : path,
               "share_to_users" : users}
        postdata = urllib.urlencode({"cmd" : json.write(cmd)})
        req = urllib2.Request(url, postdata)
        result = self.__opener.open(req)
        print result.read()

def test_weave_disallows_php(session):
    session.put_file("phptest.php", "<?php echo 'hai2u!' ?>")
    try:
        if session.get_file("phptest.php") == "hai2u!":
            raise Exception("Weave server allows PHP execution!")
    finally:
        session.delete_file("phptest.php")

if __name__ == "__main__":
    args = sys.argv[1:]
    if len(args) < 2:
        print "usage: %s <username> <password>" % sys.argv[0]
        sys.exit(1)

    username = args[0]
    password = args[1]
    session = WeaveSession(username, password)

    print "Creating directory."
    session.create_dir("blargle")

    print "Creating temporary file."
    session.put_file("blargle/bloop", "hai2u!")
    assert session.get_file("blargle/bloop") == "hai2u!"
    session.delete_file("blargle/bloop")

    print "Removing directory."
    session.remove_dir("blargle")

    # Share the public directory with all users.
    session.share_with_users("public", "all")

    test_weave_disallows_php(session)

    print "Test complete."
