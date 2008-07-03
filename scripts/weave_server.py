"""
    Weave Development Server

    This is a simple reference implementation for a Weave server,
    which can also be used to test the Weave client against.
"""

from wsgiref.simple_server import make_server
import httplib
import base64
import logging

DEFAULT_PORT = 8000
DEFAULT_REALM = "services.mozilla.com - proxy"

class HttpResponse(object):
    def __init__(self, code, content = "", content_type = "text/plain"):
        self.status = "%s %s" % (code, httplib.responses.get(code, ""))
        self.headers = [("Content-type", content_type)]
        if code == httplib.UNAUTHORIZED:
            self.headers +=  [("WWW-Authenticate",
                               "Basic realm=\"%s\"" % DEFAULT_REALM)]
        if not content:
            content = self.status
        self.content = content

class HttpRequest(object):
    def __init__(self, environ):
        self.environ = environ
        content_length = environ.get("CONTENT_LENGTH")
        if content_length:
            stream = environ["wsgi.input"]
            self.contents = stream.read(int(content_length))
        else:
            self.contents = ""

class Perms(object):
    # Special identifier to indicate 'everyone' instead of a
    # particular user.
    EVERYONE = 0

    def __init__(self, readers=None, writers=None):
        if not readers:
            readers = []
        if not writers:
            writers = []

        self.readers = readers
        self.writers = writers

    def __is_privileged(self, user, access_list):
        return (user in access_list or self.EVERYONE in access_list)

    def can_read(self, user):
        return self.__is_privileged(user, self.readers)

    def can_write(self, user):
        return self.__is_privileged(user, self.writers)

def requires_read_access(function):
    function._requires_read_access = True
    return function

def requires_write_access(function):
    function._requires_write_access = True
    return function

