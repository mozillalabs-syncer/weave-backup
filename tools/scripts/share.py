"""
    Usage: python share.py <root-dir> <owner> <cmd-json>

    This utility can be used in conjunction with an Apache-based
    WebDAV server to create .htaccess files with readability
    permissions that are set by a privileged remote client.

    <root-dir> is the local root directory where per-user
    directories are kept.

    <owner> is the name of the user who is sharing a
    directory.  Their user directory is assumed to be in
    <root-dir>/<owner>.

    <cmd-json> is JSON that contains information about the
    share.  It must have the following keys:

        version: This must be 1.

        directory: This is the directory to be shared, relative to
                   the owner's user directory.

        share_to_users: This is a list of the users who should be
                        given access to read the directory.  If it is
                        a list with "all" as its only element, then
                        the directory is readable by anyone.

    If successful, the script displays nothing and exits with a
    return code of 0.  Otherwise, it displays an error and exits
    with a nonzero return code.
"""

import os
import sys
import json

def make_read_share_htaccess(owner, users):
    if users == ["all"]:
        read_require_perms = "valid-user"
    else:
        users = set(users + [owner])
        users = list(users)
        users.sort()
        read_require_perms = "user %s" % " ".join(users)
    lines = [
        "Options +Indexes",
        "<Limit GET PROPFIND>",
        "Require %s" % read_require_perms,
        "</Limit>",
        "<LimitExcept GET PROPFIND>",
        "Require user %s" % owner,
        "</LimitExcept>",
        ""
        ]
    return "\n".join(lines)

def write_htaccess(root_dir, owner, cmd, file_open = open):
    htaccess = make_read_share_htaccess(owner,
                                        cmd["share_to_users"])
    user_root_dir = os.path.join(root_dir, owner)
    path = os.path.join(user_root_dir, cmd["directory"], ".htaccess")
    path = os.path.normpath(path)
    if not path.startswith(user_root_dir):
        raise Exception("Path doesn't start with user root dir: %s" % path)
    file_open(path, "w").write(htaccess)

def write_htaccess_from_json(root_dir, owner, cmd_json,
                             write_htaccess = write_htaccess):
    write_htaccess(root_dir, owner, json.read(cmd_json))

if __name__ == "__main__":
    args = sys.argv[1:]
    if len(args) < 3:
        __main__ = __import__("__main__")
        print __main__.__doc__
        sys.exit(1)
    root_dir, owner, cmd_json = args
    write_htaccess_from_json(root_dir, owner, cmd_json)
