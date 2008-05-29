#
# ***** BEGIN LICENSE BLOCK *****
# Version: MPL 1.1/GPL 2.0/LGPL 2.1
#
# The contents of this file are subject to the Mozilla Public License Version
# 1.1 (the "License"); you may not use this file except in compliance with
# the License. You may obtain a copy of the License at
# http://www.mozilla.org/MPL/
#
# Software distributed under the License is distributed on an "AS IS" basis,
# WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
# for the specific language governing rights and limitations under the
# License.
#
# The Original Code is Weave code.
#
# The Initial Developer of the Original Code is
# Mozilla Corporation
# Portions created by the Initial Developer are Copyright (C) 2008
# the Initial Developer. All Rights Reserved.
#
# Contributor(s):
#   Dan Mills <thunder@mozilla.com> (original author)
#
# Alternatively, the contents of this file may be used under the terms of
# either the GNU General Public License Version 2 or later (the "GPL"), or
# the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
# in which case the provisions of the GPL or the LGPL are applicable instead
# of those above. If you wish to allow use of your version of this file only
# under the terms of either the GPL or the LGPL, and not to allow others to
# use your version of this file under the terms of the MPL, indicate your
# decision by deleting the provisions above and replace them with the notice
# and other provisions required by the GPL or the LGPL. If you do not delete
# the provisions above, a recipient may use your version of this file under
# the terms of any one of the MPL, the GPL or the LGPL.
#
# ***** END LICENSE BLOCK *****

# fixme: version or build id in the xpi name?
xpi_name := sync-`uname -s`.xpi
xpi_files := chrome/sync.jar defaults modules openssl platform \
             install.rdf chrome.manifest

sdkdir ?= ${MOZSDKDIR}
ifeq ($(sdkdir),)
  $(warning No 'sdkdir' variable given)
  $(warning It should point to the location of the Gecko SDK)
  $(warning For example: "make sdkdir=/foo/bar/baz")
  $(warning Or set the MOZSDKDIR environment variable to point to it)
  $(error )
endif

all: subst binary-xpcom test
.PHONY: subst binary-xpcom test

subst:
	./subst.sh

binary-xpcom: subst
	$(MAKE) -C src

test: subst binary-xpcom
	$(MAKE) -k -C tests/unit

# fixme: use explicit file list instead of glob
chrome/sync.jar:
	cd chrome; zip -9 -ur sync.jar *; cd ..

# fixme: add binary-xpcom req once we really start using it
# fixme2: require 'test' here?
xpi: subst binary-xpcom chrome/sync.jar $(xpi_files)
	zip -9 -ur $(xpi_name) $(xpi_files)