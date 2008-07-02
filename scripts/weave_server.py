"""
    Weave Development Server

    This is a simple reference implementation for a Weave server,
    which can also be used to test the Weave client against.
"""

from wsgiref.simple_server import make_server
import httplib

import json

DEFAULT_PORT = 8000

class HttpResponse(object):
    def __init__(self, code, content = "", content_type = "text/plain"):
        self.status = "%s %s" % (code, httplib.responses[code])
        self.headers = [("Content-type", content_type)]
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

class WeaveApp(object):
    """
    WSGI app for the Weave server.
    """

    def __init__(self):
        self.contents = {}

    def __get_files_in_dir(self, path):
        return [filename for filename in self.contents
                if filename.startswith(path)]

    # HTTP method handlers

    def _handle_MKCOL(self, path):
        return HttpResponse(httplib.OK)

    def _handle_PUT(self, path):
        self.contents[path] = self.request.contents
        return HttpResponse(httplib.OK)

    def _handle_POST(self, path):
        return HttpResponse(httplib.OK)

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

    def _handle_GET(self, path):
        if path in self.contents:
            return HttpResponse(httplib.OK, self.contents[path])
        else:
            return HttpResponse(httplib.NOT_FOUND)

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
            response = getattr(self, method)(environ["PATH_INFO"])
        else:
            response = HttpResponse(
                httplib.METHOD_NOT_ALLOWED,
                "Method %s is not yet implemented." % method
                )

        start_response(response.status, response.headers)
        return [response.content]

if __name__ == "__main__":
    print __import__("__main__").__doc__
    print "Serving on port %d." % DEFAULT_PORT
    httpd = make_server('', DEFAULT_PORT, WeaveApp())
    httpd.serve_forever()