class WeaveApp(object):
    """
    WSGI app for the Weave server.
    """

    def __init__(self):
        self.contents = {}
        self.dir_perms = {"/" : Perms(readers=[Perms.EVERYONE])}
        self.passwords = {}
        self.email = {}
        self.locks = {}
        self._tokenIds = 0

    def add_user(self, username, password, email = "nobody@example.com"):
        home_dir = "/user/%s/" % username
        public_dir = home_dir + "public/"
        self.dir_perms[home_dir] = Perms(readers=[username],
                                         writers=[username])
        self.dir_perms[public_dir] = Perms(readers=[Perms.EVERYONE],
                                           writers=[username])
        self.passwords[username] = password
        self.email[username] = email

    def __get_perms_for_path(self, path):
        possible_perms = [dirname for dirname in self.dir_perms
                          if path.startswith(dirname)]
        possible_perms.sort(key = len)
        perms = possible_perms[-1]
        return self.dir_perms[perms]

    def __get_files_in_dir(self, path):
        return [filename for filename in self.contents
                if filename.startswith(path)]

    def __api_share(self, path):
        import cgi
        params = cgi.parse_qs(self.request.contents)
        user = params["uid"][0]
        password = params["password"][0]
        if self.passwords.get(user) != password:
            return HttpResponse(httplib.UNAUTHORIZED)
        else:
            import json
            cmd = json.read(params["cmd"][0])
            dirname = "/user/%s/%s" % (user, cmd["directory"])
            if not dirname.endswith("/"):
                dirname += "/"
            readers = []
            for reader in cmd["share_to_users"]:
                if reader == "all":
                    readers.append(Perms.EVERYONE)
                else:
                    readers.append(reader)
            if user not in readers:
                readers.append(user)
            self.dir_perms[dirname] = Perms(readers = readers,
                                            writers = [user])
            return HttpResponse(httplib.OK, "OK")
    
    # Registration API
    def __api_register_check(self, what, where):
        what = what.strip("/")
        if what.strip() == "":
            return HttpResponse(400, "-1")
            
        if what in where:
            return HttpResponse(httplib.OK, "0")
        else:
            return HttpResponse(httplib.OK, "1")


    # HTTP method handlers

    @requires_write_access
    def _handle_LOCK(self, path):
        if path in self.locks:
            return HttpResponse(httplib.LOCKED)
        token = "opaquelocktoken:%d" % self._tokenIds
        self._tokenIds += 1
        self.locks[path] = token
        response = """<?xml version="1.0" encoding="utf-8"?>
                   <D:prop xmlns:D="DAV:">
                     <D:lockdiscovery>
                       <D:activelock>
                         <D:locktoken>
                           <D:href>%s</D:href>
                         </D:locktoken>
                       </D:activelock>
                     </D:lockdiscovery>
                   </D:prop>""" % token
        return HttpResponse(httplib.OK, response, content_type="text/xml")

    @requires_write_access
    def _handle_UNLOCK(self, path):
        token = self.request.environ["HTTP_LOCK_TOKEN"]
        if path not in self.locks:
            return HttpResponse(httplib.BAD_REQUEST)
        if token == "<%s>" % self.locks[path]:
            del self.locks[path]
            return HttpResponse(httplib.NO_CONTENT)
        return HttpResponse(httplib.BAD_REQUEST)

    @requires_write_access
    def _handle_MKCOL(self, path):
        return HttpResponse(httplib.OK)

    @requires_write_access
    def _handle_PUT(self, path):
        self.contents[path] = self.request.contents
        return HttpResponse(httplib.OK)

    def _handle_POST(self, path):
        if path == "/api/share/":
            return self.__api_share(path)
        else:
            return HttpResponse(httplib.NOT_FOUND)

    @requires_write_access
    def _handle_PROPFIND(self, path):
        response = """<?xml version="1.0" encoding="utf-8"?>
                   <D:multistatus xmlns:D="DAV:" xmlns:ns0="DAV:">"""

        path_template = """<D:response>
                           <D:href>%(href)s</D:href>
                           <D:propstat>
                           <D:prop>
                           %(props)s
                           </D:prop>
                           <D:status>HTTP/1.1 200 OK</D:status>
                           </D:propstat>
                           </D:response>"""

        if path in self.locks:
            props = "<D:locktoken><D:href>%s</D:href></D:locktoken>" % (
                self.locks[path]
                )
        else:
            props = ""

        response += path_template % {"href": path,
                                     "props": props}

        if path.endswith("/"):
            for filename in self.__get_files_in_dir(path):
                response += path_template % {"href" : filename,
                                             "props" : ""}

        response += """</D:multistatus>"""
        return HttpResponse(httplib.MULTI_STATUS, response,
                            content_type="text/xml")

    @requires_write_access
    def _handle_DELETE(self, path):
        response = HttpResponse(httplib.OK)
        if path.endswith("/"):
            # Delete a directory.
            for filename in self.__get_files_in_dir(path):
                del self.contents[filename]
        else:
            # Delete a file.
            if path not in self.contents:
                response = HttpResponse(httplib.NOT_FOUND)
            else:
                del self.contents[path]
        return response

    @requires_read_access
    def _handle_GET(self, path):
        if path in self.contents:
            return HttpResponse(httplib.OK, self.contents[path])
        elif path.startswith("/api/register/check/"):
            return self.__api_register_check(path[20:], self.passwords)
        elif path.startswith("/api/register/chkmail/"):
            return self.__api_register_check(path[22:], self.email)
        elif path.endswith("/"):
            # TODO: Add directory listing.
            return HttpResponse(httplib.OK)
        else:
            return HttpResponse(httplib.NOT_FOUND)

    def __process_handler(self, handler):
        response = None
        auth = self.request.environ.get("HTTP_AUTHORIZATION")
        if auth:
            user, password = base64.b64decode(auth.split()[1]).split(":")
            if self.passwords.get(user) != password:
                response = HttpResponse(httplib.UNAUTHORIZED)
        else:
            user = Perms.EVERYONE

        if response is None:
            path = self.request.environ["PATH_INFO"]
            perms = self.__get_perms_for_path(path)
            checks = []
            if hasattr(handler, "_requires_read_access"):
                checks.append(perms.can_read)
            if hasattr(handler, "_requires_write_access"):
                checks.append(perms.can_write)
            for check in checks:
                if not check(user):
                    response = HttpResponse(httplib.UNAUTHORIZED)

        if response is None:
            response = handler(path)

        return response

    def __call__(self, environ, start_response):
        """
        Main WSGI application method.
        """

        self.request = HttpRequest(environ)
        method = "_handle_%s" % environ["REQUEST_METHOD"]

        # See if we have a method called 'handle_<method>', where
        # <method> is the name of the HTTP method to call.  If we do,
        # then call it.
        if hasattr(self, method):
            handler = getattr(self, method)
            response = self.__process_handler(handler)
        else:
            response = HttpResponse(
                httplib.METHOD_NOT_ALLOWED,
                "Method %s is not yet implemented." % method
                )

        start_response(response.status, response.headers)
        return [response.content]

if __name__ == "__main__":
    print __import__("__main__").__doc__
    logging.basicConfig(level=logging.DEBUG)
    logging.info("Serving on port %d." % DEFAULT_PORT)
    app = WeaveApp()
    httpd = make_server('', DEFAULT_PORT, app)
    httpd.serve_forever()
