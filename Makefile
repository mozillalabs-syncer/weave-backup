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

sdkdir ?= ${MOZSDKDIR}
ifeq ($(sdkdir),)
  $(warning No 'sdkdir' variable given)
  $(warning It should point to the location of the Gecko SDK)
  $(warning For example: "make sdkdir=/foo/bar/baz")
  $(warning Or set the MOZSDKDIR environment variable to point to it)
  $(error)
endif

ifeq ($(release_build),)
  weave_version := 0.2.110
  xpi_type := "dev"
  update_url := https://people.mozilla.com/~cbeard/sync/dist/update-dev.rdf
else
  weave_version := 0.2.110
  xpi_type := "rel"
  update_url := 
endif

ifeq ($(update_url),)
  update_url_tag :=
else
  update_url_tag := <em:updateURL>$(update_url)</em:updateURL>
endif

buildid ?= ${WEAVE_BUILDID}
ifeq ($(buildid),)
  buildid:=$(shell build/gen-buildid.sh)
endif
ifeq ($(buildid),)
  $(warning Could not determine build id)
  $(warning Install hg or set WEAVE_BUILDID the checkout id)
  $(error)
endif

ifeq ($(MAKECMDGOALS),xpi)
  unpacked =\# 
  jar=
else
  unpacked=
  jar=\# 
endif

subst_names := weave_version buildid update_url update_url_tag unpacked jar
substitutions := $(foreach s,$(subst_names),'$(s)=$($(s))')

dotin_files := $(shell find . -type f -name \*.in)
dotin_files := $(dotin_files:.in=)

all: test

.PHONY: build test xpi clean $(dotin_files)

$(dotin_files): $(dotin_files:=.in)
	./build/subst.pl $@ $(substitutions)

build: $(dotin_files)
	$(MAKE) -C src install

test: build
	python scripts/makeloadertests.py
	$(MAKE) -C src test-install
	$(MAKE) -k -C tests/unit

xpi_name := weave-$(weave_version)-$(xpi_type).xpi
xpi_files := chrome/sync.jar defaults components modules platform \
             install.rdf chrome.manifest
chrome_files := chrome/content/* chrome/skin/* chrome/locale/*

# fixme: use explicit file list instead of glob?
chrome/sync.jar: $(chrome_files)
	cd chrome; zip -9 -ur sync.jar *; cd ..

xpi: build chrome/sync.jar $(xpi_files)
	zip -9 -ur $(xpi_name) $(xpi_files)

clean:
	$(MAKE) -C src clean
	rm -f $(dotin_files) $(xpi_name)

help:
	@echo Targets:
	@echo build
	@echo "test (default; implies build)"
	@echo "xpi (sets manifest to use jars, make build to undo)"
	@echo clean
	@echo
	@echo Variables:
	@echo sdkdir
	@echo "release_build (set to 1 when not building a snapshot)"
	@echo
	@echo Substitutions for .in files:
	@echo $(subst_names)