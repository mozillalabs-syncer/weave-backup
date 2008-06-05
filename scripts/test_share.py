import unittest

from share import *

class Tests(unittest.TestCase):
    def test_write_htaccess_works(self, root_dir = None, owner = None,
                                  cmd = None):
        if not root_dir:
            root_dir = "/home/foo/blarg"
            owner = "johndoe"
            cmd = {"version" : 1,
                   "directory" : "public",
                   "share_to_users" : ["all"]}

        def mock_open(path, flag):
            assert flag == "w"
            assert path == "/home/foo/blarg/johndoe/public/.htaccess"
            class MockFile:
                def write(self, data):
                    assert "Require valid-user\n" in data
                    assert "Require user johndoe\n" in data
            return MockFile()

        write_htaccess(root_dir, owner, cmd, file_open = mock_open)

    def test_write_htaccess_from_json_works(self):
        write_htaccess_from_json(
            "/home/foo/blarg",
            "johndoe",
            '{"version": 1,"directory":"public","share_to_users":["all"]}',
            write_htaccess = self.test_write_htaccess_works
            )

    def test_write_htaccess_stops_evil_dirs(self):
        cmd = {"version" : 1,
               "directory" : "../valuable-stuff",
               "share_to_users" : ["all"]}
        try:
            write_htaccess("/Users", "johndoe", cmd)
        except Exception, e:
            assert "Path doesn't start with user root dir" in str(e)
            return
        assert "Exception not thrown"

if __name__ == "__main__":
    unittest.main()
