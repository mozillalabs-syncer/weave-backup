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

    def _get_user_url(self, path, user = None):
        if not user:
            user = self.username
        if path.startswith("/"):
            path = path[1:]
        url = "https://%s/user/%s/%s" % (self.server,
                                         user,
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

    def get_file(self, path, user = None):
        obj = self.__opener.open(self._get_user_url(path, user))
        return obj.read()

    def put_file(self, path, data):
        req = DavRequest("PUT", self._get_user_url(path), data)
        self._enact_dav_request(req)

    def delete_file(self, path):
        req = DavRequest("DELETE", self._get_user_url(path))
        self._enact_dav_request(req)

    def share_with_users(self, path, users):
        url = "https://%s/api/share/" % (self.server)
        cmd = {"version" : 1,
               "directory" : path,
               "share_to_users" : users}
        postdata = urllib.urlencode({"cmd" : json.write(cmd)})
        req = urllib2.Request(url, postdata)
        result = self.__opener.open(req).read()
        if result != "OK":
            raise Exception("Share attempt failed: %s" % result)

def ensure_weave_disallows_php(session):
    print "Ensuring that weave disallows PHP upload and execution."
    session.put_file("phptest.php", "<?php echo 'hai2u!' ?>")
    try:
        if session.get_file("phptest.php") == "hai2u!":
            raise Exception("Weave server allows PHP execution!")
    finally:
        session.delete_file("phptest.php")

if __name__ == "__main__":
    args = sys.argv[1:]
    if len(args) < 4:
        print ("usage: %s <username-1> <password-1> "
               "<username-2> <password-2>" % sys.argv[0])
        sys.exit(1)

    username_1 = args[0]
    password_1 = args[1]
    username_2 = args[2]
    password_2 = args[3]
    session_1 = WeaveSession(username_1, password_1)
    session_2 = WeaveSession(username_2, password_2)

    print "Creating directory."
    session_1.create_dir("blargle")

    try:
        print "Creating temporary file."
        session_1.put_file("blargle/bloop", "hai2u!")
        try:
            assert session_1.get_file("blargle/bloop") == "hai2u!"
            session_1.share_with_users("blargle", [])
            try:
                print "Ensuring user 2 can't read user 1's file."
                session_2.get_file("blargle/bloop", username_1)
            except urllib2.HTTPError, e:
                if e.code != httplib.UNAUTHORIZED:
                    raise
            print "Sharing directory with user 2."
            session_1.share_with_users("blargle", [username_2])
            print "Ensuring user 2 can read user 1's file."
            assert session_2.get_file("blargle/bloop", username_1) == "hai2u!"
            print "Sharing directory with everyone."
            session_1.share_with_users("blargle", ["all"])
            print "Ensuring user 2 can read user 1's file."
            assert session_2.get_file("blargle/bloop", username_1) == "hai2u!"
        finally:
            session_1.delete_file("blargle/bloop")
    finally:
        print "Removing directory."
        session_1.remove_dir("blargle")

    ensure_weave_disallows_php(session_1)

    print "Test complete."
