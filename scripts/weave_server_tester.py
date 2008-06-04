"""
    Simple script to test Weave server support and ensure that it
    works properly.
"""

import sys
import sha
import urllib2
import httplib

class DavRequest(urllib2.Request):
    def __init__(self, method, *args, **kwargs):
        urllib2.Request.__init__(self, *args, **kwargs)
        self.__method = method

    def get_method(self):
        return self.__method

class WeaveSession(object):
    def __init__(self, username, password):
        self.username = username
        self.__password = password
        self._make_opener()

    def _make_opener(self):
        authHandler = urllib2.HTTPBasicAuthHandler()
        authHandler.add_password("services.mozilla.com - proxy",
                                 "services.mozilla.com",
                                 self.username,
                                 self.__password)
        self.__opener = urllib2.build_opener(authHandler)

    def _get_url(self, path):
        if path.startswith("/"):
            path = path[1:]
        hexuser = sha.sha(self.username).hexdigest()
        url = "https://services.mozilla.com/user/%s/%s" % (hexuser, path)
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
        req = DavRequest("MKCOL", self._get_url(path))
        self._enact_dav_request(req)

    def remove_dir(self, path):
        if not path[-1] == "/":
            path += "/"
        self.delete_file(path)

    def get_file(self, path):
        obj = self.__opener.open(self._get_url(path))
        return obj.read()

    def put_file(self, path, data):
        req = DavRequest("PUT", self._get_url(path), data)
        self._enact_dav_request(req)

    def delete_file(self, path):
        req = DavRequest("DELETE", self._get_url(path))
        self._enact_dav_request(req)

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

    print "Test complete."
